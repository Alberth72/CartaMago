-- UNIFICAR LENGUAJE: restaurants (sede/restaurante) -> branches
-- La tabla `restaurants` YA ES la sede; se renombra a `branches` y se elimina
-- la `branches` stub creada por 202608080001. El menú, pedidos y stock pasan a
-- colgar de `branch_id`. restaurant_members -> branch_members.
-- Ejecuta sobre el esquema que dejan las migraciones previas (aditivo).

-- 1) Retirar la capa branch duplicada del modelo multi-marca (se re-creará unificada)
drop table if exists public.multibrand_members;
drop table if exists public.formula_ingredients;
drop table if exists public.formula_options;
drop table if exists public.formulas;
drop table if exists public.dispatch_request_items;
drop table if exists public.dispatch_requests;
drop table if exists public.dispatch_items;
drop table if exists public.dispatches;
drop table if exists public.branch_stock;

drop function if exists public.can_manage_brand(text);
drop function if exists public.can_manage_warehouse(text);
drop function if exists public.can_manage_branch(text);
drop function if exists public.register_branch_merma(text, text, numeric, text, text);
drop function if exists public.sell_product(text, text, numeric, text[], text);

-- Quitar columnas branch/warehouse que 202608080001 agregó a inventory_movements
alter table public.inventory_movements drop column if exists branch_id;
alter table public.inventory_movements drop column if exists warehouse_id;
alter table public.inventory_movements alter column restaurant_id set not null;

-- 2) restaurants -> branches (la sede)
alter table public.restaurants rename to branches;

-- 3) Columnas de cadena de abastecimiento sobre la sede
alter table public.branches
  add column if not exists brand_id text references public.brands(id) on delete set null,
  add column if not exists warehouse_id text references public.warehouses(id) on delete set null,
  add column if not exists qr_slug text;

-- 4) restaurant_id -> branch_id en las tablas del menú, pedidos e integraciones
alter table public.categories rename column restaurant_id to branch_id;
alter table public.products rename column restaurant_id to branch_id;
alter table public.menu_photos rename column restaurant_id to branch_id;
alter table public.orders rename column restaurant_id to branch_id;
alter table public.restaurant_integrations rename column restaurant_id to branch_id;
alter table public.integration_events rename column restaurant_id to branch_id;
alter table public.order_status_events rename column restaurant_id to branch_id;
alter index if exists public.order_status_events_restaurant_idx rename to order_status_events_branch_idx;
alter table public.order_idempotency_keys rename column restaurant_id to branch_id;
alter table public.order_rate_limits rename column restaurant_id to branch_id;
alter table public.inventory_items rename column restaurant_id to branch_id;
alter table public.inventory_movements rename column restaurant_id to branch_id;

-- 5) restaurant_members -> branch_members
alter table public.restaurant_members rename to branch_members;
alter table public.branch_members rename column restaurant_id to branch_id;

-- 6) Renombrar funciones de tenancy del restaurante -> branch
drop function if exists public.is_restaurant_member(text);
drop function if exists public.restaurant_has_members(text);
drop function if exists public.can_manage_restaurant(text);

create or replace function public.is_branch_member(p_branch_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.branch_members
    where branch_id = p_branch_id and user_id = auth.uid()
  );
$$;

create or replace function public.branch_has_members(p_branch_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.branch_members where branch_id = p_branch_id
  );
$$;

-- 7) stock de sede: inventory_stock -> branch_stock (renombrado/consolidado)
alter table public.inventory_stock rename to branch_stock;
alter table public.branch_stock rename column restaurant_id to branch_id;
alter index if exists public.inventory_stock_restaurant_id_item_id_key rename to branch_stock_branch_id_item_id_key;

-- 8) RLS: quitar policies de restaurante que referencian funciones renombradas
drop policy if exists "authenticated can read restaurant members" on public.branch_members;
drop policy if exists "restaurant owners can manage members" on public.branch_members;

drop policy if exists "authenticated members can manage restaurants" on public.branches;
drop policy if exists "public can read restaurants" on public.branches;
drop policy if exists "authenticated can read restaurant members" on public.branch_members;
drop policy if exists "authenticated can manage restaurants" on public.branches;

-- 9) Derrumbar policies legadas que referencian restaurant_id / can_manage_restaurant
drop policy if exists "public can read categories" on public.categories;
drop policy if exists "public can read available products" on public.products;
drop policy if exists "public can read menu photos" on public.menu_photos;
drop policy if exists "authenticated can manage products" on public.products;
drop policy if exists "authenticated can manage categories" on public.categories;
drop policy if exists "authenticated can manage menu photos" on public.menu_photos;

