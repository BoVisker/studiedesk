-- Uitnodigingsbeheer: alleen beheerders mogen de uitnodigingslijst zien en wijzigen.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into public.signup_allowlist (email) values ('admin@test.nl'), ('gewoon@test.nl');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000ad', 'admin@test.nl'),
  ('00000000-0000-0000-0000-0000000000a1', 'gewoon@test.nl');
insert into public.admins (user_id) values ('00000000-0000-0000-0000-0000000000ad');

-- Gewone gebruiker.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select is(public.is_admin(), false, 'gewone gebruiker is geen beheerder');
select is_empty('select * from public.admin_list_invites()', 'gewone gebruiker ziet geen uitnodigingen');
select throws_ok(
  $$ insert into public.signup_allowlist (email, invited_by) values ('x@test.nl', '00000000-0000-0000-0000-0000000000a1') $$,
  '42501', null, 'gewone gebruiker kan niet uitnodigen'
);
select is_empty($$ delete from public.signup_allowlist returning email $$, 'gewone gebruiker kan niets intrekken');
select throws_ok(
  $$ insert into public.admins (user_id) values ('00000000-0000-0000-0000-0000000000a1') $$,
  '42501', null, 'gewone gebruiker kan zichzelf geen beheerder maken'
);

-- Beheerder.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}';

select is(public.is_admin(), true, 'beheerder wordt herkend');
select lives_ok(
  $$ insert into public.signup_allowlist (email, invited_by) values ('nieuw@test.nl', '00000000-0000-0000-0000-0000000000ad') $$,
  'beheerder kan uitnodigen'
);
select throws_ok(
  $$ insert into public.signup_allowlist (email, invited_by) values ('vals@test.nl', '00000000-0000-0000-0000-0000000000a1') $$,
  '42501', null, 'beheerder kan niet namens een ander uitnodigen'
);
select results_eq(
  $$ select email, registered from public.admin_list_invites() where email in ('nieuw@test.nl', 'gewoon@test.nl') order by email $$,
  $$ values ('gewoon@test.nl'::text, true), ('nieuw@test.nl'::text, false) $$,
  'beheerder ziet uitnodigingen met registratiestatus'
);
select results_eq(
  $$ delete from public.signup_allowlist where email = 'nieuw@test.nl' returning email $$,
  $$ values ('nieuw@test.nl'::text) $$,
  'beheerder kan een uitnodiging intrekken'
);
select is_empty('select user_id from public.admins', 'ook een beheerder kan de beheerderstabel niet lezen');

select * from finish();
rollback;
