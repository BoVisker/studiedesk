-- RLS- en regelcontroles. Draai met: supabase test db (lokale stack, Docker).
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- Testdata (als postgres, RLS geldt niet).
insert into public.signup_allowlist (email) values ('a@test.nl'), ('b@test.nl');

select throws_ok(
  $$ insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000c', 'c@test.nl') $$,
  'P0001', 'signup_not_allowed',
  'registratie buiten de uitnodigingslijst wordt geweigerd'
);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'A@test.nl', '{"display_name":"Anna"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.nl', '{}');

select is(
  (select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000a'),
  'Anna', 'trigger maakt profiel met weergavenaam aan'
);

update public.app_config set value = '2' where key = 'ai_daily_limit';
insert into public.ai_usage (user_id, count) values ('00000000-0000-0000-0000-00000000000b', 1);

-- Vanaf hier: gebruiker A.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select results_eq(
  'select id::text from public.profiles',
  array['00000000-0000-0000-0000-00000000000a'],
  'A ziet alleen het eigen profiel'
);

select is_empty(
  $$ update public.profiles set display_name = 'gehackt'
     where id = '00000000-0000-0000-0000-00000000000b' returning id $$,
  'A kan het profiel van B niet wijzigen'
);

select lives_ok(
  $$ update public.profiles set display_name = 'Anna K', theme = 'dark'
     where id = '00000000-0000-0000-0000-00000000000a' $$,
  'A kan het eigen profiel wijzigen'
);

select throws_ok(
  $$ update public.profiles set id = '00000000-0000-0000-0000-00000000000b'
     where id = '00000000-0000-0000-0000-00000000000a' $$,
  '42501', null,
  'A kan het eigen profiel niet aan B toewijzen'
);

select is_empty(
  $$ delete from public.profiles returning id $$,
  'A kan geen profielen verwijderen'
);

select throws_ok(
  $$ insert into public.profiles (id) values ('00000000-0000-0000-0000-0000000000ff') $$,
  '42501', null,
  'A kan zelf geen profielrijen aanmaken'
);

select is_empty('select email from public.signup_allowlist', 'A kan de uitnodigingslijst niet lezen');

select throws_ok(
  $$ insert into public.signup_allowlist (email) values ('x@test.nl') $$,
  '42501', null,
  'A kan zichzelf niet uitnodigen'
);

select throws_ok(
  $$ insert into public.ai_usage (user_id, count) values ('00000000-0000-0000-0000-00000000000a', 0) $$,
  '42501', null,
  'A kan ai_usage niet direct schrijven'
);

select is_empty(
  $$ select 1 from public.ai_usage where user_id = '00000000-0000-0000-0000-00000000000b' $$,
  'A ziet het AI-gebruik van B niet'
);

select is(public.consume_ai_credit(), 1, 'eerste credit: 1 over (limiet 2)');
select is(public.consume_ai_credit(), 0, 'tweede credit: 0 over');
select throws_ok('select public.consume_ai_credit()', 'P0001', 'ai_limit_reached', 'derde credit wordt geweigerd');

select results_eq(
  'select used, daily_limit, remaining from public.ai_usage_today()',
  $$ values (2, 2, 0) $$,
  'ai_usage_today klopt na het bereiken van de limiet'
);

select * from finish();
rollback;
