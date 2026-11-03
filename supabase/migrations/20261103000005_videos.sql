-- Uitlegvideo's (fase 9). YouTube search.list kost 100 quota-eenheden per
-- aanroep; standaard 10.000/dag = ~100 zoekopdrachten. Daarom een GEDEELDE
-- cache (alle gebruikers samen) en een dagbudget.
--
-- Beide tabellen zijn gedeeld en bevatten alleen publieke video-metadata, geen
-- persoonsgegevens. RLS staat aan zonder policies: de client kan er niets mee;
-- alleen de Edge Function (service-role) leest en schrijft erin.

create table public.video_cache (
  query text primary key check (char_length(query) between 1 and 300),
  data jsonb not null,
  fetched_at timestamptz not null default now()
);

create table public.video_budget (
  day date primary key default current_date,
  searches integer not null default 0
);

alter table public.video_cache enable row level security;
alter table public.video_budget enable row level security;

-- Dagelijks aantal echte YouTube-zoekopdrachten (de rest komt uit de cache).
insert into public.app_config (key, value) values ('youtube_daily_searches', '80'::jsonb)
  on conflict (key) do nothing;
