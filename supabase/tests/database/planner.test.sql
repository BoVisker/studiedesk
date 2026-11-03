-- Toetsen en afvinklijst: strikt per gebruiker, geldige waarden, geen dubbele import.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

select is((select count(*)::int from pg_policies where tablename in ('tests','plan_checkoffs')), 7, 'alle policies aanwezig');

insert into public.signup_allowlist (email) values ('p1@test.nl'), ('p2@test.nl');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'p1@test.nl'),
  ('00000000-0000-0000-0000-0000000000f2', 'p2@test.nl');
insert into public.tests (user_id, subject, title, test_date, source, external_id)
  values ('00000000-0000-0000-0000-0000000000f2', 'engels', 'Toets van B', current_date + 7, 'ics', 'uid-b');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}';

select lives_ok($$ insert into public.tests (subject, title, test_date, effort) values ('engels', 'PW hoofdstuk 3', current_date + 5, 4) $$, 'eigen toets toevoegen');
select results_eq('select title from public.tests', $$ values ('PW hoofdstuk 3'::text) $$, 'alleen eigen toetsen zichtbaar');
select throws_ok($$ insert into public.tests (subject, title, test_date, effort) values ('engels', 'te veel', current_date + 5, 11) $$, '23514', null, 'effort boven 10 geweigerd');
select lives_ok($$ insert into public.tests (subject, title, test_date, source, external_id) values ('engels', 'SE', current_date + 9, 'ics', 'uid-b') $$, 'zelfde uid als een ander mag');
select throws_ok($$ insert into public.tests (subject, title, test_date, source, external_id) values ('engels', 'SE', current_date + 9, 'ics', 'uid-b') $$, '23505', null, 'dubbele ICS-import geweigerd');
select lives_ok($$ insert into public.plan_checkoffs (item_key) values ('t1#2026-11-05') $$, 'leermoment afvinken');
select throws_ok($$ insert into public.plan_checkoffs (item_key) values ('t1#2026-11-05') $$, '23505', null, 'niet twee keer hetzelfde afvinken');

select * from finish();
rollback;