drop policy if exists "public can read own orders" on public.orders;
drop policy if exists "public can insert orders" on public.orders;
drop policy if exists "public can insert order items" on public.order_items;
drop policy if exists "public can read order items" on public.order_items;

drop policy if exists "authenticated members can manage restaurants" on public.branches;
drop policy if exists "authenticated members can manage categories" on public.categories;
drop policy if exists "authenticated members can manage products" on public.products;
drop policy if exists "authenticated members can manage menu photos" on public.menu_photos;

drop policy if exists "authenticated members can manage orders" on public.orders;
drop policy if exists "authenticated members can manage order items" on public.order_items;
drop policy if exists "authenticated members can manage restaurant integrations" on public.restaurant_integrations;
drop policy if exists "authenticated members can manage integration events" on public.integration_events;
drop policy if exists "authenticated members can read order status events" on public.order_status_events;

drop policy if exists "authenticated members can upload menu assets" on storage.objects;
drop policy if exists "authenticated members can update menu assets" on storage.objects;
drop policy if exists "authenticated members can delete menu assets" on storage.objects;

-- 10) Función de tenancy unificada (sede = branch)
drop function if exists public.can_manage_restaurant(text);

create or replace function public.can_manage_branch(p_branch_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.role() = 'authenticated'
    and (
      public.is_branch_member(p_branch_id)
      or not public.branch_has_members(p_branch_id)
    );
$$;

-- 11) Policies regeneradas (menú y sedes)
create policy "public can read branches"
on public.branches for select to anon, authenticated
using (true);

create policy "authenticated members can manage branches"
on public.branches for all to authenticated
using (public.can_manage_branch(id))
with check (public.can_manage_branch(id));

create policy "public can read categories"
on public.categories for select to anon, authenticated
using (true);

create policy "authenticated members can manage categories"
on public.categories for all to authenticated
using (public.can_manage_branch(branch_id))
with check (public.can_manage_branch(branch_id));

create policy "public can read available products"
on public.products for select to anon, authenticated
using (available = true or auth.role() = 'authenticated');

create policy "authenticated members can manage products"
on public.products for all to authenticated
using (public.can_manage_branch(branch_id))
with check (public.can_manage_branch(branch_id));

create policy "public can read menu photos"
on public.menu_photos for select to anon, authenticated
using (true);

create policy "authenticated members can manage menu photos"
on public.menu_photos for all to authenticated
using (public.can_manage_branch(branch_id))
with check (public.can_manage_branch(branch_id));


-- 12) Policies de pedidos (solo lectura/gestión por miembros; escritura por edge/service_role)
create policy "authenticated members can read orders"
on public.orders for select to authenticated
using (public.can_manage_branch(branch_id));

create policy "authenticated members can manage orders"
on public.orders for all to authenticated
using (public.can_manage_branch(branch_id))
with check (public.can_manage_branch(branch_id));

create policy "authenticated members can manage order items"
on public.order_items for all to authenticated
using (
  exists (
    select 1 from public.orders
    where orders.id = order_items.order_id
      and public.can_manage_branch(orders.branch_id)
  )
)
with check (
  exists (
    select 1 from public.orders
    where orders.id = order_items.order_id
      and public.can_manage_branch(orders.branch_id)
  )
);

create policy "authenticated members can manage restaurant integrations"
on public.restaurant_integrations for all to authenticated
using (public.can_manage_branch(branch_id))
with check (public.can_manage_branch(branch_id));

create policy "authenticated members can manage integration events"
on public.integration_events for all to authenticated
using (public.can_manage_branch(branch_id))
with check (public.can_manage_branch(branch_id));

create policy "authenticated members can read order status events"
on public.order_status_events for select to authenticated
using (public.can_manage_branch(branch_id));

-- 13) Policies de storage (primera carpeta = id de la sede)
create policy "public can read menu assets"
on storage.objects for select to anon, authenticated
using (bucket_id = 'menu-assets');

create policy "authenticated members can upload menu assets"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'menu-assets'
  and public.can_manage_branch((storage.foldername(name))[1])
);

create policy "authenticated members can update menu assets"
on storage.objects for update to authenticated
using (
  bucket_id = 'menu-assets'
  and public.can_manage_branch((storage.foldername(name))[1])
)
with check (
  bucket_id = 'menu-assets'
  and public.can_manage_branch((storage.foldername(name))[1])
);

create policy "authenticated members can delete menu assets"
on storage.objects for delete to authenticated
using (
  bucket_id = 'menu-assets'
  and public.can_manage_branch((storage.foldername(name))[1])
);


