-- Security definer entry points for the social layer. Clients never write to
-- the social tables directly: friend lookup has to stay opaque (so email
-- addresses cannot be enumerated) and match scoring has to be authoritative.

create trigger match_answers_set_updated_at
  before update on public.match_answers
  for each row
  execute function public.set_updated_at();

-- Clients anchor every countdown to database time so the two players agree on
-- deadlines regardless of local clock skew.
create function public.server_time()
returns timestamptz
language sql
stable
as $$
  select timezone('utc', now());
$$;

-- ---------------------------------------------------------------------------
-- Friend requests
-- ---------------------------------------------------------------------------

create function public.request_friendship(p_target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  existing public.friendships;
begin
  if actor is null or p_target_id is null or p_target_id = actor then
    return;
  end if;

  select * into existing
  from public.friendships f
  where least(f.requester_id, f.addressee_id) = least(actor, p_target_id)
    and greatest(f.requester_id, f.addressee_id) = greatest(actor, p_target_id);

  if existing.id is null then
    insert into public.friendships (requester_id, addressee_id, status)
    values (actor, p_target_id, 'pending');
    return;
  end if;

  if existing.status = 'accepted' then
    return;
  end if;

  -- Both sides reached out independently: treat it as a mutual accept.
  if existing.status = 'pending' and existing.addressee_id = actor then
    update public.friendships set status = 'accepted' where id = existing.id;
    return;
  end if;

  -- Re-opening a previously ignored request flips it to the new sender.
  if existing.status = 'ignored' then
    update public.friendships
    set status = 'pending', requester_id = actor, addressee_id = p_target_id
    where id = existing.id;
  end if;
end;
$$;

create function public.send_friend_request(target_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
begin
  select p.id into target_id
  from public.players p
  where lower(p.email) = lower(btrim(target_email));

  -- Silent when the address is not registered: the caller always sees the same
  -- result, so this cannot be used to probe which emails have accounts.
  if target_id is null then
    return;
  end if;

  perform public.request_friendship(target_id);
end;
$$;

create function public.send_friend_request_by_code(code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
begin
  select p.id into target_id
  from public.players p
  where p.friend_code = upper(btrim(code));

  if target_id is null then
    return;
  end if;

  perform public.request_friendship(target_id);
end;
$$;

create function public.respond_to_friend_request(request_id uuid, accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.friendships
  set status = case when accept then 'accepted'::public.friendship_status else 'ignored'::public.friendship_status end
  where id = request_id
    and addressee_id = auth.uid()
    and status = 'pending';
end;
$$;

create function public.remove_friend(friendship_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.friendships
  where id = friendship_id
    and auth.uid() in (requester_id, addressee_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Matches
-- ---------------------------------------------------------------------------

create function public.create_match(
  opponent_id uuid,
  settings jsonb,
  question_count int
)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  created public.matches;
begin
  if actor is null or opponent_id = actor then
    raise exception 'Invalid opponent';
  end if;

  if not exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and least(f.requester_id, f.addressee_id) = least(actor, opponent_id)
      and greatest(f.requester_id, f.addressee_id) = greatest(actor, opponent_id)
  ) then
    raise exception 'You can only challenge friends';
  end if;

  insert into public.matches (host_id, guest_id, settings, seed, question_count)
  values (
    actor,
    opponent_id,
    settings,
    floor(random() * 2147483000)::int,
    greatest(1, least(question_count, 100))
  )
  returning * into created;

  return created;
end;
$$;

create function public.respond_to_match_invite(p_match_id uuid, accept boolean)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.matches;
begin
  update public.matches m
  set
    status = case when accept then 'active'::public.match_status else 'declined'::public.match_status end,
    started_at = case when accept then timezone('utc', now()) else null end
  where m.id = p_match_id
    and m.guest_id = auth.uid()
    and m.status = 'invited'
  returning * into updated;

  if updated.id is null then
    -- Already answered (or answered on another device); hand back current state.
    select * into updated from public.matches where id = p_match_id and auth.uid() in (host_id, guest_id);
  end if;

  return updated;
end;
$$;

-- Shared answer snapshot for a single question, returned by every write so the
-- caller can resolve the question without an extra round trip.
create function public.match_question_state(p_match_id uuid, p_question_index int)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'server_time', timezone('utc', now()),
    'answers', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'player_id', a.player_id,
            'answer', a.answer,
            'is_correct', a.is_correct,
            'timed_out', a.timed_out,
            'answered_at', a.answered_at
          )
          order by a.answered_at
        )
        from public.match_answers a
        where a.match_id = p_match_id and a.question_index = p_question_index
      ),
      '[]'::jsonb
    )
  );
$$;

