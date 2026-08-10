-- Inventory + Merma (Enfoque A: merma como movimiento de inventario)
-- Fecha: 07-ago-2026

-- 1. Insumos (inventory_items)
create table if not exists public.inventory_items (
  id text primary key,
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  name text not null,
  unit text not null default 'unidad',
  category text not null default 'general',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Stock actual por restaurante
create table if not exists public.inventory_stock (
  id text primary key,
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  item_id text not null references public.inventory_items(id) on delete cascade,
  quantity numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (restaurant_id, item_id)
);

-- 3. Movimientos de inventario (incluye merma)
create table if not exists public.inventory_movements (
  id text primary key,
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  item_id text not null references public.inventory_items(id) on delete cascade,
  quantity numeric not null,
  movement_type text not null check (movement_type in ('compra', 'venta', 'despacho', 'recepcion', 'merma', 'ajuste')),
  reason text,
  reference_id text,
  created_by text,
  created_at timestamptz not null default now()
);

-- Triggers de updated_at
drop trigger if exists set_inventory_items_updated_at on public.inventory_items;
create trigger set_inventory_items_updated_at
before update on public.inventory_items
for each row execute function public.set_updated_at();

drop trigger if exists set_inventory_stock_updated_at on public.inventory_stock;
create trigger set_inventory_stock_updated_at
before update on public.inventory_stock
for each row execute function public.set_updated_at();

-- RLS
alter table public.inventory_items enable row level security;
alter table public.inventory_stock enable row level security;
alter table public.inventory_movements enable row level security;

grant select on public.inventory_items, public.inventory_stock, public.inventory_movements to anon, authenticated;
grant insert, update, delete on public.inventory_items, public.inventory_stock, public.inventory_movements to authenticated;

-- Políticas: solo autenticados pueden ver/gestionar inventario (no es público)
create policy "authenticated can read inventory items"
on public.inventory_items for select
to authenticated
using (true);

create policy "authenticated can manage inventory items"
on public.inventory_items for all
to authenticated
using (true)
with check (true);

create policy "authenticated can read inventory stock"
on public.inventory_stock for select
to authenticated
using (true);

create policy "authenticated can manage inventory stock"
on public.inventory_stock for all
to authenticated
using (true)
with check (true);

create policy "authenticated can read inventory movements"
on public.inventory_movements for select
to authenticated
using (true);

create policy "authenticated can manage inventory movements"
on public.inventory_movements for all
to authenticated
using (true)
with check (true);

-- Función RPC: registrar merma (descuenta stock atómicamente)
create or replace function public.register_merma(
  p_restaurant_id text,
  p_item_id text,
  p_quantity numeric,
  p_reason text,
  p_created_by text default null
)
returns void
language plpgsql
security definer
as $$
begin
  -- Validar cantidad positiva
  if p_quantity <= 0 then
    raise exception 'La cantidad de merma debe ser mayor a cero.';
  end if;

  -- Validar motivo
  if p_reason not in ('vencimiento', 'dano', 'despiece', 'robo', 'otro') then
    raise exception 'Motivo de merma invalido.';
  end if;

  -- Bloquear el stock del insumo
  perform 1
  from public.inventory_stock
  where restaurant_id = p_restaurant_id and item_id = p_item_id
  for update;

  -- Verificar stock suficiente
  if not exists (
    select 1 from public.inventory_stock
    where restaurant_id = p_restaurant_id
      and item_id = p_item_id
      and quantity >= p_quantity
  ) then
    raise exception 'Stock insuficiente para registrar la merma.';
  end if;

  -- Descontar stock
  update public.inventory_stock
  set quantity = quantity - p_quantity,
      updated_at = now()
  where restaurant_id = p_restaurant_id and item_id = p_item_id;

  -- Registrar movimiento
  insert into public.inventory_movements (
    id, restaurant_id, item_id, quantity, movement_type, reason, created_by
  ) values (
    gen_random_uuid()::text, p_restaurant_id, p_item_id, -p_quantity, 'merma', p_reason, p_created_by
  );
end;
$$;

grant execute on function public.register_merma(text, text, numeric, text, text) to authenticated;