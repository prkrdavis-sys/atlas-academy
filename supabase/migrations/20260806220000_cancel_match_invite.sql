-- Hosts can withdraw an unanswered invite without recording a forfeit.
create function public.cancel_match_invite(p_match_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.matches;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.matches m
  set status = 'declined'::public.match_status
  where m.id = p_match_id
    and m.host_id = auth.uid()
    and m.status = 'invited'
  returning * into updated;

  if updated.id is null then
    select * into updated
    from public.matches
    where id = p_match_id
      and auth.uid() in (host_id, guest_id);
  end if;

  if updated.id is null then
    raise exception 'Match not found';
  end if;

  return updated;
end;
$$;

revoke execute on function public.cancel_match_invite(uuid) from public, anon;
grant execute on function public.cancel_match_invite(uuid) to authenticated;
