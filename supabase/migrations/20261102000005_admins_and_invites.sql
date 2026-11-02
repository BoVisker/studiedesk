-- Beheerders kunnen vanuit de app mensen uitnodigen.
-- Een beheerder toevoegen (SQL Editor, niet in een migratie: de repo is openbaar):
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'beheerder@voorbeeld.nl';

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- RLS aan zonder policies: niemand kan via de API beheerders lezen of toevoegen.
alter table public.admins enable row level security;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

alter table public.signup_allowlist
  add column invited_by uuid references auth.users (id) on delete set null;

create policy "allowlist: beheerders lezen" on public.signup_allowlist
  for select to authenticated using ((select public.is_admin()));

create policy "allowlist: beheerders uitnodigen" on public.signup_allowlist
  for insert to authenticated
  with check ((select public.is_admin()) and invited_by = (select auth.uid()));

create policy "allowlist: beheerders intrekken" on public.signup_allowlist
  for delete to authenticated using ((select public.is_admin()));

-- Overzicht voor de beheerpagina: wie is uitgenodigd en heeft al een account?
-- security definer omdat auth.users niet via de API leesbaar is; geeft alleen
-- iets terug aan beheerders.
create function public.admin_list_invites()
returns table (email text, note text, created_at timestamptz, registered boolean)
language sql stable security definer set search_path = '' as $$
  select a.email, a.note, a.created_at, u.id is not null
  from public.signup_allowlist a
  left join auth.users u on lower(u.email) = a.email
  where public.is_admin()
  order by a.created_at desc;
$$;

revoke execute on function public.admin_list_invites() from public, anon;
grant execute on function public.admin_list_invites() to authenticated;
