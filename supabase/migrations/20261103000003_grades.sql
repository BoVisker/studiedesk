-- Cijfers (fase 6). Elk cijfer heeft een bron; geïmporteerde cijfers hebben een
-- external_id, zodat dezelfde import nooit dubbel wordt opgeslagen.
-- Bronnen: manual, screenshot, ics, magister (uitgeschakelde stub, zie docs/magister-later.md).

create table public.grades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject public.subject_slug not null,
  description text not null check (char_length(description) between 1 and 200),
  grade numeric(4, 2) not null check (grade between 1 and 10),
  weight numeric(5, 2) not null default 1 check (weight > 0 and weight <= 100),
  graded_on date,
  -- false = telt niet mee in het gemiddelde (bijv. een oefentoets).
  counts boolean not null default true,
  source text not null default 'manual' check (source in ('manual', 'screenshot', 'ics', 'magister')),
  external_id text check (char_length(external_id) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source = 'manual' or external_id is not null)
);

-- Duplicaatdetectie bij imports. NULL-waarden (handmatige cijfers) botsen nooit.
create unique index grades_source_external_idx on public.grades (user_id, source, external_id);
create index grades_user_subject_idx on public.grades (user_id, subject, graded_on);

alter table public.grades enable row level security;

create policy "grades: eigen lezen" on public.grades for select to authenticated using (user_id = (select auth.uid()));
create policy "grades: eigen toevoegen" on public.grades for insert to authenticated with check (user_id = (select auth.uid()));
create policy "grades: eigen wijzigen" on public.grades for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "grades: eigen verwijderen" on public.grades for delete to authenticated using (user_id = (select auth.uid()));

create trigger grades_set_updated_at before update on public.grades
  for each row execute function public.set_updated_at();
