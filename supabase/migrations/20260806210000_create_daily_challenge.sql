-- Shared, date-keyed daily challenge snapshots and per-profile first results.
-- Gameplay remains client-generated today; the snapshot/result RPCs make the
-- archive and first-result rule consistent across authenticated clients.

create table public.daily_challenge_snapshots (
  challenge_date date primary key,
  content_version text not null,
  seed integer not null,
  question_count smallint not null default 10,
  question_specs jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint daily_snapshots_question_count check (question_count = 10),
  constraint daily_snapshots_question_specs_array check (
    jsonb_typeof(question_specs) = 'array'
    and jsonb_array_length(question_specs) = question_count
  )
);

create table public.daily_challenge_results (
  id uuid primary key default gen_random_uuid(),
  challenge_date date not null references public.daily_challenge_snapshots(challenge_date) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null,
  avatar_id text,
  avatar_color text not null default '',
  question_count smallint not null default 10,
  correct_count smallint not null,
  skipped_count smallint not null default 0,
  elapsed_centiseconds integer not null,
  completed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  unique (challenge_date, profile_id),
  constraint daily_results_question_count check (question_count = 10),
  constraint daily_results_correct_count check (correct_count between 0 and question_count),
  constraint daily_results_skipped_count check (skipped_count between 0 and question_count),
  constraint daily_results_answer_counts check (correct_count + skipped_count <= question_count),
  constraint daily_results_elapsed_nonnegative check (elapsed_centiseconds >= 0),
  constraint daily_results_display_name_nonempty check (char_length(btrim(display_name)) > 0)
);

create index daily_results_date_rank_idx
  on public.daily_challenge_results (challenge_date, correct_count desc, elapsed_centiseconds asc);

alter table public.daily_challenge_snapshots enable row level security;
alter table public.daily_challenge_results enable row level security;

-- All reads and writes go through the narrowly scoped functions below.
revoke all on table public.daily_challenge_snapshots from anon, authenticated;
revoke all on table public.daily_challenge_results from anon, authenticated;

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

create or replace function public.get_daily_challenge_snapshot(
  p_challenge_date date,
  p_profile_id uuid
)
returns table (
  challenge_date date,
  content_version text,
  seed integer,
  question_specs jsonb
)
language sql
security definer
set search_path = ''
as $$
  select
    s.challenge_date,
    s.content_version,
    s.seed,
    s.question_specs
  from public.daily_challenge_snapshots s
  where s.challenge_date = p_challenge_date
    and exists (
      select 1
      from public.daily_challenge_results r
      join public.profiles p on p.id = r.profile_id
      where r.challenge_date = s.challenge_date
        and r.profile_id = p_profile_id
        and p.user_id = (select auth.uid())
    );
$$;

create or replace function public.get_daily_challenge_leaderboard(
  p_challenge_date date,
  p_profile_id uuid
)
returns table (
  id uuid,
  challenge_date date,
  profile_id uuid,
  display_name text,
  avatar_id text,
  avatar_color text,
  question_count smallint,
  correct_count smallint,
  skipped_count smallint,
  elapsed_centiseconds integer,
  completed_at timestamptz,
  rank bigint
)
language sql
security definer
set search_path = ''
as $$
  with access_check as (
    select 1
    from public.daily_challenge_results own_result
    join public.profiles own_profile on own_profile.id = own_result.profile_id
    where own_result.challenge_date = p_challenge_date
      and own_result.profile_id = p_profile_id
      and own_profile.user_id = (select auth.uid())
  ),
  ranked as (
    select
      r.*,
      rank() over (
        order by r.correct_count desc, r.elapsed_centiseconds asc
      ) as result_rank
    from public.daily_challenge_results r
    where r.challenge_date = p_challenge_date
  )
  select
    r.id,
    r.challenge_date,
    r.profile_id,
    r.display_name,
    r.avatar_id,
    r.avatar_color,
    r.question_count,
    r.correct_count,
    r.skipped_count,
    r.elapsed_centiseconds,
    r.completed_at,
    r.result_rank
  from ranked r
  where exists (select 1 from access_check)
  order by r.result_rank, r.correct_count desc, r.elapsed_centiseconds asc, r.completed_at asc, r.id;
$$;

revoke execute on function public.submit_daily_challenge_result(uuid, date, integer, text, jsonb, integer, integer, integer, integer) from public, anon;
revoke execute on function public.get_daily_challenge_snapshot(date, uuid) from public, anon;
revoke execute on function public.get_daily_challenge_leaderboard(date, uuid) from public, anon;
grant execute on function public.submit_daily_challenge_result(uuid, date, integer, text, jsonb, integer, integer, integer, integer) to authenticated;
grant execute on function public.get_daily_challenge_snapshot(date, uuid) to authenticated;
grant execute on function public.get_daily_challenge_leaderboard(date, uuid) to authenticated;
