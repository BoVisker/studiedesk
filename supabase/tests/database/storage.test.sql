-- Foto-opslag: privé en alleen in je eigen map.
-- (Verwijderen gaat via de Storage API; directe deletes blokkeert Supabase zelf.)
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

select is((select public from storage.buckets where id = 'source-images'), false, 'bucket is privé');
insert into storage.objects (bucket_id, name) values ('source-images', '00000000-0000-0000-0000-0000000000e2/tmp/b.jpg');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}';

select lives_ok($$ insert into storage.objects (bucket_id, name) values ('source-images', '00000000-0000-0000-0000-0000000000e1/tmp/a.jpg') $$, 'upload in eigen map');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('source-images', '00000000-0000-0000-0000-0000000000e2/tmp/x.jpg') $$, '42501', null, 'geen upload in andermans map');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('source-images', 'los.jpg') $$, '42501', null, 'geen upload buiten een map');
select results_eq($$ select name from storage.objects where bucket_id = 'source-images' $$, $$ values ('00000000-0000-0000-0000-0000000000e1/tmp/a.jpg'::text) $$, 'alleen eigen foto''s zichtbaar');

select * from finish();
rollback;
