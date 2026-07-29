alter table public.restaurants
drop constraint if exists restaurants_fulfillment_modes_check;

alter table public.orders
drop constraint if exists orders_fulfillment_mode_check;

alter table public.orders
add constraint orders_fulfillment_mode_check
check (fulfillment_mode in ('pickup', 'delivery', 'local_delivery', 'didi_food', 'table'));

alter table public.orders
add column if not exists order_channel text not null default 'cartamago'
  check (order_channel in ('cartamago', 'whatsapp', 'didi_food')),
add column if not exists delivery_provider text not null default 'none'
  check (delivery_provider in ('none', 'local', 'didi_food')),
add column if not exists payment_status text not null default 'not_required'
  check (payment_status in ('not_required', 'pending', 'paid', 'failed', 'cancelled', 'refunded')),
add column if not exists external_provider text,
add column if not exists external_order_id text,
add column if not exists external_status text,
add column if not exists external_payload jsonb not null default '{}'::jsonb;

create table if not exists public.restaurant_integrations (
  id text primary key,
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  provider text not null check (provider in ('whatsapp', 'didi_food', 'didi_pay')),
  enabled boolean not null default false,
  external_store_id text,
  credentials_ref text,
  settings_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_events (
  id text primary key,
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  provider text not null check (provider in ('whatsapp', 'didi_food', 'didi_pay')),
  event_type text not null,
  external_id text,
  payload_json jsonb not null default '{}'::jsonb,
  status text not null default 'received' check (status in ('received', 'processed', 'failed', 'ignored')),
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

drop trigger if exists set_restaurant_integrations_updated_at on public.restaurant_integrations;
create trigger set_restaurant_integrations_updated_at
before update on public.restaurant_integrations
for each row execute function public.set_updated_at();

alter table public.restaurant_integrations enable row level security;
alter table public.integration_events enable row level security;

grant select, insert, update, delete on public.restaurant_integrations to authenticated;
grant select, insert, update on public.integration_events to authenticated;

create policy "authenticated can manage restaurant integrations"
on public.restaurant_integrations for all
to authenticated
using (true)
with check (true);

create policy "authenticated can manage integration events"
on public.integration_events for all
to authenticated
using (true)
with check (true);
