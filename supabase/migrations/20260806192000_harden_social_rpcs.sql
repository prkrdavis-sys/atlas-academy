-- Postgres grants EXECUTE on new functions to PUBLIC by default, which exposes
-- every one of them at /rest/v1/rpc/*. Only the handful of entry points the
-- client actually calls should be reachable, and none of them by anon.

alter function public.server_time() set search_path = public;

-- Internal helpers and trigger functions: not part of the API surface.
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.generate_friend_code() from public, anon, authenticated;
revoke execute on function public.request_friendship(uuid) from public, anon, authenticated;
-- Bypasses RLS by design; clients read match_answers directly instead.
revoke execute on function public.match_question_state(uuid, int) from public, anon, authenticated;

-- Client entry points: signed-in users only. Each one re-checks auth.uid()
-- internally, so anon calls would be no-ops, but there is no reason to expose them.
revoke execute on function public.server_time() from public, anon;
revoke execute on function public.send_friend_request(text) from public, anon;
revoke execute on function public.send_friend_request_by_code(text) from public, anon;
revoke execute on function public.respond_to_friend_request(uuid, boolean) from public, anon;
revoke execute on function public.remove_friend(uuid) from public, anon;
revoke execute on function public.create_match(uuid, jsonb, int) from public, anon;
revoke execute on function public.respond_to_match_invite(uuid, boolean) from public, anon;
revoke execute on function public.submit_match_answer(uuid, int, text, boolean) from public, anon;
revoke execute on function public.time_out_match_answer(uuid, int, uuid) from public, anon;
revoke execute on function public.finalize_match(uuid) from public, anon;
revoke execute on function public.forfeit_match(uuid, uuid) from public, anon;
revoke execute on function public.get_head_to_head_records() from public, anon;

grant execute on function public.server_time() to authenticated;
grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.send_friend_request_by_code(text) to authenticated;
grant execute on function public.respond_to_friend_request(uuid, boolean) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.create_match(uuid, jsonb, int) to authenticated;
grant execute on function public.respond_to_match_invite(uuid, boolean) to authenticated;
grant execute on function public.submit_match_answer(uuid, int, text, boolean) to authenticated;
grant execute on function public.time_out_match_answer(uuid, int, uuid) to authenticated;
grant execute on function public.finalize_match(uuid) to authenticated;
grant execute on function public.forfeit_match(uuid, uuid) to authenticated;
grant execute on function public.get_head_to_head_records() to authenticated;
