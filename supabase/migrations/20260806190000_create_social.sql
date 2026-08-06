-- Social layer: public player directory, friendships, and head-to-head matches.
-- Player progress stays in localStorage + public.profiles; these tables only
-- hold what has to be shared between two accounts.

create type public.friendship_status as enum ('pending', 'accepted', 'ignored');
create type public.match_status as enum ('invited', 'active', 'complete', 'declined', 'abandoned');

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- players: one public-facing row per account, mirroring the active profile.
-- ---------------------------------------------------------------------------

create table public.players (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  friend_code text not null unique,
  display_name text not null default 'Explorer',
  avatar_id text,
  avatar_color text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint players_display_name_nonempty check (char_length(btrim(display_name)) > 0)
);

create unique index players_email_lower_idx on public.players (lower(email));

create trigger players_set_updated_at
  before update on public.players
  for each row
  execute function public.set_updated_at();

-- Ambiguous glyphs (0/O, 1/I/L) are excluded so codes can be read aloud.
create function public.generate_friend_code()
returns text
language plpgsql
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  candidate text;
  position int;
begin
  loop
    candidate := '';
    for position in 1..8 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.players p where p.friend_code = candidate);
  end loop;
  return candidate;
end;
$$;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.players (id, email, friend_code, display_name)
  values (
    new.id,
    new.email,
    public.generate_friend_code(),
    coalesce(nullif(btrim(split_part(new.email, '@', 1)), ''), 'Explorer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Backfill accounts that existed before this migration.
insert into public.players (id, email, friend_code, display_name)
select
  u.id,
  u.email,
  public.generate_friend_code(),
  coalesce(nullif(btrim(split_part(u.email, '@', 1)), ''), 'Explorer')
from auth.users u
where u.email is not null
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- friendships
-- ---------------------------------------------------------------------------

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status public.friendship_status not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint friendships_no_self check (requester_id <> addressee_id)
);

-- One relationship per unordered pair, whichever direction it was created in.
create unique index friendships_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_addressee_idx on public.friendships (addressee_id, status);
create index friendships_requester_idx on public.friendships (requester_id, status);

create trigger friendships_set_updated_at
  before update on public.friendships
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- matches + answers
-- ---------------------------------------------------------------------------

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  guest_id uuid not null references auth.users(id) on delete cascade,
  status public.match_status not null default 'invited',
  settings jsonb not null,
  seed integer not null,
  question_count integer not null,
  host_score integer not null default 0,
  guest_score integer not null default 0,
  winner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  started_at timestamptz,
  ended_at timestamptz,
  constraint matches_no_self check (host_id <> guest_id),
  constraint matches_settings_object check (jsonb_typeof(settings) = 'object'),
  constraint matches_question_count_positive check (question_count > 0)
);

create index matches_guest_idx on public.matches (guest_id, status);
create index matches_host_idx on public.matches (host_id, status);

create table public.match_answers (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  question_index integer not null,
  player_id uuid not null references auth.users(id) on delete cascade,
  answer text,
  is_correct boolean not null default false,
  timed_out boolean not null default false,
  answered_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (match_id, question_index, player_id)
);

create index match_answers_match_idx on public.match_answers (match_id, question_index);

-- ---------------------------------------------------------------------------
-- Row level security. All writes go through security definer RPCs, so these
-- policies only need to cover reads (which Realtime Postgres Changes uses).
-- ---------------------------------------------------------------------------

alter table public.players enable row level security;
alter table public.friendships enable row level security;
alter table public.matches enable row level security;
alter table public.match_answers enable row level security;

-- A player row is only visible once a relationship exists, so the directory
-- cannot be enumerated. Pending is included so the inbox can show who asked.
create policy "Players are visible to self and connections"
  on public.players
  for select
  to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1
      from public.friendships f
      where f.status in ('pending', 'accepted')
        and (
          (f.requester_id = (select auth.uid()) and f.addressee_id = public.players.id)
          or (f.addressee_id = (select auth.uid()) and f.requester_id = public.players.id)
        )
    )
  );

create policy "Players can update their own row"
  on public.players
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Friendships are visible to both parties"
  on public.friendships
  for select
  to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

create policy "Matches are visible to both players"
  on public.matches
  for select
  to authenticated
  using ((select auth.uid()) in (host_id, guest_id));

create policy "Match answers are visible to both players"
  on public.match_answers
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.matches m
      where m.id = public.match_answers.match_id
        and (select auth.uid()) in (m.host_id, m.guest_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

alter table public.friendships replica identity full;
alter table public.matches replica identity full;

alter publication supabase_realtime add table public.friendships;
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.match_answers;

-- Private broadcast/presence channels: 'lobby' for global presence, and
-- 'match:<uuid>' scoped to the two players in that match.
create policy "Authenticated users can read social channels"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.topic() = 'lobby'
    or (
      realtime.topic() like 'match:%'
      and exists (
        select 1
        from public.matches m
        where m.id::text = split_part(realtime.topic(), ':', 2)
          and (select auth.uid()) in (m.host_id, m.guest_id)
      )
    )
  );

create policy "Authenticated users can write social channels"
  on realtime.messages
  for insert
  to authenticated
  with check (
    realtime.topic() = 'lobby'
    or (
      realtime.topic() like 'match:%'
      and exists (
        select 1
        from public.matches m
        where m.id::text = split_part(realtime.topic(), ':', 2)
          and (select auth.uid()) in (m.host_id, m.guest_id)
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Derived head-to-head record (solo stats stay untouched in localStorage).
-- ---------------------------------------------------------------------------

create function public.get_head_to_head_records()
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
  where m.status = 'complete'
    and (select auth.uid()) in (m.host_id, m.guest_id)
  group by 1;
$$;
