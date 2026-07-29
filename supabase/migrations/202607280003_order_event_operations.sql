create extension if not exists pgcrypto with schema extensions;

create table if not exists public.order_status_events (
  id text primary key,
  order_id text not null references public.orders(id) on delete cascade,
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  event_type text not null check (event_type in ('order_created', 'status_changed')),
  previous_status text,
  next_status text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_type text not null default 'system' check (actor_type in ('anonymous', 'user', 'system', 'integration')),
  source text not null default 'database' check (source in ('database', 'admin', 'public_menu', 'edge_function', 'integration')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists order_status_events_order_idx
on public.order_status_events (order_id, created_at);

create index if not exists order_status_events_restaurant_idx
on public.order_status_events (restaurant_id, created_at desc);

create table if not exists public.order_idempotency_keys (
  id text primary key,
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  idempotency_key text not null,
  order_id text references public.orders(id) on delete set null,
  request_hash text,
  response_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  unique (restaurant_id, idempotency_key)
);

create index if not exists order_idempotency_keys_expires_idx
on public.order_idempotency_keys (expires_at);

alter table public.order_status_events enable row level security;
alter table public.order_idempotency_keys enable row level security;

grant select on public.order_status_events to authenticated;
grant select, insert, update, delete on public.orders to service_role;
grant select, insert, update, delete on public.order_items to service_role;
grant select, insert on public.order_status_events to service_role;
grant select, insert, update, delete on public.order_idempotency_keys to service_role;

drop policy if exists "authenticated members can read order status events" on public.order_status_events;
create policy "authenticated members can read order status events"
on public.order_status_events for select
to authenticated
using (public.can_manage_restaurant(restaurant_id));

create or replace function public.log_order_status_event()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  next_actor_type text;
  next_event_type text;
  previous_value text;
begin
  if tg_op = 'INSERT' then
    next_event_type := 'order_created';
    previous_value := null;
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    next_event_type := 'status_changed';
    previous_value := old.status;
  else
    return new;
  end if;

  if current_user_id is not null then
    next_actor_type := 'user';
  elsif auth.role() = 'anon' then
    next_actor_type := 'anonymous';
  else
    next_actor_type := 'system';
  end if;

  insert into public.order_status_events (
    id,
    order_id,
    restaurant_id,
    event_type,
    previous_status,
    next_status,
    actor_user_id,
    actor_type,
    source
  ) values (
    'evt_' || replace(gen_random_uuid()::text, '-', ''),
    new.id,
    new.restaurant_id,
    next_event_type,
    previous_value,
    new.status,
    current_user_id,
    next_actor_type,
    'database'
  );

  return new;
end;
$$;

drop trigger if exists log_order_status_insert on public.orders;
create trigger log_order_status_insert
after insert on public.orders
for each row execute function public.log_order_status_event();

drop trigger if exists log_order_status_update on public.orders;
create trigger log_order_status_update
after update of status on public.orders
for each row execute function public.log_order_status_event();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'orders'
    ) then
      alter publication supabase_realtime add table public.orders;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'order_items'
    ) then
      alter publication supabase_realtime add table public.order_items;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'order_status_events'
    ) then
      alter publication supabase_realtime add table public.order_status_events;
    end if;
  end if;
end $$;
