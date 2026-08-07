-- Short-lived shareable invitations. The signed token is kept outside the
-- database; only its SHA-256 digest is stored here.
create table public.friend_invites (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint friend_invites_token_hash_nonempty check (char_length(token_hash) = 64),
  constraint friend_invites_expiry_after_creation check (expires_at > created_at)
);

create index friend_invites_expiry_idx on public.friend_invites (expires_at);
create index friend_invites_inviter_idx on public.friend_invites (inviter_id, created_at desc);

create table public.friend_invite_redemptions (
  invite_id uuid not null references public.friend_invites(id) on delete cascade,
  redeemer_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (invite_id, redeemer_id)
);

alter table public.friend_invites enable row level security;
alter table public.friend_invite_redemptions enable row level security;

-- Invites are created and redeemed through the security-definer RPCs below.
-- No invite token or redemption history is readable through the Data API.
revoke all on public.friend_invites from public, anon, authenticated;
revoke all on public.friend_invite_redemptions from public, anon, authenticated;

create function public.create_friend_invite(
  p_token_hash text,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  invite_id uuid;
begin
  if actor is null then
    return null;
  end if;

  if p_token_hash is null
    or char_length(p_token_hash) <> 64
    or p_expires_at <= timezone('utc', now())
    or p_expires_at > timezone('utc', now()) + interval '1 day' + interval '1 minute' then
    raise exception 'Invalid friend invite';
  end if;

  insert into public.friend_invites (inviter_id, token_hash, expires_at)
  values (actor, lower(p_token_hash), p_expires_at)
  returning id into invite_id;

  return invite_id;
end;
$$;

create function public.redeem_friend_invite(p_token_hash text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  invite public.friend_invites;
  existing public.friendships;
begin
  if actor is null then
    return 'unauthenticated';
  end if;

  select *
  into invite
  from public.friend_invites
  where token_hash = lower(btrim(p_token_hash))
  for update;

  if invite.id is null then
    return 'invalid';
  end if;

  if invite.expires_at <= timezone('utc', now()) then
    return 'expired';
  end if;

  if invite.inviter_id = actor then
    return 'self';
  end if;

  select *
  into existing
  from public.friendships
  where least(requester_id, addressee_id) = least(actor, invite.inviter_id)
    and greatest(requester_id, addressee_id) = greatest(actor, invite.inviter_id);

  if existing.status = 'accepted' then
    return 'already_friends';
  end if;

  insert into public.friend_invite_redemptions (invite_id, redeemer_id)
  values (invite.id, actor)
  on conflict (invite_id, redeemer_id) do nothing;

  perform public.request_friendship(invite.inviter_id);

  select *
  into existing
  from public.friendships
  where least(requester_id, addressee_id) = least(actor, invite.inviter_id)
    and greatest(requester_id, addressee_id) = greatest(actor, invite.inviter_id);

  if existing.status = 'accepted' then
    return 'accepted';
  end if;

  if existing.requester_id = actor then
    return 'sent';
  end if;

  return 'accepted';
end;
$$;

revoke all on function public.create_friend_invite(text, timestamptz) from public, anon, authenticated;
revoke all on function public.redeem_friend_invite(text) from public, anon, authenticated;
grant execute on function public.create_friend_invite(text, timestamptz) to authenticated;
grant execute on function public.redeem_friend_invite(text) to authenticated;
