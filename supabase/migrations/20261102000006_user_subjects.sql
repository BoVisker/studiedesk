-- Gekozen vakken per gebruiker, met de blokinstellingen van de vak-voorpagina.
-- `blocks` is een lijst {id, enabled, title?} in weergavevolgorde; de frontend
-- voegt nieuwe standaardblokken zelf toe (zie src/features/subjects/blocks.ts).

create table public.user_subjects (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject text not null check (subject in (
    'nederlands', 'engels', 'frans', 'duits', 'spaans', 'latijn', 'grieks',
    'wiskunde-a', 'wiskunde-b', 'wiskunde-c', 'wiskunde-d',
    'geschiedenis', 'aardrijkskunde', 'biologie', 'natuurkunde', 'scheikunde',
    'economie', 'bedrijfseconomie', 'informatica', 'filosofie'
  )),
  position smallint not null default 0,
  blocks jsonb not null default '[]'::jsonb check (jsonb_typeof(blocks) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, subject)
);

alter table public.user_subjects enable row level security;

create policy "user_subjects: eigen rijen lezen" on public.user_subjects
  for select to authenticated using (user_id = (select auth.uid()));

create policy "user_subjects: eigen rijen toevoegen" on public.user_subjects
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy "user_subjects: eigen rijen wijzigen" on public.user_subjects
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "user_subjects: eigen rijen verwijderen" on public.user_subjects
  for delete to authenticated using (user_id = (select auth.uid()));

create trigger user_subjects_set_updated_at before update on public.user_subjects
  for each row execute function public.set_updated_at();
