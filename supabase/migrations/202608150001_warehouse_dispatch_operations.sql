-- Operacion bodega -> sedes: solicitudes, despacho y recepcion atomica.

alter table public.inventory_movements
  add column if not exists warehouse_id text references public.warehouses(id) on delete set null;

alter table public.inventory_movements
  alter column branch_id drop not null;

create table if not exists public.supplier_items (
  id text primary key,
  supplier_id text not null references public.suppliers(id) on delete cascade,
  item_id text not null references public.inventory_items(id) on delete cascade,
  unit_cost numeric not null default 0,
  lead_time_days integer not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (supplier_id, item_id)
);

drop trigger if exists set_supplier_items_updated_at on public.supplier_items;
create trigger set_supplier_items_updated_at
before update on public.supplier_items
for each row execute function public.set_updated_at();

alter table public.supplier_items enable row level security;
grant select, insert, update, delete on public.supplier_items to authenticated, service_role;

drop policy if exists "members can read supplier items" on public.supplier_items;
create policy "members can read supplier items"
on public.supplier_items for select to authenticated
using (
  exists (
    select 1
    from public.suppliers s
    where s.id = supplier_items.supplier_id
      and public.can_manage_brand(s.brand_id)
  )
);

drop policy if exists "members can manage supplier items" on public.supplier_items;
create policy "members can manage supplier items"
on public.supplier_items for all to authenticated
using (
  exists (
    select 1
    from public.suppliers s
    where s.id = supplier_items.supplier_id
      and public.can_manage_brand(s.brand_id)
  )
)
with check (
  exists (
    select 1
    from public.suppliers s
    where s.id = supplier_items.supplier_id
      and public.can_manage_brand(s.brand_id)
  )
);

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
      or exists (
        select 1
        from public.multibrand_members m
        join public.branches b on b.id = p_branch_id
        where m.user_id = auth.uid()
          and (
            (m.role in ('branch_admin', 'cashier') and m.branch_id = p_branch_id)
            or (m.role = 'warehouse_admin' and m.warehouse_id = b.warehouse_id)
            or (m.role = 'superadmin' and m.brand_id = b.brand_id)
          )
      )
    );
$$;

