-- Registratie alleen op uitnodiging. Voeg adressen toe via de SQL-editor:
--   insert into public.signup_allowlist (email) values ('naam@voorbeeld.nl');
-- Open registratie later? Verwijder dan de trigger `enforce_signup_allowlist`.

create table public.signup_allowlist (
  email text primary key check (email = lower(email)),
  note text,
  created_at timestamptz not null default now()
);

-- RLS aan zonder policies: gebruikers kunnen de lijst niet lezen of wijzigen.
alter table public.signup_allowlist enable row level security;

create function public.enforce_signup_allowlist() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.signup_allowlist a where a.email = lower(new.email)) then
    raise exception 'signup_not_allowed' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger enforce_signup_allowlist before insert on auth.users
  for each row execute function public.enforce_signup_allowlist();
