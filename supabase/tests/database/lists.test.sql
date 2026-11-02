-- Lijsten, items en sessies: alles strikt per gebruiker.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

select is((select count(*)::int from pg_policies where tablename in ('lists','list_items','study_sessions')), 11, 'alle policies aanwezig');

insert into public.signup_allowlist (email) values ('l1@test.nl'), ('l2@test.nl');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'l1@test.nl'),
  ('00000000-0000-0000-0000-0000000000c2', 'l2@test.nl');
insert into public.lists (id, user_id, subject, title) values ('00000000-0000-0000-0000-00000000f002', '00000000-0000-0000-0000-0000000000c2', 'frans', 'Lijst van B');
insert into public.list_items (list_id, user_id, term, definition) values ('00000000-0000-0000-0000-00000000f002', '00000000-0000-0000-0000-0000000000c2', 'chien', 'hond');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';

select lives_ok($$ insert into public.lists (id, subject, title, kind) values ('00000000-0000-0000-0000-00000000f001', 'engels', 'Unit 1', 'woorden') $$, 'eigen lijst maken');
select lives_ok($$ insert into public.list_items (list_id, term, definition) values ('00000000-0000-0000-0000-00000000f001', 'dog', 'hond') $$, 'item in eigen lijst');
select results_eq('select title from public.lists', $$ values ('Unit 1'::text) $$, 'alleen eigen lijsten zichtbaar');
select is_empty($$ select 1 from public.list_items where term = 'chien' $$, 'items van een ander onzichtbaar');
select throws_ok($$ insert into public.list_items (list_id, term, definition) values ('00000000-0000-0000-0000-00000000f002', 'chat', 'kat') $$, '42501', null, 'geen item in andermans lijst');
select throws_ok($$ update public.list_items set list_id = '00000000-0000-0000-0000-00000000f002' where term = 'dog' $$, '42501', null, 'eigen item niet naar andermans lijst verplaatsen');
select is_empty($$ delete from public.lists where title = 'Lijst van B' returning id $$, 'andermans lijst niet verwijderen');
select throws_ok($$ insert into public.study_sessions (list_id, mode, started_at, ended_at) values ('00000000-0000-0000-0000-00000000f002', 'typen', now(), now()) $$, '42501', null, 'geen sessie op andermans lijst');
select throws_ok($$ insert into public.lists (subject, title) values ('sterrenkunde', 'x') $$, '23514', null, 'onbekend vak geweigerd');
select lives_ok($$ insert into public.study_sessions (list_id, subject, mode, started_at, ended_at, items_total, items_correct, grade) values ('00000000-0000-0000-0000-00000000f001', 'engels', 'toets', now(), now(), 10, 8, 8.2) $$, 'eigen sessie opslaan');

select * from finish();
rollback;
