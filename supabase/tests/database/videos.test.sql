-- Gedeelde videocache en -budget: de client kan er niets mee (alleen de Edge Function).
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

select is((select count(*)::int from pg_policies where tablename in ('video_cache','video_budget')), 0, 'geen policies: tabellen zijn dicht');
select is((select relrowsecurity from pg_class where relname = 'video_cache'), true, 'RLS staat aan op video_cache');
select is((select value::int from public.app_config where key = 'youtube_daily_searches'), 80, 'dagbudget staat op 80');

insert into public.signup_allowlist (email) values ('v1@test.nl');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000a001', 'v1@test.nl');
insert into public.video_cache (query, data) values ('wiskunde b afgeleiden', '[]');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000a001","role":"authenticated"}';

select is_empty($$ select 1 from public.video_cache $$, 'client ziet de cache niet');
select throws_ok($$ insert into public.video_cache (query, data) values ('x', '[]') $$, '42501', null, 'client kan niet in de cache schrijven');

select * from finish();
rollback;
