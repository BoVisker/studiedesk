-- Samenvattingen en uitwerkingen: strikt per gebruiker.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

select is((select count(*)::int from pg_policies where tablename = 'notes'), 4, 'alle policies aanwezig');

insert into public.signup_allowlist (email) values ('n1@test.nl'), ('n2@test.nl');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'n1@test.nl'),
  ('00000000-0000-0000-0000-0000000000d2', 'n2@test.nl');
insert into public.notes (user_id, subject, kind, title, content)
  values ('00000000-0000-0000-0000-0000000000d2', 'biologie', 'samenvatting', 'Notitie van B', '{}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';

select lives_ok($$ insert into public.notes (subject, kind, title, length, content) values ('biologie', 'samenvatting', 'Cel', 'kort', '{"secties":[]}') $$, 'eigen samenvatting maken');
select results_eq('select title from public.notes', $$ values ('Cel'::text) $$, 'alleen eigen notities zichtbaar');
select is_empty($$ update public.notes set title = 'gekaapt' where title = 'Notitie van B' returning id $$, 'andermans notitie niet wijzigen');
select is_empty($$ delete from public.notes where title = 'Notitie van B' returning id $$, 'andermans notitie niet verwijderen');
select throws_ok($$ insert into public.notes (user_id, subject, kind, title, content) values ('00000000-0000-0000-0000-0000000000d2', 'biologie', 'samenvatting', 'x', '{}') $$, '42501', null, 'geen notitie op naam van een ander');
select throws_ok($$ insert into public.notes (subject, kind, title, content) values ('biologie', 'uitwerking', 'x', '[]') $$, '23514', null, 'inhoud moet een object zijn');

select * from finish();
rollback;
