-- Cijfers: strikt per gebruiker, geldige waarden, geen dubbele imports.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

select is((select count(*)::int from pg_policies where tablename = 'grades'), 4, 'alle policies aanwezig');

insert into public.signup_allowlist (email) values ('g1@test.nl'), ('g2@test.nl');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'g1@test.nl'),
  ('00000000-0000-0000-0000-0000000000e2', 'g2@test.nl');
insert into public.grades (user_id, subject, description, grade, source, external_id)
  values ('00000000-0000-0000-0000-0000000000e2', 'engels', 'Cijfer van B', 6.5, 'screenshot', 'x1');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}';

select lives_ok($$ insert into public.grades (subject, description, grade, weight) values ('engels', 'SO 1', 7.4, 1) $$, 'eigen cijfer toevoegen');
select results_eq('select description from public.grades', $$ values ('SO 1'::text) $$, 'alleen eigen cijfers zichtbaar');
select is_empty($$ update public.grades set grade = 10 where description = 'Cijfer van B' returning id $$, 'andermans cijfer niet wijzigen');
select throws_ok($$ insert into public.grades (subject, description, grade) values ('engels', 'te hoog', 11) $$, '23514', null, 'cijfer boven 10 geweigerd');
select throws_ok($$ insert into public.grades (subject, description, grade, source) values ('engels', 'import zonder id', 7, 'screenshot') $$, '23514', null, 'import zonder external_id geweigerd');
select lives_ok($$ insert into public.grades (subject, description, grade, source, external_id) values ('engels', 'PW 2', 8, 'screenshot', 'x1') $$, 'zelfde external_id als een ander mag');
select throws_ok($$ insert into public.grades (subject, description, grade, source, external_id) values ('engels', 'PW 2', 8, 'screenshot', 'x1') $$, '23505', null, 'dubbele import geweigerd');
select lives_ok($$ insert into public.grades (subject, description, grade) values ('engels', 'SO 1', 7.4) $$, 'handmatig mag wel twee keer hetzelfde');

select * from finish();
rollback;
