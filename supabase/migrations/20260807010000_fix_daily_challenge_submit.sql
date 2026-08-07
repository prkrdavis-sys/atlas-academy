-- Submissions were failing for many signed-in players because the RPC required
-- an exact jsonb match on the full question payload. First writer won the
-- snapshot; later clients with tiny serialization differences got rejected, so
-- their local completion unlocked the page but the global board stayed empty.
-- Accept matching seed + content version and keep the first snapshot as canonical.

create or replace function public.submit_daily_challenge_result(
  p_profile_id uuid,
  p_challenge_date date,
  p_seed integer,
  p_content_version text,
  p_question_specs jsonb,
  p_question_count integer,
  p_correct_count integer,
  p_skipped_count integer,
  p_elapsed_centiseconds integer
)
returns public.daily_challenge_results
language plpgsql
security definer
set search_path = ''
as $$
declare
  owned_profile public.profiles%rowtype;
  snapshot public.daily_challenge_snapshots%rowtype;
  existing_result public.daily_challenge_results%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  select *
  into owned_profile
  from public.profiles
  where id = p_profile_id
    and user_id = (select auth.uid());

  if not found then
    raise exception 'Profile does not belong to the current user';
  end if;

  if p_challenge_date > ((now() at time zone 'America/New_York')::date) then
    raise exception 'Future daily challenges cannot be submitted';
  end if;

  if p_question_count <> 10
    or p_correct_count < 0
    or p_correct_count > p_question_count
    or p_skipped_count < 0
    or p_skipped_count > p_question_count
    or p_correct_count + p_skipped_count > p_question_count
    or p_elapsed_centiseconds < 0
    or jsonb_typeof(p_question_specs) <> 'array'
    or jsonb_array_length(p_question_specs) <> p_question_count then
    raise exception 'Invalid daily challenge result';
  end if;

  select *
  into existing_result
  from public.daily_challenge_results
  where challenge_date = p_challenge_date
    and profile_id = p_profile_id;

  if found then
    return existing_result;
  end if;

  insert into public.daily_challenge_snapshots (
    challenge_date,
    content_version,
    seed,
    question_count,
    question_specs
  )
  values (
    p_challenge_date,
    p_content_version,
    p_seed,
    p_question_count::smallint,
    p_question_specs
  )
  on conflict (challenge_date) do nothing;

  select *
  into snapshot
  from public.daily_challenge_snapshots
  where challenge_date = p_challenge_date;

  if not found then
    raise exception 'Daily challenge snapshot is missing';
  end if;

  -- Canonical snapshot is first-writer-wins. Later clients only need the same
  -- date seed and content version so small question-json differences do not
  -- block leaderboard submission.
  if snapshot.seed <> p_seed or snapshot.content_version <> p_content_version then
    raise exception 'Daily challenge snapshot does not match this client';
  end if;

  insert into public.daily_challenge_results (
    challenge_date,
    profile_id,
    display_name,
    avatar_id,
    avatar_color,
    question_count,
    correct_count,
    skipped_count,
    elapsed_centiseconds
  )
  values (
    p_challenge_date,
    p_profile_id,
    owned_profile.name,
    owned_profile.avatar_id,
    owned_profile.avatar_color,
    p_question_count::smallint,
    p_correct_count::smallint,
    p_skipped_count::smallint,
    p_elapsed_centiseconds
  )
  on conflict (challenge_date, profile_id) do nothing;

  select *
  into existing_result
  from public.daily_challenge_results
  where challenge_date = p_challenge_date
    and profile_id = p_profile_id;

  return existing_result;
end;
$$;

revoke execute on function public.submit_daily_challenge_result(uuid, date, integer, text, jsonb, integer, integer, integer, integer) from public, anon;
grant execute on function public.submit_daily_challenge_result(uuid, date, integer, text, jsonb, integer, integer, integer, integer) to authenticated;