create or replace function public.can_manage_warehouse(p_warehouse_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.role() = 'authenticated'
    and exists (
      select 1
      from public.multibrand_members m
      join public.warehouses w on w.id = p_warehouse_id
      where m.user_id = auth.uid()
        and (
          (m.role = 'warehouse_admin' and m.warehouse_id = p_warehouse_id)
          or (m.role = 'superadmin' and m.brand_id = w.brand_id)
        )
    );
$$;

create or replace function public.can_operate_branch(p_branch_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.role() = 'authenticated'
    and (
      exists (
        select 1
        from public.branch_members bm
        where bm.user_id = auth.uid()
          and bm.branch_id = p_branch_id
          and bm.role in ('owner', 'admin')
      )
      or exists (
        select 1
        from public.multibrand_members m
        join public.branches b on b.id = p_branch_id
        where m.user_id = auth.uid()
          and (
            (m.role in ('branch_admin', 'cashier') and m.branch_id = p_branch_id)
            or (m.role = 'superadmin' and m.brand_id = b.brand_id)
          )
      )
    );
$$;

drop policy if exists "members can read warehouses" on public.warehouses;
create policy "members can read warehouses"
on public.warehouses for select to authenticated
using (
  public.can_manage_warehouse(id)
  or exists (
    select 1
    from public.branches b
    where b.warehouse_id = warehouses.id
      and public.can_manage_branch(b.id)
  )
);

drop policy if exists "authenticated can read inventory stock" on public.branch_stock;
drop policy if exists "authenticated can manage inventory stock" on public.branch_stock;
drop policy if exists "members can read branch stock" on public.branch_stock;
create policy "members can read branch stock"
on public.branch_stock for select to authenticated
using (public.can_manage_branch(branch_id));

drop policy if exists "members can manage branch stock" on public.branch_stock;
create policy "members can manage branch stock"
on public.branch_stock for all to authenticated
using (public.can_operate_branch(branch_id))
with check (public.can_operate_branch(branch_id));

drop policy if exists "members can read warehouse stock" on public.warehouse_stock;
create policy "members can read warehouse stock"
on public.warehouse_stock for select to authenticated
using (
  public.can_manage_warehouse(warehouse_id)
  or exists (
    select 1
    from public.branches b
    where b.warehouse_id = warehouse_stock.warehouse_id
      and public.can_manage_branch(b.id)
  )
);

drop policy if exists "members can manage warehouse stock" on public.warehouse_stock;
create policy "members can manage warehouse stock"
on public.warehouse_stock for all to authenticated
using (public.can_manage_warehouse(warehouse_id))
with check (public.can_manage_warehouse(warehouse_id));

drop policy if exists "authenticated can read inventory movements" on public.inventory_movements;
drop policy if exists "authenticated can manage inventory movements" on public.inventory_movements;
create policy "members can read inventory movements"
on public.inventory_movements for select to authenticated
using (
  public.can_manage_branch(branch_id)
  or (warehouse_id is not null and public.can_manage_warehouse(warehouse_id))
);

create policy "members can manage inventory movements"
on public.inventory_movements for all to authenticated
using (
  public.can_operate_branch(branch_id)
  or (warehouse_id is not null and public.can_manage_warehouse(warehouse_id))
)
with check (
  public.can_operate_branch(branch_id)
  or (warehouse_id is not null and public.can_manage_warehouse(warehouse_id))
);

insert into public.brands (id, name, slug)
values ('brasas-sazon-brand', 'Brasas & Sazon', 'brasas-sazon')
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  updated_at = now();

insert into public.warehouses (id, brand_id, name, address)
values ('brasas-central', 'brasas-sazon-brand', 'Bodega Central Brasas', 'Bodega central')
on conflict (id) do update set
  brand_id = excluded.brand_id,
  name = excluded.name,
  address = excluded.address,
  updated_at = now();

insert into public.branches (
  id,
  brand_id,
  warehouse_id,
  name,
  short_name,
  whatsapp_number,
  location,
  headline,
  description,
  fulfillment_modes,
  qr_slug
)
values (
  'brasas-sazon',
  'brasas-sazon-brand',
  'brasas-central',
  'Brasas & Sazon',
  'Brasas',
  '573000000000',
  'Sede Principal',
  'Menu de Brasas & Sazon',
  'Sede principal para validar pedidos e inventario operativo.',
  array['pickup', 'local_delivery', 'didi_food', 'table'],
  'brasas-sazon'
)
on conflict (id) do update set
  brand_id = coalesce(public.branches.brand_id, excluded.brand_id),
  warehouse_id = coalesce(public.branches.warehouse_id, excluded.warehouse_id),
  qr_slug = coalesce(public.branches.qr_slug, excluded.qr_slug),
  updated_at = now();

update public.branches
set brand_id = coalesce(brand_id, 'brasas-sazon-brand'),
    warehouse_id = coalesce(warehouse_id, 'brasas-central'),
    qr_slug = coalesce(qr_slug, 'brasas-sazon')
where id = 'brasas-sazon';

insert into public.branches (
  id,
  brand_id,
  warehouse_id,
  name,
  short_name,
  whatsapp_number,
  location,
  headline,
  description,
  fulfillment_modes,
  qr_slug
)
values (
  'brasas-sazon-norte',
  'brasas-sazon-brand',
  'brasas-central',
  'Brasas & Sazon Norte',
  'Sede Norte',
  '573000000000',
  'Sede Norte',
  'Pedidos de la Sede Norte',
  'Sede de demostracion para validar abastecimiento desde bodega central.',
  array['pickup', 'local_delivery'],
  'brasas-sazon-norte'
)
on conflict (id) do update set
  brand_id = excluded.brand_id,
  warehouse_id = excluded.warehouse_id,
  name = excluded.name,
  short_name = excluded.short_name,
  location = excluded.location,
  headline = excluded.headline,
  description = excluded.description,
  fulfillment_modes = excluded.fulfillment_modes,
  qr_slug = excluded.qr_slug,
  updated_at = now();

insert into public.multibrand_members (id, user_id, brand_id, warehouse_id, branch_id, role)
select
  'mb_' || md5(bm.user_id::text || ':' || bm.branch_id || ':ops'),
  bm.user_id,
  b.brand_id,
  b.warehouse_id,
  bm.branch_id,
  case when bm.role in ('owner', 'admin') then 'branch_admin' else 'cashier' end
from public.branch_members bm
join public.branches b on b.id = bm.branch_id
where b.warehouse_id is not null
on conflict (id) do nothing;

insert into public.inventory_items (id, branch_id, brand_id, name, unit, category)
values
  ('pollo-entero', 'brasas-sazon', 'brasas-sazon-brand', 'Pollo entero', 'unidad', 'Carnes'),
  ('papa-criolla', 'brasas-sazon', 'brasas-sazon-brand', 'Papa criolla', 'kg', 'Verduras'),
  ('arroz', 'brasas-sazon', 'brasas-sazon-brand', 'Arroz', 'kg', 'Granos'),
  ('limon', 'brasas-sazon', 'brasas-sazon-brand', 'Limon', 'kg', 'Frutas'),
  ('carbon', 'brasas-sazon', 'brasas-sazon-brand', 'Carbon', 'bolsa', 'Insumos')
on conflict (id) do update set
  brand_id = excluded.brand_id,
  name = excluded.name,
  unit = excluded.unit,
  category = excluded.category,
  updated_at = now();

insert into public.warehouse_stock (id, warehouse_id, item_id, quantity)
values
  ('wstk_brasas_pollo', 'brasas-central', 'pollo-entero', 120),
  ('wstk_brasas_papa', 'brasas-central', 'papa-criolla', 180),
  ('wstk_brasas_arroz', 'brasas-central', 'arroz', 240),
  ('wstk_brasas_limon', 'brasas-central', 'limon', 90),
  ('wstk_brasas_carbon', 'brasas-central', 'carbon', 40)
on conflict (warehouse_id, item_id) do update set
  quantity = greatest(public.warehouse_stock.quantity, excluded.quantity),
  updated_at = now();

insert into public.branch_stock (id, branch_id, item_id, quantity)
values
  ('bstk_brasas_pollo', 'brasas-sazon', 'pollo-entero', 28),
  ('bstk_brasas_papa', 'brasas-sazon', 'papa-criolla', 45),
  ('bstk_brasas_arroz', 'brasas-sazon', 'arroz', 70),
  ('bstk_brasas_limon', 'brasas-sazon', 'limon', 18),
  ('bstk_brasas_carbon', 'brasas-sazon', 'carbon', 12),
  ('bstk_norte_pollo', 'brasas-sazon-norte', 'pollo-entero', 12),
  ('bstk_norte_papa', 'brasas-sazon-norte', 'papa-criolla', 25),
  ('bstk_norte_arroz', 'brasas-sazon-norte', 'arroz', 32),
  ('bstk_norte_limon', 'brasas-sazon-norte', 'limon', 8),
  ('bstk_norte_carbon', 'brasas-sazon-norte', 'carbon', 5)
on conflict (branch_id, item_id) do update set
  quantity = greatest(public.branch_stock.quantity, excluded.quantity),
  updated_at = now();

insert into public.suppliers (id, brand_id, name, contact_name, phone, tax_id, terms, active)
values
  ('sup_pollo_andino', 'brasas-sazon-brand', 'Avicola Andina', 'Laura Perez', '573112223344', '900111222-1', 'Entrega lunes, miercoles y viernes. Pago a 15 dias.', true),
  ('sup_agro_norte', 'brasas-sazon-brand', 'Agro Norte Mayorista', 'Jorge Castillo', '573155556666', '900333444-5', 'Verduras y granos con corte diario hasta 10am.', true),
  ('sup_insumos_fogon', 'brasas-sazon-brand', 'Insumos El Fogon', 'Diana Rojas', '573177778888', '900555666-7', 'Carbon, empaques y consumibles. Pago contra entrega.', true)
on conflict (id) do update set
  brand_id = excluded.brand_id,
  name = excluded.name,
  contact_name = excluded.contact_name,
  phone = excluded.phone,
  tax_id = excluded.tax_id,
  terms = excluded.terms,
  active = excluded.active,
  updated_at = now();

insert into public.supplier_items (id, supplier_id, item_id, unit_cost, lead_time_days, active)
values
  ('supi_pollo_andino_pollo', 'sup_pollo_andino', 'pollo-entero', 24000, 1, true),
  ('supi_agro_norte_papa', 'sup_agro_norte', 'papa-criolla', 2200, 1, true),
  ('supi_agro_norte_limon', 'sup_agro_norte', 'limon', 3200, 1, true),
  ('supi_agro_norte_arroz', 'sup_agro_norte', 'arroz', 2800, 2, true),
  ('supi_fogon_carbon', 'sup_insumos_fogon', 'carbon', 14000, 1, true)
on conflict (supplier_id, item_id) do update set
  unit_cost = excluded.unit_cost,
  lead_time_days = excluded.lead_time_days,
  active = excluded.active,
  updated_at = now();

insert into public.purchase_orders (id, warehouse_id, supplier_id, status, total_cost, notes, created_by, created_at)
values
  ('po_demo_pollo_semana', 'brasas-central', 'sup_pollo_andino', 'sent', 2160000, 'Pedido abierto para cubrir fin de semana y solicitudes de sedes.', 'seed', now() - interval '6 hours'),
  ('po_demo_carbon_recibido', 'brasas-central', 'sup_insumos_fogon', 'received', 280000, 'Compra ya recibida para mantener stock base de carbon.', 'seed', now() - interval '2 days')
on conflict (id) do update set
  warehouse_id = excluded.warehouse_id,
  supplier_id = excluded.supplier_id,
  status = excluded.status,
  total_cost = excluded.total_cost,
  notes = excluded.notes,
  updated_at = now();

insert into public.purchase_order_items (id, purchase_order_id, item_id, quantity, unit_cost)
values
  ('poi_demo_pollo_semana', 'po_demo_pollo_semana', 'pollo-entero', 90, 24000),
  ('poi_demo_carbon_recibido', 'po_demo_carbon_recibido', 'carbon', 20, 14000)
on conflict (id) do update set
  purchase_order_id = excluded.purchase_order_id,
  item_id = excluded.item_id,
  quantity = excluded.quantity,
  unit_cost = excluded.unit_cost;

insert into public.dispatch_requests (id, branch_id, warehouse_id, status, requested_by, notes, created_at)
values
  ('drq_demo_principal_papa', 'brasas-sazon', 'brasas-central', 'pending', 'seed', 'Sede Principal solicita papa y limon para turno de almuerzo.', now() - interval '50 minutes'),
  ('drq_demo_norte_pollo', 'brasas-sazon-norte', 'brasas-central', 'approved', 'seed', 'Sede Norte solicita pollo para cubrir pedidos de la tarde.', now() - interval '35 minutes'),
  ('drq_demo_norte_carbon', 'brasas-sazon-norte', 'brasas-central', 'dispatched', 'seed', 'Carbon despachado hacia Sede Norte.', now() - interval '2 hours')
on conflict (id) do update set
  branch_id = excluded.branch_id,
  warehouse_id = excluded.warehouse_id,
  status = excluded.status,
  requested_by = excluded.requested_by,
  notes = excluded.notes,
  updated_at = now();

insert into public.dispatch_request_items (id, dispatch_request_id, item_id, quantity)
values
  ('dri_demo_principal_papa', 'drq_demo_principal_papa', 'papa-criolla', 12),
  ('dri_demo_principal_limon', 'drq_demo_principal_papa', 'limon', 4),
  ('dri_demo_norte_pollo', 'drq_demo_norte_pollo', 'pollo-entero', 16),
  ('dri_demo_norte_carbon', 'drq_demo_norte_carbon', 'carbon', 4)
on conflict (id) do update set
  dispatch_request_id = excluded.dispatch_request_id,
  item_id = excluded.item_id,
  quantity = excluded.quantity;

insert into public.dispatches (id, warehouse_id, branch_id, dispatch_request_id, status, created_by, created_at)
values (
  'dsp_demo_norte_carbon',
  'brasas-central',
  'brasas-sazon-norte',
  'drq_demo_norte_carbon',
  'shipped',
  'seed',
  now() - interval '90 minutes'
)
on conflict (id) do update set
  warehouse_id = excluded.warehouse_id,
  branch_id = excluded.branch_id,
  dispatch_request_id = excluded.dispatch_request_id,
  status = excluded.status,
  updated_at = now();

insert into public.dispatch_items (id, dispatch_id, item_id, quantity)
values ('di_demo_norte_carbon', 'dsp_demo_norte_carbon', 'carbon', 4)
on conflict (id) do update set
  dispatch_id = excluded.dispatch_id,
  item_id = excluded.item_id,
  quantity = excluded.quantity;

update public.warehouse_stock
set quantity = greatest(quantity - 4, 0),
    updated_at = now()
where warehouse_id = 'brasas-central'
  and item_id = 'carbon'
  and exists (select 1 from public.dispatches where id = 'dsp_demo_norte_carbon');

insert into public.inventory_movements (
  id, branch_id, warehouse_id, item_id, quantity, movement_type, reason, reference_id, created_by
) values (
  'im_demo_dispatch_norte_carbon',
  'brasas-sazon-norte',
  'brasas-central',
  'carbon',
  -4,
  'despacho',
  'demo_despacho_bodega',
  'drq_demo_norte_carbon',
  'seed'
)
on conflict (id) do nothing;

insert into public.formulas (id, branch_id, product_id, active)
select 'formula_brasas_pollo_entero', 'brasas-sazon', 'pollo-entero', true
where exists (select 1 from public.products where id = 'pollo-entero' and branch_id = 'brasas-sazon')
on conflict (branch_id, product_id) do update set active = true, updated_at = now();

insert into public.formula_ingredients (id, formula_id, item_id, quantity_per_unit, merma_percent)
select 'fing_brasas_pollo_entero', 'formula_brasas_pollo_entero', 'pollo-entero', 1, 0
where exists (select 1 from public.formulas where id = 'formula_brasas_pollo_entero')
on conflict (formula_id, item_id) do update set
  quantity_per_unit = excluded.quantity_per_unit,
  merma_percent = excluded.merma_percent;

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

drop function if exists public.create_dispatch_request(text, text, jsonb, text, text);
create or replace function public.create_dispatch_request(
  p_branch_id text,
  p_warehouse_id text,
  p_items jsonb,
  p_notes text default null,
  p_requested_by text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id text := gen_random_uuid()::text;
  v_item jsonb;
  v_item_id text;
  v_quantity numeric;
  v_branch_warehouse_id text;
begin
  if not public.can_operate_branch(p_branch_id) then
    raise exception 'No tienes permiso para solicitar inventario para esta sede.';
  end if;

  select warehouse_id into v_branch_warehouse_id
  from public.branches
  where id = p_branch_id;

  if v_branch_warehouse_id is null then
    raise exception 'La sede no tiene bodega asignada.';
  end if;

  if v_branch_warehouse_id <> p_warehouse_id then
    raise exception 'La bodega no corresponde a la sede.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La solicitud debe incluir al menos un insumo.';
  end if;

  insert into public.dispatch_requests (id, branch_id, warehouse_id, status, requested_by, notes)
  values (v_request_id, p_branch_id, p_warehouse_id, 'pending', p_requested_by, nullif(trim(coalesce(p_notes, '')), ''));

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_item_id := v_item ->> 'item_id';
    v_quantity := nullif(v_item ->> 'quantity', '')::numeric;

    if v_item_id is null or v_quantity is null or v_quantity <= 0 then
      raise exception 'Cada insumo solicitado debe tener cantidad mayor a cero.';
    end if;

    if not exists (select 1 from public.inventory_items where id = v_item_id) then
      raise exception 'El insumo % no existe.', v_item_id;
    end if;

    insert into public.dispatch_request_items (id, dispatch_request_id, item_id, quantity)
    values (gen_random_uuid()::text, v_request_id, v_item_id, v_quantity);
  end loop;

  return v_request_id;
end;
$$;

drop function if exists public.dispatch_request(text, text);
create or replace function public.dispatch_request(
  p_dispatch_request_id text,
  p_created_by text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.dispatch_requests%rowtype;
  v_dispatch_id text := gen_random_uuid()::text;
  v_item record;
  v_stock_quantity numeric;
begin
  select * into v_request
  from public.dispatch_requests
  where id = p_dispatch_request_id
  for update;

  if not found then
    raise exception 'Solicitud de despacho no encontrada.';
  end if;

  if not public.can_manage_warehouse(v_request.warehouse_id) then
    raise exception 'No tienes permiso para despachar desde esta bodega.';
  end if;

  if v_request.status not in ('pending', 'approved') then
    raise exception 'Solo se pueden despachar solicitudes pendientes o aprobadas.';
  end if;

  for v_item in
    select item_id, sum(quantity) as quantity
    from public.dispatch_request_items
    where dispatch_request_id = p_dispatch_request_id
    group by item_id
  loop
    select quantity into v_stock_quantity
    from public.warehouse_stock
    where warehouse_id = v_request.warehouse_id and item_id = v_item.item_id
    for update;

    if coalesce(v_stock_quantity, 0) < v_item.quantity then
      raise exception 'Stock insuficiente en bodega para el insumo %.', v_item.item_id;
    end if;
  end loop;

  insert into public.dispatches (id, warehouse_id, branch_id, dispatch_request_id, status, created_by)
  values (v_dispatch_id, v_request.warehouse_id, v_request.branch_id, v_request.id, 'shipped', p_created_by);

  for v_item in
    select item_id, sum(quantity) as quantity
    from public.dispatch_request_items
    where dispatch_request_id = p_dispatch_request_id
    group by item_id
  loop
    update public.warehouse_stock
    set quantity = quantity - v_item.quantity,
        updated_at = now()
    where warehouse_id = v_request.warehouse_id and item_id = v_item.item_id;

    insert into public.dispatch_items (id, dispatch_id, item_id, quantity)
    values (gen_random_uuid()::text, v_dispatch_id, v_item.item_id, v_item.quantity);

    insert into public.inventory_movements (
      id, branch_id, warehouse_id, item_id, quantity, movement_type, reason, reference_id, created_by
    ) values (
      gen_random_uuid()::text,
      v_request.branch_id,
      v_request.warehouse_id,
      v_item.item_id,
      -v_item.quantity,
      'despacho',
      'solicitud_bodega',
      v_request.id,
      p_created_by
    );
  end loop;

  update public.dispatch_requests
  set status = 'dispatched',
      updated_at = now()
  where id = v_request.id;

  return v_dispatch_id;
end;
$$;

drop function if exists public.receive_dispatch(text, text);
create or replace function public.receive_dispatch(
  p_dispatch_id text,
  p_received_by text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dispatch public.dispatches%rowtype;
  v_item record;
begin
  select * into v_dispatch
  from public.dispatches
  where id = p_dispatch_id
  for update;

  if not found then
    raise exception 'Despacho no encontrado.';
  end if;

  if not public.can_operate_branch(v_dispatch.branch_id) then
    raise exception 'No tienes permiso para recibir inventario en esta sede.';
  end if;

  if v_dispatch.status <> 'shipped' then
    raise exception 'Solo se pueden recibir despachos enviados.';
  end if;

  for v_item in
    select item_id, sum(quantity) as quantity
    from public.dispatch_items
    where dispatch_id = p_dispatch_id
    group by item_id
  loop
    insert into public.branch_stock (id, branch_id, item_id, quantity)
    values (gen_random_uuid()::text, v_dispatch.branch_id, v_item.item_id, v_item.quantity)
    on conflict (branch_id, item_id) do update set
      quantity = public.branch_stock.quantity + excluded.quantity,
      updated_at = now();

    insert into public.inventory_movements (
      id, branch_id, warehouse_id, item_id, quantity, movement_type, reason, reference_id, created_by
    ) values (
      gen_random_uuid()::text,
      v_dispatch.branch_id,
      v_dispatch.warehouse_id,
      v_item.item_id,
      v_item.quantity,
      'recepcion',
      'recepcion_bodega',
      v_dispatch.id,
      p_received_by
    );
  end loop;

  update public.dispatches
  set status = 'received',
      updated_at = now()
  where id = v_dispatch.id;

  if v_dispatch.dispatch_request_id is not null then
    update public.dispatch_requests
    set status = 'received',
        updated_at = now()
    where id = v_dispatch.dispatch_request_id;
  end if;
end;
$$;

grant execute on function public.create_dispatch_request(text, text, jsonb, text, text) to authenticated;
grant execute on function public.dispatch_request(text, text) to authenticated;
grant execute on function public.receive_dispatch(text, text) to authenticated;

drop function if exists public.create_purchase_order(text, text, jsonb, text, text);
create or replace function public.create_purchase_order(
  p_warehouse_id text,
  p_supplier_id text,
  p_items jsonb,
  p_notes text default null,
  p_created_by text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id text := gen_random_uuid()::text;
  v_item jsonb;
  v_item_id text;
  v_quantity numeric;
  v_unit_cost numeric;
  v_total numeric := 0;
  v_warehouse_brand_id text;
begin
  if not public.can_manage_warehouse(p_warehouse_id) then
    raise exception 'No tienes permiso para comprar desde esta bodega.';
  end if;

  select brand_id into v_warehouse_brand_id
  from public.warehouses
  where id = p_warehouse_id;

  if v_warehouse_brand_id is null then
    raise exception 'Bodega no encontrada.';
  end if;

  if not exists (
    select 1
    from public.suppliers
    where id = p_supplier_id
      and brand_id = v_warehouse_brand_id
      and active
  ) then
    raise exception 'Proveedor no disponible para esta bodega.';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La orden debe incluir al menos un insumo.';
  end if;

  insert into public.purchase_orders (id, warehouse_id, supplier_id, status, total_cost, notes, created_by)
  values (v_order_id, p_warehouse_id, p_supplier_id, 'sent', 0, nullif(trim(coalesce(p_notes, '')), ''), p_created_by);

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_item_id := v_item->>'item_id';
    v_quantity := coalesce((v_item->>'quantity')::numeric, 0);
    v_unit_cost := coalesce((v_item->>'unit_cost')::numeric, 0);

    if v_item_id is null or v_quantity <= 0 then
      raise exception 'Cada insumo debe tener cantidad mayor a cero.';
    end if;

    if not exists (
      select 1
      from public.inventory_items
      where id = v_item_id
        and (brand_id = v_warehouse_brand_id or brand_id is null)
    ) then
      raise exception 'El insumo % no pertenece a esta marca.', v_item_id;
    end if;

    v_total := v_total + (v_quantity * v_unit_cost);

    insert into public.purchase_order_items (id, purchase_order_id, item_id, quantity, unit_cost)
    values (gen_random_uuid()::text, v_order_id, v_item_id, v_quantity, v_unit_cost);
  end loop;

  update public.purchase_orders
  set total_cost = v_total,
      updated_at = now()
  where id = v_order_id;

  return v_order_id;
end;
$$;

drop function if exists public.receive_purchase_order(text, text);
create or replace function public.receive_purchase_order(
  p_purchase_order_id text,
  p_received_by text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.purchase_orders%rowtype;
  v_item record;
begin
  select * into v_order
  from public.purchase_orders
  where id = p_purchase_order_id
  for update;

  if not found then
    raise exception 'Orden de compra no encontrada.';
  end if;

  if not public.can_manage_warehouse(v_order.warehouse_id) then
    raise exception 'No tienes permiso para recibir compras en esta bodega.';
  end if;

  if v_order.status not in ('draft', 'sent') then
    raise exception 'Solo se pueden recibir ordenes abiertas.';
  end if;

  for v_item in
    select item_id, sum(quantity) as quantity
    from public.purchase_order_items
    where purchase_order_id = p_purchase_order_id
    group by item_id
  loop
    insert into public.warehouse_stock (id, warehouse_id, item_id, quantity)
    values (gen_random_uuid()::text, v_order.warehouse_id, v_item.item_id, v_item.quantity)
    on conflict (warehouse_id, item_id) do update set
      quantity = public.warehouse_stock.quantity + excluded.quantity,
      updated_at = now();

    insert into public.inventory_movements (
      id, branch_id, warehouse_id, item_id, quantity, movement_type, reason, reference_id, created_by
    ) values (
      gen_random_uuid()::text,
      null,
      v_order.warehouse_id,
      v_item.item_id,
      v_item.quantity,
      'compra',
      'proveedor:' || coalesce(v_order.supplier_id, 'sin_proveedor'),
      v_order.id,
      p_received_by
    );
  end loop;

  update public.purchase_orders
  set status = 'received',
      updated_at = now()
  where id = v_order.id;
end;
$$;

grant execute on function public.create_purchase_order(text, text, jsonb, text, text) to authenticated;
grant execute on function public.receive_purchase_order(text, text) to authenticated;

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
  if not public.can_operate_branch(p_branch_id) then
    raise exception 'No tienes permiso para registrar merma en esta sede.';
  end if;

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
  if not public.can_operate_branch(p_branch_id) then
    raise exception 'No tienes permiso para registrar ventas en esta sede.';
  end if;

  if p_quantity <= 0 then
    raise exception 'La cantidad debe ser mayor a cero.';
  end if;

  select id into v_formula_id
  from public.formulas
  where branch_id = p_branch_id and product_id = p_product_id and active
  limit 1;

  if v_formula_id is null then
    raise exception 'No existe formula activa para el producto en esta sede.';
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

grant execute on function public.can_operate_branch(text) to authenticated;
grant execute on function public.register_merma(text, text, numeric, text, text) to authenticated;
grant execute on function public.sell_product(text, text, numeric, text[], text) to authenticated;

grant select, insert, update, delete on public.suppliers to authenticated, service_role;
grant select, insert, update, delete on public.supplier_items to authenticated, service_role;
grant select, insert, update, delete on public.purchase_orders to authenticated, service_role;
grant select, insert, update, delete on public.purchase_order_items to authenticated, service_role;
grant select, insert, update, delete on public.warehouse_stock to authenticated, service_role;
grant select, insert, update, delete on public.branch_members to service_role;
grant select, insert, update, delete on public.multibrand_members to service_role;
