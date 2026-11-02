-- Profielen: één rij per gebruiker, aangemaakt bij registratie.

create type public.theme_pref as enum ('light', 'dark', 'system');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  avatar_color text not null default 'engels'
    check (avatar_color in ('engels', 'wiskunde-a', 'nederlands', 'filosofie', 'duits', 'latijn')),
  theme public.theme_pref not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Alleen je eigen profiel lezen en wijzigen. Aanmaken gebeurt via de trigger
-- hieronder; verwijderen via de cascade bij het verwijderen van het account.
create policy "profiles: eigen rij lezen" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

create policy "profiles: eigen rij wijzigen" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Gedeelde helper voor updated_at.
create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(left(new.raw_user_meta_data ->> 'display_name', 60), ''));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
