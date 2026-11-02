-- Woorden-/begrippenlijsten, items met Leitner-SRS en leersessies.

create type public.list_kind as enum ('woorden', 'begrippen', 'formules');

-- Geldige vakken (zelfde lijst als user_subjects en src/config/subjects.ts).
-- Bewust géén foreign key naar user_subjects: een vak wegvinken mag je lijsten
-- niet wissen; ze komen terug als je het vak opnieuw kiest.
create domain public.subject_slug as text check (value in (
  'nederlands', 'engels', 'frans', 'duits', 'spaans', 'latijn', 'grieks',
  'wiskunde-a', 'wiskunde-b', 'wiskunde-c', 'wiskunde-d',
  'geschiedenis', 'aardrijkskunde', 'biologie', 'natuurkunde', 'scheikunde',
  'economie', 'bedrijfseconomie', 'informatica', 'filosofie'
));

create table public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject public.subject_slug not null,
  title text not null check (char_length(title) between 1 and 120),
  chapter text check (char_length(chapter) <= 60),
  kind public.list_kind not null default 'woorden',
  -- BCP-47-taalcodes voor tekst-naar-spraak (bijv. 'fr', 'nl'); null = niet voorlezen.
  term_lang text check (term_lang ~ '^[a-z]{2,3}$'),
  definition_lang text check (definition_lang ~ '^[a-z]{2,3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lists_user_subject_idx on public.lists (user_id, subject);

create table public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  position integer not null default 0,
  term text not null check (char_length(term) between 1 and 500),
  definition text not null check (char_length(definition) between 1 and 1000),
  note text check (char_length(note) <= 500),
  word_type text check (char_length(word_type) <= 40),
  example text check (char_length(example) <= 500),
  -- Leitner: 0 = nieuw, 1..6 = bakje. Zie src/features/study/srs.ts.
  srs_box smallint not null default 0 check (srs_box between 0 and 6),
  due_at timestamptz,
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index list_items_list_idx on public.list_items (list_id, position);
create index list_items_due_idx on public.list_items (user_id, due_at) where due_at is not null;

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  list_id uuid references public.lists (id) on delete set null,
  subject public.subject_slug,
  mode text not null check (mode in ('flashcards', 'typen', 'meerkeuze', 'toets', 'herhalen')),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  items_total integer not null default 0,
  items_correct integer not null default 0,
  grade numeric(3, 1) check (grade between 1 and 10),
  created_at timestamptz not null default now()
);

create index study_sessions_user_idx on public.study_sessions (user_id, started_at desc);

alter table public.lists enable row level security;
alter table public.list_items enable row level security;
alter table public.study_sessions enable row level security;

-- lists
create policy "lists: eigen lezen" on public.lists for select to authenticated using (user_id = (select auth.uid()));
create policy "lists: eigen toevoegen" on public.lists for insert to authenticated with check (user_id = (select auth.uid()));
create policy "lists: eigen wijzigen" on public.lists for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "lists: eigen verwijderen" on public.lists for delete to authenticated using (user_id = (select auth.uid()));

-- list_items: eigen rij én de lijst moet van jou zijn (geen items in andermans lijst).
create policy "list_items: eigen lezen" on public.list_items for select to authenticated using (user_id = (select auth.uid()));
create policy "list_items: eigen toevoegen" on public.list_items for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid()))
  );
create policy "list_items: eigen wijzigen" on public.list_items for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid()))
  );
create policy "list_items: eigen verwijderen" on public.list_items for delete to authenticated using (user_id = (select auth.uid()));

-- study_sessions: alleen toevoegen en lezen; geschiedenis pas je niet aan.
create policy "study_sessions: eigen lezen" on public.study_sessions for select to authenticated using (user_id = (select auth.uid()));
create policy "study_sessions: eigen toevoegen" on public.study_sessions for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (list_id is null or exists (select 1 from public.lists l where l.id = list_id and l.user_id = (select auth.uid())))
  );
create policy "study_sessions: eigen verwijderen" on public.study_sessions for delete to authenticated using (user_id = (select auth.uid()));

create trigger lists_set_updated_at before update on public.lists
  for each row execute function public.set_updated_at();
create trigger list_items_set_updated_at before update on public.list_items
  for each row execute function public.set_updated_at();
