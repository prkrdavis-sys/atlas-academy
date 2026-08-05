create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  avatar_color text not null default '',
  avatar_id text,
  profile_data jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_name_nonempty check (char_length(btrim(name)) > 0),
  constraint profiles_data_object check (jsonb_typeof(profile_data) = 'object')
);

create index profiles_user_id_idx on public.profiles (user_id);

alter table public.profiles enable row level security;

create policy "Users can view their own profiles"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own profiles"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own profiles"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own profiles"
  on public.profiles
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_profile_updated_at();
