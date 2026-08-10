-- Return only the stats-safe fields for an accepted friend.
-- The profiles table remains private; this function is the narrow sharing boundary.
create or replace function public.get_friend_stats(target_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'profile', jsonb_build_object(
      'id', profile_row.id,
      'name', profile_row.name,
      'avatarColor', profile_row.avatar_color,
      'avatarId', profile_row.avatar_id,
      'createdAt', profile_row.created_at,
      'globalStreaks', coalesce(profile_row.profile_data -> 'globalStreaks', '{}'::jsonb),
      'stats', coalesce(profile_row.profile_data -> 'stats', '{}'::jsonb),
      'achievements', coalesce(profile_row.profile_data -> 'achievements', '[]'::jsonb),
      'placeMapProgress', coalesce(profile_row.profile_data -> 'placeMapProgress', '{}'::jsonb),
      'activityByDate', coalesce(profile_row.profile_data -> 'activityByDate', '{}'::jsonb),
      'dailyChallengeCompletions',
        coalesce(profile_row.profile_data -> 'dailyChallengeCompletions', '[]'::jsonb)
    ),
    'player', jsonb_build_object(
      'display_name', target_player.display_name,
      'avatar_id', target_player.avatar_id,
      'avatar_color', target_player.avatar_color
    )
  )
  from public.players target_player
  cross join lateral (
    select p.*
    from public.profiles p
    where p.user_id = target_player.id
    order by
      (p.name = target_player.display_name
        and p.avatar_id is not distinct from target_player.avatar_id
        and p.avatar_color = target_player.avatar_color) desc,
      p.updated_at desc
    limit 1
  ) profile_row
  where target_player.id = target_id
    and (select auth.uid()) is not null
    and target_player.id <> (select auth.uid())
    and exists (
      select 1
      from public.friendships friendship
      where friendship.status = 'accepted'
        and (
          (friendship.requester_id = (select auth.uid())
            and friendship.addressee_id = target_player.id)
          or (friendship.addressee_id = (select auth.uid())
            and friendship.requester_id = target_player.id)
        )
    );
$$;

revoke execute on function public.get_friend_stats(uuid) from public, anon;
grant execute on function public.get_friend_stats(uuid) to authenticated;