-- 14) Re-crear miembros multi-marca y funciones de bodega/marca (unificadas con branches)
create table if not exists public.multibrand_members (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_id text references public.brands(id) on delete cascade,
  warehouse_id text references public.warehouses(id) on delete cascade,
  branch_id text references public.branches(id) on delete cascade,
  role text not null check (role in ('superadmin', 'warehouse_admin', 'branch_admin', 'cashier')),
  created_at timestamptz not null default now(),
  check (
    (brand_id is not null and warehouse_id is null and branch_id is null)
    or (warehouse_id is not null and brand_id is not null and branch_id is null)
    or (branch_id is not null and warehouse_id is not null)
  )
);

create index if not exists multibrand_members_user_idx on public.multibrand_members (user_id);
create index if not exists multibrand_members_branch_idx on public.multibrand_members (branch_id);

create or replace function public.can_manage_warehouse(p_warehouse_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.multibrand_members m
    where m.user_id = auth.uid()
      and (
        m.warehouse_id = p_warehouse_id
        or (m.brand_id is not null and m.brand_id = (select brand_id from public.warehouses where id = p_warehouse_id))
      )
  );
$$;

create or replace function public.can_manage_brand(p_brand_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.multibrand_members m
    where m.user_id = auth.uid() and m.brand_id = p_brand_id
  );
$$;

-- 15) Policies de miembros de sede (branch_members)
drop policy if exists "authenticated can read branch members" on public.branch_members;
create policy "authenticated can read branch members"
on public.branch_members for select to authenticated
using (public.can_manage_branch(branch_id));

drop policy if exists "branch owners can manage members" on public.branch_members;
create policy "branch owners can manage members"
on public.branch_members for all to authenticated
using (
  public.can_manage_branch(branch_id)
  and exists (
    select 1 from public.branch_members owner_member
    where owner_member.branch_id = branch_members.branch_id
      and owner_member.user_id = auth.uid()
      and owner_member.role in ('owner', 'admin')
  )
)
with check (public.can_manage_branch(branch_id));

-- 16) Policies de la capa multi-marca (cadena)
alter table public.multibrand_members enable row level security;
grant select, insert, update, delete on public.multibrand_members to authenticated;

create policy "authenticated can read multibrand members"
on public.multibrand_members for select to authenticated
using (true);

create policy "members can manage multibrand members"
on public.multibrand_members for all to authenticated
using (
  public.can_manage_brand(brand_id)
  or public.can_manage_warehouse(warehouse_id)
  or public.can_manage_branch(branch_id)
)
with check (
  public.can_manage_brand(brand_id)
  or public.can_manage_warehouse(warehouse_id)
  or public.can_manage_branch(branch_id)
);

-- warehouses/brands/suppliers/purchase/warehouse_stock ya tienen policies de 202608080001;
-- re-grant can_manage_* (se regeneran sus policies en 17 abajo por si quedaron rotas)


-- 17) Re-crear fórmulas (producto -> insumos) sobre la sede (branches)
create table if not exists public.formulas (
  id text primary key,
  branch_id text not null references public.branches(id) on delete cascade,
  product_id text references public.products(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, product_id)
);

create table if not exists public.formula_ingredients (
  id text primary key,
  formula_id text not null references public.formulas(id) on delete cascade,
  item_id text not null references public.inventory_items(id) on delete cascade,
  quantity_per_unit numeric not null default 1,
  merma_percent numeric not null default 0 check (merma_percent >= 0),
  created_at timestamptz not null default now(),
  unique (formula_id, item_id)
);

create table if not exists public.formula_options (
  id text primary key,
  formula_id text not null references public.formulas(id) on delete cascade,
  group_name text not null,
  option_name text not null,
  item_id text not null references public.inventory_items(id) on delete cascade,
  quantity_per_unit numeric not null default 1,
  merma_percent numeric not null default 0 check (merma_percent >= 0),
  created_at timestamptz not null default now(),
  unique (formula_id, group_name, option_name)
);

