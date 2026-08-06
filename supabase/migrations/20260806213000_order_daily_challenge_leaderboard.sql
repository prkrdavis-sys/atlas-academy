-- Keep equal accuracy/time results tied while returning rows in rank order.
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

revoke execute on function public.get_daily_challenge_leaderboard(date, uuid) from public, anon;
grant execute on function public.get_daily_challenge_leaderboard(date, uuid) to authenticated;