create function public.submit_match_answer(
  p_match_id uuid,
  p_question_index int,
  p_answer text,
  p_is_correct boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  match_row public.matches;
  opponent_answered boolean;
begin
  select * into match_row from public.matches where id = p_match_id;

  if match_row.id is null or actor not in (match_row.host_id, match_row.guest_id) then
    raise exception 'Match not found';
  end if;

  if match_row.status <> 'active' then
    return public.match_question_state(p_match_id, p_question_index);
  end if;

  select exists (
    select 1 from public.match_answers a
    where a.match_id = p_match_id
      and a.question_index = p_question_index
      and a.player_id <> actor
  ) into opponent_answered;

  -- Selections stay changeable only while the opponent is still deciding.
  if opponent_answered then
    insert into public.match_answers (match_id, question_index, player_id, answer, is_correct)
    values (p_match_id, p_question_index, actor, p_answer, coalesce(p_is_correct, false))
    on conflict (match_id, question_index, player_id) do nothing;
  else
    insert into public.match_answers (match_id, question_index, player_id, answer, is_correct)
    values (p_match_id, p_question_index, actor, p_answer, coalesce(p_is_correct, false))
    on conflict (match_id, question_index, player_id) do update
      set answer = excluded.answer,
          is_correct = excluded.is_correct,
          timed_out = false;
  end if;

  return public.match_question_state(p_match_id, p_question_index);
end;
$$;

create function public.time_out_match_answer(
  p_match_id uuid,
  p_question_index int,
  p_player_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  match_row public.matches;
begin
  select * into match_row from public.matches where id = p_match_id;

  if match_row.id is null or actor not in (match_row.host_id, match_row.guest_id) then
    raise exception 'Match not found';
  end if;

  if p_player_id not in (match_row.host_id, match_row.guest_id) then
    raise exception 'Player is not in this match';
  end if;

  -- Idempotent: whichever client's countdown fires first wins the race and the
  -- other call is a no-op.
  insert into public.match_answers (match_id, question_index, player_id, answer, is_correct, timed_out)
  values (p_match_id, p_question_index, p_player_id, null, false, true)
  on conflict (match_id, question_index, player_id) do nothing;

  return public.match_question_state(p_match_id, p_question_index);
end;
$$;

create function public.finalize_match(p_match_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  match_row public.matches;
  host_correct int;
  guest_correct int;
begin
  select * into match_row from public.matches where id = p_match_id;

  if match_row.id is null or actor not in (match_row.host_id, match_row.guest_id) then
    raise exception 'Match not found';
  end if;

  if match_row.status <> 'active' then
    return match_row;
  end if;

  select
    count(*) filter (where a.player_id = match_row.host_id and a.is_correct)::int,
    count(*) filter (where a.player_id = match_row.guest_id and a.is_correct)::int
  into host_correct, guest_correct
  from public.match_answers a
  where a.match_id = p_match_id;

  update public.matches m
  set status = 'complete',
      host_score = host_correct,
      guest_score = guest_correct,
      winner_id = case
        when host_correct > guest_correct then m.host_id
        when guest_correct > host_correct then m.guest_id
        else null
      end,
      ended_at = timezone('utc', now())
  where m.id = p_match_id
  returning * into match_row;

  return match_row;
end;
$$;

create function public.forfeit_match(p_match_id uuid, p_forfeiting_player_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  match_row public.matches;
  host_correct int;
  guest_correct int;
begin
  select * into match_row from public.matches where id = p_match_id;

  if match_row.id is null or actor not in (match_row.host_id, match_row.guest_id) then
    raise exception 'Match not found';
  end if;

  if p_forfeiting_player_id not in (match_row.host_id, match_row.guest_id) then
    raise exception 'Player is not in this match';
  end if;

  if match_row.status not in ('invited', 'active') then
    return match_row;
  end if;

  select
    count(*) filter (where a.player_id = match_row.host_id and a.is_correct)::int,
    count(*) filter (where a.player_id = match_row.guest_id and a.is_correct)::int
  into host_correct, guest_correct
  from public.match_answers a
  where a.match_id = p_match_id;

  update public.matches m
  set status = 'abandoned',
      host_score = host_correct,
      guest_score = guest_correct,
      winner_id = case
        when p_forfeiting_player_id = m.host_id then m.guest_id
        else m.host_id
      end,
      ended_at = timezone('utc', now())
  where m.id = p_match_id
  returning * into match_row;

  return match_row;
end;
$$;

-- Forfeits count toward the head-to-head record, so widen the tally beyond
-- matches that were played all the way through.
create or replace function public.get_head_to_head_records()
returns table (opponent_id uuid, wins int, losses int, draws int, played int)
language sql
stable
security invoker
set search_path = public
as $$
  select
    case when m.host_id = (select auth.uid()) then m.guest_id else m.host_id end as opponent_id,
    count(*) filter (where m.winner_id = (select auth.uid()))::int as wins,
    count(*) filter (where m.winner_id is not null and m.winner_id <> (select auth.uid()))::int as losses,
    count(*) filter (where m.winner_id is null)::int as draws,
    count(*)::int as played
  from public.matches m
  where m.status in ('complete', 'abandoned')
    and (select auth.uid()) in (m.host_id, m.guest_id)
  group by 1;
$$;
