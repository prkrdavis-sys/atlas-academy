-- Playtester-only password reset with no email verification.
-- Intentionally insecure: anyone who knows an account email can set a new password.

create or replace function public.playtester_reset_password(
  p_email text,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  target_id uuid;
  normalized_email text := lower(trim(coalesce(p_email, '')));
begin
  if normalized_email = '' then
    return jsonb_build_object('ok', false, 'error', 'Email is required.');
  end if;

  if p_password is null or char_length(p_password) < 6 then
    return jsonb_build_object(
      'ok', false,
      'error', 'Password must be at least 6 characters.'
    );
  end if;

  select u.id into target_id
  from auth.users u
  where lower(u.email) = normalized_email
  limit 1;

  if target_id is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'No account found for that email.'
    );
  end if;

  update auth.users
  set
    encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
    updated_at = timezone('utc', now())
  where id = target_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.playtester_reset_password(text, text) from public;
grant execute on function public.playtester_reset_password(text, text)
  to anon, authenticated, service_role;

comment on function public.playtester_reset_password(text, text) is
  'Playtester-only: replace an account password by email with no verification.';
