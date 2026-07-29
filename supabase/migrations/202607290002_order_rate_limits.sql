create table if not exists public.order_rate_limits (
  id text primary key,
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  limit_key text not null,
  window_started_at timestamptz not null,
  expires_at timestamptz not null,
  request_count int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists order_rate_limits_expires_idx
on public.order_rate_limits (expires_at);

create index if not exists order_rate_limits_restaurant_window_idx
on public.order_rate_limits (restaurant_id, window_started_at);

alter table public.order_rate_limits enable row level security;

revoke all on public.order_rate_limits from anon, authenticated;
grant select, insert, update, delete on public.order_rate_limits to service_role;

drop trigger if exists set_order_rate_limits_updated_at on public.order_rate_limits;
create trigger set_order_rate_limits_updated_at
before update on public.order_rate_limits
for each row execute function public.set_updated_at();
