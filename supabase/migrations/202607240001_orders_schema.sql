create table if not exists public.orders (
  id text primary key,
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')),
  customer_name text not null default '',
  customer_note text not null default '',
  fulfillment_mode text not null default 'pickup' check (fulfillment_mode in ('pickup', 'delivery', 'table')),
  delivery_address text not null default '',
  table_number text not null default '',
  total_items int not null default 0,
  total_cop int not null default 0,
  whatsapp_message text not null default '',
  whatsapp_link text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id text primary key,
  order_id text not null references public.orders(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  quantity int not null default 1,
  unit_price_cop int,
  line_note text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert on public.orders to anon, authenticated;
grant select, insert on public.order_items to anon, authenticated;
grant update, delete on public.orders to authenticated;
grant update, delete on public.order_items to authenticated;

create policy "public can insert orders"
on public.orders for insert
to anon, authenticated
with check (true);

create policy "public can read own orders"
on public.orders for select
to anon, authenticated
using (true);

create policy "authenticated can manage orders"
on public.orders for all
to authenticated
using (true)
with check (true);

create policy "public can insert order items"
on public.order_items for insert
to anon, authenticated
with check (true);

create policy "public can read order items"
on public.order_items for select
to anon, authenticated
using (true);

create policy "authenticated can manage order items"
on public.order_items for all
to authenticated
using (true)
with check (true);