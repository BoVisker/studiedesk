-- Vakkeuze: elke gebruiker ziet en wijzigt alleen de eigen vakken.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into public.signup_allowlist (email) values ('s1@test.nl'), ('s2@test.nl');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b1', 's1@test.nl'),
  ('00000000-0000-0000-0000-0000000000b2', 's2@test.nl');
insert into public.user_subjects (user_id, subject) values ('00000000-0000-0000-0000-0000000000b2', 'latijn');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';

select lives_ok($$ insert into public.user_subjects (subject, blocks) values ('engels', '[{"id":"woordenlijsten","enabled":true}]') $$, 'eigen vak toevoegen (user_id via default)');
select results_eq('select subject from public.user_subjects', $$ values ('engels'::text) $$, 'alleen eigen vakken zichtbaar');
select throws_ok($$ insert into public.user_subjects (user_id, subject) values ('00000000-0000-0000-0000-0000000000b2', 'grieks') $$, '42501', null, 'geen vak voor een ander toevoegen');
select is_empty($$ update public.user_subjects set position = 9 where subject = 'latijn' returning subject $$, 'vak van een ander niet wijzigen');
select is_empty($$ delete from public.user_subjects where subject = 'latijn' returning subject $$, 'vak van een ander niet verwijderen');
select throws_ok($$ insert into public.user_subjects (subject) values ('sterrenkunde') $$, '23514', null, 'onbekend vak geweigerd');
select throws_ok($$ insert into public.user_subjects (subject, blocks) values ('frans', '{}') $$, '23514', null, 'blocks moet een lijst zijn');

select * from finish();
rollback;
