-- AI-gebruikslimiet per gebruiker per dag (Nederlandse kalenderdag).

create table public.app_config (
  key text primary key,
  value jsonb not null
);

alter table public.app_config enable row level security;

create policy "app_config: lezen voor ingelogden" on public.app_config
  for select to authenticated using (true);

insert into public.app_config (key, value) values ('ai_daily_limit', '30');

create table public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default (now() at time zone 'Europe/Amsterdam')::date,
  count integer not null default 0 check (count >= 0),
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;

-- Alleen lezen; ophogen kan uitsluitend via consume_ai_credit().
create policy "ai_usage: eigen rijen lezen" on public.ai_usage
  for select to authenticated using (user_id = (select auth.uid()));

create function public.ai_daily_limit() returns integer
language sql stable set search_path = '' as $$
  select coalesce((select (value #>> '{}')::integer from public.app_config where key = 'ai_daily_limit'), 30);
$$;

-- Verbruikt één AI-credit voor de ingelogde gebruiker. Atomisch: twee
-- gelijktijdige calls kunnen de limiet niet samen overschrijden.
-- Geeft het resterende aantal terug, of gooit 'ai_limit_reached'.
create function public.consume_ai_credit() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  lim integer := public.ai_daily_limit();
  today date := (now() at time zone 'Europe/Amsterdam')::date;
  new_count integer;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  insert into public.ai_usage as u (user_id, day, count)
  values (uid, today, 1)
  on conflict (user_id, day) do update set count = u.count + 1
    where u.count < lim
  returning u.count into new_count;

  if new_count is null or new_count > lim then
    raise exception 'ai_limit_reached' using errcode = 'P0001';
  end if;

  return lim - new_count;
end;
$$;

revoke execute on function public.consume_ai_credit() from public, anon;
grant execute on function public.consume_ai_credit() to authenticated;

-- Voor de UI: hoeveel is er vandaag gebruikt en hoeveel is er over.
create function public.ai_usage_today()
returns table (used integer, daily_limit integer, remaining integer)
language sql stable security invoker set search_path = '' as $$
  with u as (
    select coalesce((
      select count from public.ai_usage
      where user_id = auth.uid() and day = (now() at time zone 'Europe/Amsterdam')::date
    ), 0) as used
  )
  select u.used, public.ai_daily_limit(), greatest(public.ai_daily_limit() - u.used, 0) from u;
$$;

revoke execute on function public.ai_usage_today() from public, anon;
grant execute on function public.ai_usage_today() to authenticated;