-- 18) Re-crear solicitudes de despacho y despachos (sede <-> cadena)
create table if not exists public.dispatch_requests (
  id text primary key,
  branch_id text not null references public.branches(id) on delete cascade,
  warehouse_id text not null references public.warehouses(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'dispatched', 'received', 'rejected')),
  requested_by text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dispatch_request_items (
  id text primary key,
  dispatch_request_id text not null references public.dispatch_requests(id) on delete cascade,
  item_id text not null references public.inventory_items(id) on delete restrict,
  quantity numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists public.dispatches (
  id text primary key,
  warehouse_id text not null references public.warehouses(id) on delete cascade,
  branch_id text not null references public.branches(id) on delete cascade,
  dispatch_request_id text references public.dispatch_requests(id) on delete set null,
  status text not null default 'preparing' check (status in ('preparing', 'shipped', 'received', 'cancelled')),
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dispatch_items (
  id text primary key,
  dispatch_id text not null references public.dispatches(id) on delete cascade,
  item_id text not null references public.inventory_items(id) on delete restrict,
  quantity numeric not null,
  created_at timestamptz not null default now()
);

alter table public.formulas enable row level security;
alter table public.formula_ingredients enable row level security;
alter table public.formula_options enable row level security;
alter table public.dispatch_requests enable row level security;
alter table public.dispatch_request_items enable row level security;
alter table public.dispatches enable row level security;
alter table public.dispatch_items enable row level security;

grant select, insert, update, delete on public.formulas to authenticated;
grant select, insert, update, delete on public.formula_ingredients to authenticated;
grant select, insert, update, delete on public.formula_options to authenticated;
grant select, insert, update, delete on public.dispatch_requests to authenticated;
grant select, insert, update, delete on public.dispatch_request_items to authenticated;
grant select, insert, update, delete on public.dispatches to authenticated;
grant select, insert, update, delete on public.dispatch_items to authenticated;


-- 19) Policies de fórmulas y despachos (tenancy por sede/cadena)
create policy "members can read formulas"
on public.formulas for select to authenticated
using (public.can_manage_branch(branch_id));

create policy "members can manage formulas"
on public.formulas for all to authenticated
using (public.can_manage_branch(branch_id))
with check (public.can_manage_branch(branch_id));

create policy "members can read formula ingredients"
on public.formula_ingredients for select to authenticated
using (
  exists (
    select 1 from public.formulas f
    where f.id = formula_ingredients.formula_id
      and public.can_manage_branch(f.branch_id)
  )
);

create policy "members can manage formula ingredients"
on public.formula_ingredients for all to authenticated
using (
  exists (
    select 1 from public.formulas f
    where f.id = formula_ingredients.formula_id
      and public.can_manage_branch(f.branch_id)
  )
)
with check (
  exists (
    select 1 from public.formulas f
    where f.id = formula_ingredients.formula_id
      and public.can_manage_branch(f.branch_id)
  )
);

create policy "members can read formula options"
on public.formula_options for select to authenticated
using (
  exists (
    select 1 from public.formulas f
    where f.id = formula_options.formula_id
      and public.can_manage_branch(f.branch_id)
  )
);

create policy "members can manage formula options"
on public.formula_options for all to authenticated
using (
  exists (
    select 1 from public.formulas f
    where f.id = formula_options.formula_id
      and public.can_manage_branch(f.branch_id)
  )
)
with check (
  exists (
    select 1 from public.formulas f
    where f.id = formula_options.formula_id
      and public.can_manage_branch(f.branch_id)
  )
);

create policy "members can read dispatches"
on public.dispatches for select to authenticated
using (
  public.can_manage_warehouse(warehouse_id)
  or public.can_manage_branch(branch_id)
);

create policy "members can manage dispatches"
on public.dispatches for all to authenticated
using (
  public.can_manage_warehouse(warehouse_id)
  or public.can_manage_branch(branch_id)
)
with check (
  public.can_manage_warehouse(warehouse_id)
  or public.can_manage_branch(branch_id)
);

create policy "members can read dispatch requests"
on public.dispatch_requests for select to authenticated
using (
  public.can_manage_branch(branch_id)
  or public.can_manage_warehouse(warehouse_id)
);

create policy "members can manage dispatch requests"
on public.dispatch_requests for all to authenticated
using (
  public.can_manage_branch(branch_id)
  or public.can_manage_warehouse(warehouse_id)
)
with check (
  public.can_manage_branch(branch_id)
  or public.can_manage_warehouse(warehouse_id)
);

create policy "members can read dispatch items"
on public.dispatch_items for select to authenticated
using (
  exists (
    select 1 from public.dispatches d
    where d.id = dispatch_items.dispatch_id
      and (public.can_manage_warehouse(d.warehouse_id) or public.can_manage_branch(d.branch_id))
  )
);

create policy "members can manage dispatch items"
on public.dispatch_items for all to authenticated
using (
  exists (
    select 1 from public.dispatches d
    where d.id = dispatch_items.dispatch_id
      and (public.can_manage_warehouse(d.warehouse_id) or public.can_manage_branch(d.branch_id))
  )
)
with check (
  exists (
    select 1 from public.dispatches d
    where d.id = dispatch_items.dispatch_id
      and (public.can_manage_warehouse(d.warehouse_id) or public.can_manage_branch(d.branch_id))
  )
);


-- 20) RPC: registrar merma por sede (Enfoque A) - descuenta branch_stock atómicamente
create or replace function public.register_merma(
  p_branch_id text,
  p_item_id text,
  p_quantity numeric,
  p_reason text,
  p_created_by text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_quantity <= 0 then
    raise exception 'La cantidad de merma debe ser mayor a cero.';
  end if;

  if p_reason not in ('vencimiento', 'dano', 'despiece', 'robo', 'otro') then
    raise exception 'Motivo de merma invalido.';
  end if;

  perform 1
  from public.branch_stock
  where branch_id = p_branch_id and item_id = p_item_id
  for update;

  if not exists (
    select 1 from public.branch_stock
    where branch_id = p_branch_id
      and item_id = p_item_id
      and quantity >= p_quantity
  ) then
    raise exception 'Stock insuficiente para registrar la merma.';
  end if;

  update public.branch_stock
  set quantity = quantity - p_quantity,
      updated_at = now()
  where branch_id = p_branch_id and item_id = p_item_id;

  insert into public.inventory_movements (
    id, item_id, quantity, movement_type, reason, branch_id, created_by
  ) values (
    gen_random_uuid()::text, p_item_id, -p_quantity, 'merma', p_reason, p_branch_id, p_created_by
  );
end;
$$;

-- Alias explícito de merma por sede
create or replace function public.register_branch_merma(
  p_branch_id text,
  p_item_id text,
  p_quantity numeric,
  p_reason text,
  p_created_by text default null
)
returns void
language sql
security definer
set search_path = public
as $$
  select public.register_merma(p_branch_id, p_item_id, p_quantity, p_reason, p_created_by);
$$;

-- 21) RPC: vender producto con fórmula (Enfoque C + D) - transacción atómica sobre la sede
create or replace function public.sell_product(
  p_branch_id text,
  p_product_id text,
  p_quantity numeric,
  p_option_ids text[] default '{}'::text[],
  p_created_by text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_formula_id text;
  v_row record;
begin
  if p_quantity <= 0 then
    raise exception 'La cantidad debe ser mayor a cero.';
  end if;

  select id into v_formula_id
  from public.formulas
  where branch_id = p_branch_id and product_id = p_product_id and active
  limit 1;

  if v_formula_id is null then
    raise exception 'No existe fórmula activa para el producto en esta sede.';
  end if;

  drop table if exists tmp_need;
  create temp table tmp_need (item_id text primary key, needed numeric) on commit drop;

  insert into tmp_need (item_id, needed)
  select item_id, sum(q)
  from (
    select i.item_id,
           (i.quantity_per_unit * (1 + i.merma_percent / 100.0) * p_quantity) as q
    from public.formula_ingredients i
    where i.formula_id = v_formula_id

    union all

    select o.item_id,
           (o.quantity_per_unit * (1 + o.merma_percent / 100.0) * p_quantity) as q
    from public.formula_options o
    where o.formula_id = v_formula_id
      and o.id = any(p_option_ids)
  ) t
  group by item_id;

  perform 1
  from public.branch_stock s
  join tmp_need n on s.item_id = n.item_id
  where s.branch_id = p_branch_id
  for update of s;

  for v_row in
    select n.item_id, n.needed, coalesce(s.quantity, 0) as stock_qty
    from tmp_need n
    left join public.branch_stock s
      on s.branch_id = p_branch_id and s.item_id = n.item_id
  loop
    if v_row.stock_qty < v_row.needed then
      raise exception 'Stock insuficiente del insumo %', v_row.item_id;
    end if;
  end loop;

  for v_row in select item_id, needed from tmp_need
  loop
    update public.branch_stock
    set quantity = quantity - v_row.needed,
        updated_at = now()
    where branch_id = p_branch_id and item_id = v_row.item_id;

    insert into public.inventory_movements (
      id, item_id, quantity, movement_type, reason, branch_id, created_by
    ) values (
      gen_random_uuid()::text,
      v_row.item_id,
      -v_row.needed,
      'venta',
      'venta_producto:' || p_product_id,
      p_branch_id,
      p_created_by
    );
  end loop;
end;
$$;

grant execute on function public.register_merma(text, text, numeric, text, text) to authenticated;
grant execute on function public.register_branch_merma(text, text, numeric, text, text) to authenticated;
grant execute on function public.sell_product(text, text, numeric, text[], text) to authenticated;

