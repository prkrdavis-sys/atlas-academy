-- Make daily challenge score submission resilient and let every signed-in player
-- who owns a profile read the full global board for a date (UI still gates on
-- local completion). Also backfill any scores already stored in profile_data.

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

  -- Canonical snapshot is first-writer-wins. Later clients may submit scores even
  -- when their local seed/content_version drifted; ranking uses their score only.
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
    from public.profiles own_profile
    where own_profile.id = p_profile_id
      and own_profile.user_id = (select auth.uid())
      and p_challenge_date <= ((now() at time zone 'America/New_York')::date)
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

-- Snapshot archive stays completion-gated so unanswered questions stay hidden
-- until this profile has a submitted result for the date.
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
    and (
      exists (
        select 1
        from public.daily_challenge_results r
        join public.profiles p on p.id = r.profile_id
        where r.challenge_date = s.challenge_date
          and r.profile_id = p_profile_id
          and p.user_id = (select auth.uid())
      )
      or exists (
        select 1
        from public.profiles p
        where p.id = p_profile_id
          and p.user_id = (select auth.uid())
          and coalesce(p.profile_data -> 'dailyChallengeCompletions', '[]'::jsonb)
            @> to_jsonb(ARRAY[p_challenge_date::text])
      )
    );
$$;

revoke execute on function public.submit_daily_challenge_result(uuid, date, integer, text, jsonb, integer, integer, integer, integer) from public, anon;
revoke execute on function public.get_daily_challenge_snapshot(date, uuid) from public, anon;
revoke execute on function public.get_daily_challenge_leaderboard(date, uuid) from public, anon;
grant execute on function public.submit_daily_challenge_result(uuid, date, integer, text, jsonb, integer, integer, integer, integer) to authenticated;
grant execute on function public.get_daily_challenge_snapshot(date, uuid) to authenticated;
grant execute on function public.get_daily_challenge_leaderboard(date, uuid) to authenticated;

-- Backfill leaderboard rows from profile_data results that never reached the table.
with extracted as (
  select
    p.id as profile_id,
    p.name as display_name,
    p.avatar_id,
    p.avatar_color,
    key as challenge_date_text,
    value as result_json
  from public.profiles p
  cross join lateral jsonb_each(coalesce(p.profile_data -> 'dailyChallengeResults', '{}'::jsonb)) as entries(key, value)
),
normalized as (
  select
    profile_id,
    display_name,
    avatar_id,
    avatar_color,
    challenge_date_text::date as challenge_date,
    coalesce((result_json ->> 'questionCount')::integer, 10) as question_count,
    (result_json ->> 'correctAnswers')::integer as correct_count,
    coalesce((result_json ->> 'skippedAnswers')::integer, 0) as skipped_count,
    (result_json ->> 'elapsedCentiseconds')::integer as elapsed_centiseconds,
    coalesce(
      (result_json ->> 'completedAt')::timestamptz,
      timezone('utc', now())
    ) as completed_at,
    result_json -> 'questions' as question_specs,
    coalesce(result_json ->> 'contentVersion', '2026-08-06') as content_version,
    (
      (split_part(challenge_date_text, '-', 1)::integer * 10000)
      + (split_part(challenge_date_text, '-', 2)::integer * 100)
      + split_part(challenge_date_text, '-', 3)::integer
    ) as seed
  from extracted
  where challenge_date_text ~ '^\d{4}-\d{2}-\d{2}$'
    and (result_json ->> 'correctAnswers') ~ '^\d+$'
    and (result_json ->> 'elapsedCentiseconds') ~ '^\d+$'
)
insert into public.daily_challenge_snapshots (
  challenge_date,
  content_version,
  seed,
  question_count,
  question_specs
)
select
  n.challenge_date,
  n.content_version,
  n.seed,
  10,
  n.question_specs
from normalized n
where jsonb_typeof(n.question_specs) = 'array'
  and jsonb_array_length(n.question_specs) = 10
on conflict (challenge_date) do nothing;

with extracted as (
  select
    p.id as profile_id,
    p.name as display_name,
    p.avatar_id,
    p.avatar_color,
    key as challenge_date_text,
    value as result_json
  from public.profiles p
  cross join lateral jsonb_each(coalesce(p.profile_data -> 'dailyChallengeResults', '{}'::jsonb)) as entries(key, value)
),
normalized as (
  select
    profile_id,
    display_name,
    avatar_id,
    avatar_color,
    challenge_date_text::date as challenge_date,
    coalesce((result_json ->> 'questionCount')::integer, 10) as question_count,
    (result_json ->> 'correctAnswers')::integer as correct_count,
    coalesce((result_json ->> 'skippedAnswers')::integer, 0) as skipped_count,
    (result_json ->> 'elapsedCentiseconds')::integer as elapsed_centiseconds,
    coalesce(
      (result_json ->> 'completedAt')::timestamptz,
      timezone('utc', now())
    ) as completed_at
  from extracted
  where challenge_date_text ~ '^\d{4}-\d{2}-\d{2}$'
    and (result_json ->> 'correctAnswers') ~ '^\d+$'
    and (result_json ->> 'elapsedCentiseconds') ~ '^\d+$'
)
insert into public.daily_challenge_results (
  challenge_date,
  profile_id,
  display_name,
  avatar_id,
  avatar_color,
  question_count,
  correct_count,
  skipped_count,
  elapsed_centiseconds,
  completed_at
)
select
  n.challenge_date,
  n.profile_id,
  n.display_name,
  n.avatar_id,
  n.avatar_color,
  least(greatest(n.question_count, 0), 10)::smallint,
  least(greatest(n.correct_count, 0), 10)::smallint,
  least(greatest(n.skipped_count, 0), 10)::smallint,
  greatest(n.elapsed_centiseconds, 0),
  n.completed_at
from normalized n
join public.daily_challenge_snapshots s on s.challenge_date = n.challenge_date
where n.correct_count between 0 and 10
  and n.skipped_count between 0 and 10
  and n.correct_count + n.skipped_count <= 10
on conflict (challenge_date, profile_id) do nothing;
