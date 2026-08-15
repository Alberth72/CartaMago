-- Operacion bodega -> sedes: solicitudes, despacho y recepcion atomica.

alter table public.inventory_movements
  add column if not exists warehouse_id text references public.warehouses(id) on delete set null;

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
      or exists (
        select 1
        from public.multibrand_members m
        join public.branches b on b.id = p_branch_id
        where m.user_id = auth.uid()
          and (
            m.branch_id = p_branch_id
            or (m.warehouse_id is not null and m.warehouse_id = b.warehouse_id)
            or (m.brand_id is not null and m.brand_id = b.brand_id)
          )
      )
    );
$$;

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
  if not public.can_manage_branch(p_branch_id) then
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

  if not public.can_manage_branch(v_dispatch.branch_id) then
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
