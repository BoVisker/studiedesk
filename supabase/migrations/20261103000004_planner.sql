-- Toetsplanner (fase 7). Toetsen met een datum; het leerplan wordt in de app
-- berekend uit de toetsen (uitlegbaar, geen AI). Afgevinkte leermomenten
-- worden hier bewaard zodat ze op elk apparaat blijven staan.
-- Toetsen kunnen later uit een ICS-agenda komen; vandaar source/external_id.

create table public.tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject public.subject_slug not null,
  title text not null check (char_length(title) between 1 and 200),
  test_date date not null,
  -- Aantal leermomenten dat de planner voor deze toets inplant.
  effort smallint not null default 3 check (effort between 1 and 10),
  source text not null default 'manual' check (source in ('manual', 'ics', 'screenshot', 'magister')),
  external_id text check (char_length(external_id) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source = 'manual' or external_id is not null)
);

create unique index tests_source_external_idx on public.tests (user_id, source, external_id);
create index tests_user_date_idx on public.tests (user_id, test_date);

-- Eén rij per afgevinkt leermoment. item_key = '<test_id>#<datum>'.
create table public.plan_checkoffs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_key text not null check (char_length(item_key) between 1 and 200),
  done_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, item_key)
);

alter table public.tests enable row level security;
alter table public.plan_checkoffs enable row level security;

create policy "tests: eigen lezen" on public.tests for select to authenticated using (user_id = (select auth.uid()));
create policy "tests: eigen toevoegen" on public.tests for insert to authenticated with check (user_id = (select auth.uid()));
create policy "tests: eigen wijzigen" on public.tests for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "tests: eigen verwijderen" on public.tests for delete to authenticated using (user_id = (select auth.uid()));

create policy "plan_checkoffs: eigen lezen" on public.plan_checkoffs for select to authenticated using (user_id = (select auth.uid()));
create policy "plan_checkoffs: eigen toevoegen" on public.plan_checkoffs for insert to authenticated with check (user_id = (select auth.uid()));
create policy "plan_checkoffs: eigen verwijderen" on public.plan_checkoffs for delete to authenticated using (user_id = (select auth.uid()));

create trigger tests_set_updated_at before update on public.tests
  for each row execute function public.set_updated_at();
