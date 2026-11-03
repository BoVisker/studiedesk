-- Samenvattingen en wiskunde-uitwerkingen uit foto's (fase 5).
-- De inhoud is gestructureerde JSON van de Edge Function explain-photo;
-- zie src/features/notes/types.ts voor de vorm.

create type public.note_kind as enum ('samenvatting', 'uitwerking');

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject public.subject_slug not null,
  kind public.note_kind not null,
  title text not null check (char_length(title) between 1 and 120),
  chapter text check (char_length(chapter) <= 60),
  -- Alleen bij samenvattingen: gekozen lengte.
  length text check (length in ('kort', 'normaal', 'uitgebreid')),
  content jsonb not null check (jsonb_typeof(content) = 'object' and octet_length(content::text) <= 200000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_user_subject_idx on public.notes (user_id, subject, created_at desc);

alter table public.notes enable row level security;

create policy "notes: eigen lezen" on public.notes for select to authenticated using (user_id = (select auth.uid()));
create policy "notes: eigen toevoegen" on public.notes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "notes: eigen wijzigen" on public.notes for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notes: eigen verwijderen" on public.notes for delete to authenticated using (user_id = (select auth.uid()));

create trigger notes_set_updated_at before update on public.notes
  for each row execute function public.set_updated_at();
