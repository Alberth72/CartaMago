-- Multi-marca: bodega / sede + fórmulas + merma (Enfoque A + B)
-- Alineado a docs/app-structure-multibrand.md (secciones 8-9)
-- Fecha: 08-ago-2026
-- ADITIVA: no rompe el modelo actual (restaurant_id); añade el eje multi-tenant
--   brands -> warehouses -> branches   (1:N -> 1:N)
--
-- Jerarquía de tenancy:
--   Superadmin        -> miembro de brand (rol superadmin) ve todo bajo la marca
--   Admin de Bodega   -> ve su bodega y las sedes que dependen de ella
--   Admin de Sede     -> ve solo su sede
--   Cajero            -> ve su sede (acceso POS; la restricción de módulo es de app)

-- 1. Marcas (tenant raíz)
create table if not exists public.brands (
  id text primary key,
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Bodegas centrales (pertenecen a una marca, 1:N)
create table if not exists public.warehouses (
  id text primary key,
  brand_id text not null references public.brands(id) on delete cascade,
  name text not null,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Sedes (pertenecen a una bodega, 1:N)
create table if not exists public.branches (
  id text primary key,
  brand_id text not null references public.brands(id) on delete cascade,
  warehouse_id text not null references public.warehouses(id) on delete restrict,
  name text not null,
  address text,
  qr_slug text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Miembros multi-marca (Superadmin / Admin de Bodega / Admin de Sede / Cajero)
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
create index if not exists multibrand_members_brand_idx on public.multibrand_members (brand_id);
create index if not exists multibrand_members_warehouse_idx on public.multibrand_members (warehouse_id);
create index if not exists multibrand_members_branch_idx on public.multibrand_members (branch_id);

-- 5. Funciones de tenancy multi-marca (ascendente: marca -> bodega -> sede)
create or replace function public.can_manage_warehouse(p_warehouse_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.multibrand_members m
    where m.user_id = auth.uid()
      and (
        m.warehouse_id = p_warehouse_id
        or (
          m.brand_id is not null
          and m.brand_id = (select brand_id from public.warehouses where id = p_warehouse_id)
        )
      )
  );
$$;

create or replace function public.can_manage_branch(p_branch_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.multibrand_members m
    where m.user_id = auth.uid()
      and (
        m.branch_id = p_branch_id
        or (m.warehouse_id is not null and m.warehouse_id = (select warehouse_id from public.branches where id = p_branch_id))
        or (m.brand_id is not null and m.brand_id = (select brand_id from public.branches where id = p_branch_id))
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
    select 1
    from public.multibrand_members m
    where m.user_id = auth.uid() and m.brand_id = p_brand_id
  );
$$;

-- 6. Insumos maestros: reutilizamos public.inventory_items (ya existe).
--    En el modelo multi-marca el insumo es de la marca. Añadimos brand_id (aditivo).
alter table public.inventory_items
  add column if not exists brand_id text references public.brands(id) on delete cascade;

-- 7. Proveedores (nivel bodega central)
create table if not exists public.suppliers (
  id text primary key,
  brand_id text not null references public.brands(id) on delete cascade,
  name text not null,
  contact_name text,
  phone text,
  tax_id text,
  terms text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 8. Órdenes de compra (compras centralizadas: bodega -> proveedor)
create table if not exists public.purchase_orders (
  id text primary key,
  warehouse_id text not null references public.warehouses(id) on delete cascade,
  supplier_id text references public.suppliers(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'received', 'paid', 'cancelled')),
  total_cost numeric not null default 0,
  notes text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_order_items (
  id text primary key,
  purchase_order_id text not null references public.purchase_orders(id) on delete cascade,
  item_id text not null references public.inventory_items(id) on delete restrict,
  quantity numeric not null,
  unit_cost numeric not null default 0,
  created_at timestamptz not null default now()
);

-- 9. Stock central por bodega
create table if not exists public.warehouse_stock (
  id text primary key,
  warehouse_id text not null references public.warehouses(id) on delete cascade,
  item_id text not null references public.inventory_items(id) on delete cascade,
  quantity numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (warehouse_id, item_id)
);

-- 10. Stock por sede
create table if not exists public.branch_stock (
  id text primary key,
  branch_id text not null references public.branches(id) on delete cascade,
  item_id text not null references public.inventory_items(id) on delete cascade,
  quantity numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (branch_id, item_id)
);

-- 11. Solicitudes de despacho (sede -> bodega)
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

-- 12. Despachos (salida de bodega / entrada a sede)
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


-- 13. Fórmulas (recetas por sede): producto -> insumos, con opciones y merma.
--     Enfoque C (opciones/variantes) + Enfoque D / B (merma por transformación).
create table if not exists public.formulas (
  id text primary key,
  branch_id text not null references public.branches(id) on delete cascade,
  product_id text references public.products(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, product_id)
);

-- Insumos base (siempre se descuentan) + % de merma de transformación (Enfoque B/D)
create table if not exists public.formula_ingredients (
  id text primary key,
  formula_id text not null references public.formulas(id) on delete cascade,
  item_id text not null references public.inventory_items(id) on delete cascade,
  quantity_per_unit numeric not null default 1,
  merma_percent numeric not null default 0 check (merma_percent >= 0),
  created_at timestamptz not null default now(),
  unique (formula_id, item_id)
);

-- Grupos de opciones (variantes elegibles): "acompañamiento" -> A, B o C.
-- Al vender, el cajero/POS elige UNA opción por grupo; se descuenta su insumo.
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

-- 14. Habilitar scope multibrand en movimientos de inventario (aditivo).
--     El Enfoque A ya existe (inventory_movements con restaurant_id); añadimos
--     branch_id/warehouse_id y hacemos opcional restaurant_id para el modelo nuevo.
alter table public.inventory_movements
  alter column restaurant_id drop not null,
  add column if not exists branch_id text references public.branches(id) on delete set null,
  add column if not exists warehouse_id text references public.warehouses(id) on delete set null;


-- 15. RPC: registrar merma en sede (Enfoque A) - descuenta stock de sede atómicamente.
create or replace function public.register_branch_merma(
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

  -- Bloquear el stock del insumo en la sede
  perform 1
  from public.branch_stock
  where branch_id = p_branch_id and item_id = p_item_id
  for update;

  -- Validar stock suficiente
  if not exists (
    select 1 from public.branch_stock
    where branch_id = p_branch_id
      and item_id = p_item_id
      and quantity >= p_quantity
  ) then
    raise exception 'Stock insuficiente para registrar la merma.';
  end if;

  -- Descontar stock de sede
  update public.branch_stock
  set quantity = quantity - p_quantity,
      updated_at = now()
  where branch_id = p_branch_id and item_id = p_item_id;

  -- Registrar movimiento (auditoría)
  insert into public.inventory_movements (
    id, item_id, quantity, movement_type, reason, branch_id, created_by
  ) values (
    gen_random_uuid()::text, p_item_id, -p_quantity, 'merma', p_reason, p_branch_id, p_created_by
  );
end;
$$;


-- 16. RPC: vender producto con fórmula (Enfoque C + D).
--     El POS envía solo product_id + cantidad + opciones elegidas.
--     Descuenta TODOS los insumos (base + opción) en UNA transacción atómica.
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

  -- Resolver fórmula activa de la sede
  select id into v_formula_id
  from public.formulas
  where branch_id = p_branch_id and product_id = p_product_id and active
  limit 1;

  if v_formula_id is null then
    raise exception 'No existe fórmula activa para el producto en esta sede.';
  end if;

  -- Calcular necesidad por insumo: base + opciones elegidas, aplicando % merma.
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

  -- Bloquear las filas de stock implicadas (evita doble venta / doble descuento)
  perform 1
  from public.branch_stock s
  join tmp_need n on s.item_id = n.item_id
  where s.branch_id = p_branch_id
  for update of s;

  -- Validar stock suficiente para TODOS los insumos (control estricto, fase 1)
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

  -- Descontar cada insumo y registrar movimiento de venta
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


-- 17. Triggers de updated_at (reutiliza public.set_updated_at)
drop trigger if exists set_brands_updated_at on public.brands;
create trigger set_brands_updated_at
before update on public.brands
for each row execute function public.set_updated_at();

drop trigger if exists set_warehouses_updated_at on public.warehouses;
create trigger set_warehouses_updated_at
before update on public.warehouses
for each row execute function public.set_updated_at();

drop trigger if exists set_branches_updated_at on public.branches;
create trigger set_branches_updated_at
before update on public.branches
for each row execute function public.set_updated_at();

drop trigger if exists set_suppliers_updated_at on public.suppliers;
create trigger set_suppliers_updated_at
before update on public.suppliers
for each row execute function public.set_updated_at();

drop trigger if exists set_purchase_orders_updated_at on public.purchase_orders;
create trigger set_purchase_orders_updated_at
before update on public.purchase_orders
for each row execute function public.set_updated_at();

drop trigger if exists set_warehouse_stock_updated_at on public.warehouse_stock;
create trigger set_warehouse_stock_updated_at
before update on public.warehouse_stock
for each row execute function public.set_updated_at();

drop trigger if exists set_branch_stock_updated_at on public.branch_stock;
create trigger set_branch_stock_updated_at
before update on public.branch_stock
for each row execute function public.set_updated_at();

drop trigger if exists set_dispatch_requests_updated_at on public.dispatch_requests;
create trigger set_dispatch_requests_updated_at
before update on public.dispatch_requests
for each row execute function public.set_updated_at();

drop trigger if exists set_dispatches_updated_at on public.dispatches;
create trigger set_dispatches_updated_at
before update on public.dispatches
for each row execute function public.set_updated_at();

drop trigger if exists set_formulas_updated_at on public.formulas;
create trigger set_formulas_updated_at
before update on public.formulas
for each row execute function public.set_updated_at();

-- 18. RLS: habilitar en todas las tablas nuevas
alter table public.brands enable row level security;
alter table public.warehouses enable row level security;
alter table public.branches enable row level security;
alter table public.multibrand_members enable row level security;
alter table public.suppliers enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.warehouse_stock enable row level security;
alter table public.branch_stock enable row level security;
alter table public.dispatch_requests enable row level security;
alter table public.dispatch_request_items enable row level security;
alter table public.dispatches enable row level security;
alter table public.dispatch_items enable row level security;
alter table public.formulas enable row level security;
alter table public.formula_ingredients enable row level security;
alter table public.formula_options enable row level security;

-- 19. Grants (solo authenticated; los datos multi-marca NO son públicos)
grant select, insert, update, delete on public.brands to authenticated;
grant select, insert, update, delete on public.warehouses to authenticated;
grant select, insert, update, delete on public.branches to authenticated;
grant select, insert, update, delete on public.multibrand_members to authenticated;
grant select, insert, update, delete on public.suppliers to authenticated;
grant select, insert, update, delete on public.purchase_orders to authenticated;
grant select, insert, update, delete on public.purchase_order_items to authenticated;
grant select, insert, update, delete on public.warehouse_stock to authenticated;
grant select, insert, update, delete on public.branch_stock to authenticated;
grant select, insert, update, delete on public.dispatch_requests to authenticated;
grant select, insert, update, delete on public.dispatch_request_items to authenticated;
grant select, insert, update, delete on public.dispatches to authenticated;
grant select, insert, update, delete on public.dispatch_items to authenticated;
grant select, insert, update, delete on public.formulas to authenticated;
grant select, insert, update, delete on public.formula_ingredients to authenticated;
grant select, insert, update, delete on public.formula_options to authenticated;

grant execute on function public.register_branch_merma(text, text, numeric, text, text) to authenticated;
grant execute on function public.sell_product(text, text, numeric, text[], text) to authenticated;


-- 20. Políticas RLS de tenancy multi-marca
drop policy if exists "members can read brands" on public.brands;
create policy "members can read brands"
on public.brands for select to authenticated
using (public.can_manage_brand(id));

drop policy if exists "members can manage brands" on public.brands;
create policy "members can manage brands"
on public.brands for all to authenticated
using (public.can_manage_brand(id))
with check (public.can_manage_brand(id));

drop policy if exists "members can read warehouses" on public.warehouses;
create policy "members can read warehouses"
on public.warehouses for select to authenticated
using (public.can_manage_warehouse(id));

drop policy if exists "members can manage warehouses" on public.warehouses;
create policy "members can manage warehouses"
on public.warehouses for all to authenticated
using (public.can_manage_warehouse(id))
with check (public.can_manage_warehouse(id));

drop policy if exists "members can read branches" on public.branches;
create policy "members can read branches"
on public.branches for select to authenticated
using (public.can_manage_branch(id));

drop policy if exists "members can manage branches" on public.branches;
create policy "members can manage branches"
on public.branches for all to authenticated
using (public.can_manage_branch(id))
with check (public.can_manage_branch(id));

drop policy if exists "authenticated can read multibrand members" on public.multibrand_members;
create policy "authenticated can read multibrand members"
on public.multibrand_members for select to authenticated
using (true);

drop policy if exists "members can manage multibrand members" on public.multibrand_members;
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

drop policy if exists "members can read suppliers" on public.suppliers;
create policy "members can read suppliers"
on public.suppliers for select to authenticated
using (public.can_manage_brand(brand_id));

drop policy if exists "members can manage suppliers" on public.suppliers;
create policy "members can manage suppliers"
on public.suppliers for all to authenticated
using (public.can_manage_brand(brand_id))
with check (public.can_manage_brand(brand_id));

drop policy if exists "members can read purchase orders" on public.purchase_orders;
create policy "members can read purchase orders"
on public.purchase_orders for select to authenticated
using (public.can_manage_warehouse(warehouse_id));

drop policy if exists "members can manage purchase orders" on public.purchase_orders;
create policy "members can manage purchase orders"
on public.purchase_orders for all to authenticated
using (public.can_manage_warehouse(warehouse_id))
with check (public.can_manage_warehouse(warehouse_id));

drop policy if exists "members can read purchase order items" on public.purchase_order_items;
create policy "members can read purchase order items"
on public.purchase_order_items for select to authenticated
using (
  exists (
    select 1 from public.purchase_orders po
    where po.id = purchase_order_items.purchase_order_id
      and public.can_manage_warehouse(po.warehouse_id)
  )
);

drop policy if exists "members can manage purchase order items" on public.purchase_order_items;
create policy "members can manage purchase order items"
on public.purchase_order_items for all to authenticated
using (
  exists (
    select 1 from public.purchase_orders po
    where po.id = purchase_order_items.purchase_order_id
      and public.can_manage_warehouse(po.warehouse_id)
  )
)
with check (
  exists (
    select 1 from public.purchase_orders po
    where po.id = purchase_order_items.purchase_order_id
      and public.can_manage_warehouse(po.warehouse_id)
  )
);

drop policy if exists "members can read warehouse stock" on public.warehouse_stock;
create policy "members can read warehouse stock"
on public.warehouse_stock for select to authenticated
using (public.can_manage_warehouse(warehouse_id));

drop policy if exists "members can manage warehouse stock" on public.warehouse_stock;
create policy "members can manage warehouse stock"
on public.warehouse_stock for all to authenticated
using (public.can_manage_warehouse(warehouse_id))
with check (public.can_manage_warehouse(warehouse_id));

drop policy if exists "members can read branch stock" on public.branch_stock;
create policy "members can read branch stock"
on public.branch_stock for select to authenticated
using (public.can_manage_branch(branch_id));

drop policy if exists "members can manage branch stock" on public.branch_stock;
create policy "members can manage branch stock"
on public.branch_stock for all to authenticated
using (public.can_manage_branch(branch_id))
with check (public.can_manage_branch(branch_id));


drop policy if exists "members can read dispatch requests" on public.dispatch_requests;
create policy "members can read dispatch requests"
on public.dispatch_requests for select to authenticated
using (
  public.can_manage_branch(branch_id)
  or public.can_manage_warehouse(warehouse_id)
);

drop policy if exists "members can manage dispatch requests" on public.dispatch_requests;
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

drop policy if exists "members can read dispatch request items" on public.dispatch_request_items;
create policy "members can read dispatch request items"
on public.dispatch_request_items for select to authenticated
using (
  exists (
    select 1 from public.dispatch_requests dr
    where dr.id = dispatch_request_items.dispatch_request_id
      and (public.can_manage_branch(dr.branch_id) or public.can_manage_warehouse(dr.warehouse_id))
  )
);

drop policy if exists "members can manage dispatch request items" on public.dispatch_request_items;
create policy "members can manage dispatch request items"
on public.dispatch_request_items for all to authenticated
using (
  exists (
    select 1 from public.dispatch_requests dr
    where dr.id = dispatch_request_items.dispatch_request_id
      and (public.can_manage_branch(dr.branch_id) or public.can_manage_warehouse(dr.warehouse_id))
  )
)
with check (
  exists (
    select 1 from public.dispatch_requests dr
    where dr.id = dispatch_request_items.dispatch_request_id
      and (public.can_manage_branch(dr.branch_id) or public.can_manage_warehouse(dr.warehouse_id))
  )
);

drop policy if exists "members can read dispatches" on public.dispatches;
create policy "members can read dispatches"
on public.dispatches for select to authenticated
using (
  public.can_manage_warehouse(warehouse_id)
  or public.can_manage_branch(branch_id)
);

drop policy if exists "members can manage dispatches" on public.dispatches;
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

drop policy if exists "members can read dispatch items" on public.dispatch_items;
create policy "members can read dispatch items"
on public.dispatch_items for select to authenticated
using (
  exists (
    select 1 from public.dispatches d
    where d.id = dispatch_items.dispatch_id
      and (public.can_manage_warehouse(d.warehouse_id) or public.can_manage_branch(d.branch_id))
  )
);

drop policy if exists "members can manage dispatch items" on public.dispatch_items;
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

drop policy if exists "members can read formulas" on public.formulas;
create policy "members can read formulas"
on public.formulas for select to authenticated
using (public.can_manage_branch(branch_id));

drop policy if exists "members can manage formulas" on public.formulas;
create policy "members can manage formulas"
on public.formulas for all to authenticated
using (public.can_manage_branch(branch_id))
with check (public.can_manage_branch(branch_id));

drop policy if exists "members can read formula ingredients" on public.formula_ingredients;
create policy "members can read formula ingredients"
on public.formula_ingredients for select to authenticated
using (
  exists (
    select 1 from public.formulas f
    where f.id = formula_ingredients.formula_id
      and public.can_manage_branch(f.branch_id)
  )
);

drop policy if exists "members can manage formula ingredients" on public.formula_ingredients;
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

drop policy if exists "members can read formula options" on public.formula_options;
create policy "members can read formula options"
on public.formula_options for select to authenticated
using (
  exists (
    select 1 from public.formulas f
    where f.id = formula_options.formula_id
      and public.can_manage_branch(f.branch_id)
  )
);

drop policy if exists "members can manage formula options" on public.formula_options;
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

