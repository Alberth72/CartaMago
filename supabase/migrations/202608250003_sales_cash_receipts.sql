-- Ventas operativas sin DIAN:
-- venta -> pago manual -> descuento de inventario por formula -> comprobante interno.

create table if not exists public.cash_sessions (
  id text primary key,
  branch_id text not null references public.branches(id) on delete cascade,
  opened_by uuid references auth.users(id) on delete set null,
  closed_by uuid references auth.users(id) on delete set null,
  name text not null default 'Caja principal',
  access_token text not null default ('cs_' || replace(gen_random_uuid()::text, '-', '')),
  token_revoked_at timestamptz,
  status text not null default 'open' check (status in ('open', 'closed')),
  opening_cash_cop integer not null default 0,
  closing_cash_cop integer,
  expected_cash_cop integer,
  notes text,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales (
  id text primary key,
  branch_id text not null references public.branches(id) on delete cascade,
  cash_session_id text references public.cash_sessions(id) on delete set null,
  order_id text references public.orders(id) on delete set null,
  cashier_user_id uuid references auth.users(id) on delete set null,
  source text not null default 'admin_pos' check (source in ('admin_pos', 'cash_terminal', 'qr_order', 'manual')),
  status text not null default 'completed' check (status in ('completed', 'cancelled', 'refunded')),
  payment_status text not null default 'paid' check (payment_status in ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
  subtotal_cop integer not null default 0,
  total_cop integer not null default 0,
  receipt_number text not null,
  sold_at timestamptz not null default now(),
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sale_items (
  id text primary key,
  sale_id text not null references public.sales(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  quantity numeric not null check (quantity > 0),
  unit_price_cop integer not null check (unit_price_cop >= 0),
  line_total_cop integer not null check (line_total_cop >= 0),
  sort_order integer not null default 0
);

create table if not exists public.sale_payments (
  id text primary key,
  sale_id text not null references public.sales(id) on delete cascade,
  payment_method text not null check (payment_method in ('cash', 'card_at_counter', 'card_at_table', 'bank_transfer', 'wompi', 'didi_food')),
  payment_provider text not null default 'manual' check (payment_provider in ('manual', 'wompi', 'didi_food')),
  payment_status text not null default 'paid' check (payment_status in ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
  amount_cop integer not null check (amount_cop >= 0),
  reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.sale_receipts (
  id text primary key,
  sale_id text not null unique references public.sales(id) on delete cascade,
  branch_id text not null references public.branches(id) on delete cascade,
  receipt_number text not null,
  status text not null default 'issued' check (status in ('issued', 'cancelled')),
  total_cop integer not null,
  payload jsonb not null default '{}'::jsonb,
  issued_at timestamptz not null default now()
);

create unique index if not exists sales_branch_receipt_number_key
  on public.sales (branch_id, receipt_number);

create unique index if not exists cash_sessions_access_token_key
  on public.cash_sessions (access_token);

create index if not exists sales_branch_sold_at_idx
  on public.sales (branch_id, sold_at desc);

create index if not exists sales_order_id_idx
  on public.sales (order_id);

create index if not exists sale_payments_sale_idx
  on public.sale_payments (sale_id);

alter table public.orders
  drop constraint if exists orders_order_channel_check;

alter table public.orders
  add constraint orders_order_channel_check
  check (order_channel in ('cartamago', 'whatsapp', 'didi_food', 'cash_terminal', 'admin_pos'));

create index if not exists cash_sessions_branch_status_idx
  on public.cash_sessions (branch_id, status);

alter table public.cash_sessions enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.sale_payments enable row level security;
alter table public.sale_receipts enable row level security;

grant select, insert, update on public.cash_sessions to authenticated;
grant select, insert, update on public.sales to authenticated;
grant select, insert on public.sale_items to authenticated;
grant select, insert on public.sale_payments to authenticated;
grant select, insert, update on public.sale_receipts to authenticated;

drop policy if exists "members can manage cash sessions" on public.cash_sessions;
create policy "members can manage cash sessions"
on public.cash_sessions for all to authenticated
using (public.can_operate_branch(branch_id))
with check (public.can_operate_branch(branch_id));

drop policy if exists "members can read sales" on public.sales;
create policy "members can read sales"
on public.sales for select to authenticated
using (public.can_operate_branch(branch_id));

drop policy if exists "members can insert sales" on public.sales;
create policy "members can insert sales"
on public.sales for insert to authenticated
with check (public.can_operate_branch(branch_id));

drop policy if exists "members can read sale items" on public.sale_items;
create policy "members can read sale items"
on public.sale_items for select to authenticated
using (
  exists (
    select 1 from public.sales s
    where s.id = sale_items.sale_id
      and public.can_operate_branch(s.branch_id)
  )
);

drop policy if exists "members can read sale payments" on public.sale_payments;
create policy "members can read sale payments"
on public.sale_payments for select to authenticated
using (
  exists (
    select 1 from public.sales s
    where s.id = sale_payments.sale_id
      and public.can_operate_branch(s.branch_id)
  )
);

drop policy if exists "members can read sale receipts" on public.sale_receipts;
create policy "members can read sale receipts"
on public.sale_receipts for select to authenticated
using (public.can_operate_branch(branch_id));

drop trigger if exists set_cash_sessions_updated_at on public.cash_sessions;
create trigger set_cash_sessions_updated_at
before update on public.cash_sessions
for each row execute function public.set_updated_at();

drop trigger if exists set_sales_updated_at on public.sales;
create trigger set_sales_updated_at
before update on public.sales
for each row execute function public.set_updated_at();

create or replace function public.next_internal_receipt_number(p_branch_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date text := to_char(now(), 'YYYYMMDD');
  v_seq integer;
begin
  perform pg_advisory_xact_lock(hashtext('receipt:' || p_branch_id || ':' || v_date));

  select count(*) + 1 into v_seq
  from public.sales
  where branch_id = p_branch_id
    and receipt_number like upper(replace(p_branch_id, '-', '')) || '-' || v_date || '-%';

  return upper(replace(p_branch_id, '-', '')) || '-' || v_date || '-' || lpad(v_seq::text, 4, '0');
end;
$$;

create or replace function public.open_cash_session(
  p_branch_id text,
  p_opening_cash_cop integer default 0,
  p_notes text default null,
  p_name text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id text := gen_random_uuid()::text;
begin
  if not public.can_operate_branch(p_branch_id) then
    raise exception 'No tienes permiso para abrir caja en esta sede.';
  end if;

  insert into public.cash_sessions (
    id, branch_id, opened_by, name, opening_cash_cop, notes
  ) values (
    v_session_id,
    p_branch_id,
    auth.uid(),
    coalesce(nullif(trim(coalesce(p_name, '')), ''), 'Caja principal'),
    greatest(coalesce(p_opening_cash_cop, 0), 0),
    nullif(trim(coalesce(p_notes, '')), '')
  );

  return v_session_id;
end;
$$;

create or replace function public.close_cash_session(
  p_cash_session_id text,
  p_closing_cash_cop integer,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.cash_sessions%rowtype;
  v_cash_sales integer;
begin
  select * into v_session
  from public.cash_sessions
  where id = p_cash_session_id
  for update;

  if not found then
    raise exception 'Caja no encontrada.';
  end if;

  if not public.can_operate_branch(v_session.branch_id) then
    raise exception 'No tienes permiso para cerrar esta caja.';
  end if;

  if v_session.status <> 'open' then
    raise exception 'La caja ya esta cerrada.';
  end if;

  select coalesce(sum(sp.amount_cop), 0) into v_cash_sales
  from public.sale_payments sp
  join public.sales s on s.id = sp.sale_id
  where s.cash_session_id = p_cash_session_id
    and sp.payment_method = 'cash'
    and sp.payment_status = 'paid';

  update public.cash_sessions
  set status = 'closed',
      closed_by = auth.uid(),
      closing_cash_cop = greatest(coalesce(p_closing_cash_cop, 0), 0),
      expected_cash_cop = opening_cash_cop + v_cash_sales,
      notes = nullif(trim(coalesce(p_notes, notes, '')), ''),
      token_revoked_at = coalesce(token_revoked_at, now()),
      closed_at = now()
  where id = p_cash_session_id;
end;
$$;

create or replace function public.decrement_product_stock_for_sale(
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

create or replace function public.create_sale(
  p_branch_id text,
  p_product_id text default null,
  p_quantity numeric default null,
  p_payment_method text default 'cash',
  p_payment_reference text default null,
  p_cash_session_id text default null,
  p_created_by text default null,
  p_items jsonb default null,
  p_cash_session_access_token text default null,
  p_source text default 'admin_pos'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id text := gen_random_uuid()::text;
  v_payment_id text := gen_random_uuid()::text;
  v_receipt_id text := gen_random_uuid()::text;
  v_receipt_number text;
  v_items jsonb;
  v_item jsonb;
  v_product record;
  v_product_id text;
  v_quantity numeric;
  v_line_total integer;
  v_total integer := 0;
  v_payment_provider text := 'manual';
  v_payment_status text := 'paid';
  v_cash_session_id text := p_cash_session_id;
  v_sort_order integer := 0;
  v_receipt_items jsonb;
  v_order_id text := 'ord_' || replace(gen_random_uuid()::text, '-', '');
  v_tracking_token text := 'tk_' || replace(gen_random_uuid()::text, '-', '');
  v_total_items integer;
  v_order_channel text;
begin
  if p_source not in ('admin_pos', 'cash_terminal', 'qr_order', 'manual') then
    raise exception 'Origen de venta no soportado.';
  end if;

  if not public.can_operate_branch(p_branch_id)
    and not exists (
      select 1
      from public.cash_sessions cs
      where cs.id = p_cash_session_id
        and cs.branch_id = p_branch_id
        and cs.status = 'open'
        and cs.token_revoked_at is null
        and cs.access_token = p_cash_session_access_token
    )
  then
    raise exception 'No tienes permiso para vender en esta sede.';
  end if;

  if p_payment_method not in ('cash', 'card_at_counter', 'card_at_table', 'bank_transfer', 'wompi', 'didi_food') then
    raise exception 'Metodo de pago no soportado.';
  end if;

  if p_items is null then
    if p_product_id is null or p_quantity is null then
      raise exception 'Agrega al menos un producto a la venta.';
    end if;
    v_items := jsonb_build_array(jsonb_build_object('product_id', p_product_id, 'quantity', p_quantity));
  else
    v_items := p_items;
  end if;

  if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) = 0 then
    raise exception 'Agrega al menos un producto a la venta.';
  end if;

  if p_payment_method = 'wompi' then
    v_payment_provider := 'wompi';
    v_payment_status := 'pending';
  elsif p_payment_method = 'didi_food' then
    v_payment_provider := 'didi_food';
    v_payment_status := 'paid';
  end if;

  if v_cash_session_id is null then
    select id into v_cash_session_id
    from public.cash_sessions
    where branch_id = p_branch_id and status = 'open'
    order by opened_at desc
    limit 1;
  else
    if not exists (
      select 1 from public.cash_sessions
      where id = v_cash_session_id
        and branch_id = p_branch_id
        and status = 'open'
        and token_revoked_at is null
    ) then
      raise exception 'La caja seleccionada no esta abierta para esta sede.';
    end if;
  end if;

  drop table if exists tmp_sale_items;
  create temp table tmp_sale_items (
    product_id text,
    product_name text,
    quantity numeric,
    unit_price_cop integer,
    line_total_cop integer,
    sort_order integer
  ) on commit drop;

  for v_item in select value from jsonb_array_elements(v_items) as entries(value)
  loop
    v_sort_order := v_sort_order + 10;
    v_product_id := nullif(trim(coalesce(v_item->>'product_id', '')), '');
    v_quantity := coalesce(nullif(trim(coalesce(v_item->>'quantity', '')), ''), '0')::numeric;

    if v_product_id is null then
      raise exception 'Hay una linea sin producto.';
    end if;

    if v_quantity <= 0 then
      raise exception 'La cantidad vendida debe ser mayor a cero.';
    end if;

    if v_quantity <> trunc(v_quantity) then
      raise exception 'La bandeja de pedidos solo soporta cantidades enteras por ahora.';
    end if;

    select id, name, price_cop into v_product
    from public.products
    where id = v_product_id
      and branch_id = p_branch_id
      and available
    limit 1;

    if not found then
      raise exception 'Producto no disponible para la sede.';
    end if;

    if v_product.price_cop is null then
      raise exception 'El producto no tiene precio definido.';
    end if;

    v_line_total := round(v_product.price_cop * v_quantity)::integer;
    v_total := v_total + v_line_total;

    insert into tmp_sale_items (
      product_id, product_name, quantity, unit_price_cop, line_total_cop, sort_order
    ) values (
      v_product.id, v_product.name, v_quantity, v_product.price_cop, v_line_total, v_sort_order
    );

    -- Solo descuenta stock cuando el producto tiene formula activa.
    if exists (
      select 1 from public.formulas
      where branch_id = p_branch_id and product_id = v_product.id and active
    ) then
      perform public.decrement_product_stock_for_sale(p_branch_id, v_product.id, v_quantity, '{}'::text[], p_created_by);
    end if;
  end loop;

  v_receipt_number := public.next_internal_receipt_number(p_branch_id);
  v_order_channel := case
    when p_source in ('cash_terminal', 'admin_pos') then p_source
    when p_payment_method = 'didi_food' then 'didi_food'
    else 'cartamago'
  end;

  select coalesce(sum(quantity), 0)::integer into v_total_items
  from tmp_sale_items;

  insert into public.orders (
    id,
    branch_id,
    tracking_token,
    status,
    order_channel,
    delivery_provider,
    payment_status,
    payment_method,
    payment_provider,
    external_provider,
    external_order_id,
    external_status,
    external_payload,
    customer_name,
    customer_note,
    fulfillment_mode,
    delivery_address,
    table_number,
    total_items,
    total_cop,
    whatsapp_message,
    whatsapp_link
  ) values (
    v_order_id,
    p_branch_id,
    v_tracking_token,
    'confirmed',
    v_order_channel,
    'none',
    v_payment_status,
    p_payment_method,
    v_payment_provider,
    case when p_source in ('cash_terminal', 'admin_pos') then p_source else null end,
    v_receipt_number,
    'created_from_sale',
    jsonb_build_object(
      'saleId', v_sale_id,
      'cashSessionId', v_cash_session_id,
      'receiptNumber', v_receipt_number,
      'source', p_source
    ),
    case
      when p_source = 'cash_terminal' then 'Caja'
      when p_source = 'admin_pos' then 'Admin caja'
      else 'Venta operativa'
    end,
    coalesce(nullif(trim(coalesce(p_payment_reference, '')), ''), 'Pedido generado desde caja'),
    'pickup',
    '',
    '',
    v_total_items,
    v_total,
    '',
    ''
  );

  insert into public.order_items (
    id, order_id, product_id, product_name, quantity, unit_price_cop, line_note, sort_order
  )
  select gen_random_uuid()::text,
         v_order_id,
         product_id,
         product_name,
         quantity::integer,
         unit_price_cop,
         '',
         sort_order
  from tmp_sale_items
  order by sort_order;

  insert into public.sales (
    id, branch_id, cash_session_id, order_id, cashier_user_id, source, payment_status,
    subtotal_cop, total_cop, receipt_number, created_by
  ) values (
    v_sale_id, p_branch_id, v_cash_session_id, v_order_id, auth.uid(), p_source, v_payment_status,
    v_total, v_total, v_receipt_number, p_created_by
  );

  insert into public.sale_items (
    id, sale_id, product_id, product_name, quantity, unit_price_cop, line_total_cop, sort_order
  )
  select gen_random_uuid()::text,
         v_sale_id,
         product_id,
         product_name,
         quantity,
         unit_price_cop,
         line_total_cop,
         sort_order
  from tmp_sale_items
  order by sort_order;

  insert into public.sale_payments (
    id, sale_id, payment_method, payment_provider, payment_status, amount_cop, reference, paid_at
  ) values (
    v_payment_id,
    v_sale_id,
    p_payment_method,
    v_payment_provider,
    v_payment_status,
    v_total,
    nullif(trim(coalesce(p_payment_reference, '')), ''),
    case when v_payment_status = 'paid' then now() else null end
  );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'productId', product_id,
        'productName', product_name,
        'quantity', quantity,
        'unitPriceCop', unit_price_cop,
        'lineTotalCop', line_total_cop
      )
      order by sort_order
    ),
    '[]'::jsonb
  ) into v_receipt_items
  from tmp_sale_items;

  insert into public.sale_receipts (
    id, sale_id, branch_id, receipt_number, total_cop, payload
  ) values (
    v_receipt_id,
    v_sale_id,
    p_branch_id,
    v_receipt_number,
    v_total,
    jsonb_build_object(
      'type', 'internal_receipt',
      'dian', false,
      'branchId', p_branch_id,
      'saleId', v_sale_id,
      'orderId', v_order_id,
      'receiptNumber', v_receipt_number,
      'totalCop', v_total,
      'paymentMethod', p_payment_method,
      'paymentStatus', v_payment_status,
      'items', v_receipt_items
    )
  );

  return jsonb_build_object(
    'saleId', v_sale_id,
    'receiptNumber', v_receipt_number,
    'totalCop', v_total,
    'paymentStatus', v_payment_status,
    'cashSessionId', v_cash_session_id,
    'orderId', v_order_id,
    'trackingToken', v_tracking_token
  );
end;
$$;

create or replace function public.get_cash_session_terminal(
  p_cash_session_id text,
  p_access_token text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_session public.cash_sessions%rowtype;
  v_branch record;
begin
  select * into v_session
  from public.cash_sessions
  where id = p_cash_session_id
    and access_token = p_access_token
    and status = 'open'
    and token_revoked_at is null
  limit 1;

  if not found then
    raise exception 'Caja no encontrada o enlace revocado.';
  end if;

  select id, name into v_branch
  from public.branches
  where id = v_session.branch_id
  limit 1;

  return jsonb_build_object(
    'cashSession', jsonb_build_object(
      'id', v_session.id,
      'branchId', v_session.branch_id,
      'name', v_session.name,
      'openingCashCop', v_session.opening_cash_cop,
      'openedAt', v_session.opened_at
    ),
    'branch', jsonb_build_object(
      'id', v_branch.id,
      'name', v_branch.name
    ),
    'products', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'branchId', p.branch_id,
            'categoryId', p.category_id,
            'name', p.name,
            'priceCop', p.price_cop
          )
          order by p.sort_order nulls last, p.name
        ),
        '[]'::jsonb
      )
      from public.products p
      where p.branch_id = v_session.branch_id
        and p.available
    )
  );
end;
$$;

create or replace function public.create_cash_session_sale(
  p_cash_session_id text,
  p_access_token text,
  p_items jsonb,
  p_payment_method text default 'cash',
  p_payment_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.cash_sessions%rowtype;
begin
  select * into v_session
  from public.cash_sessions
  where id = p_cash_session_id
    and access_token = p_access_token
    and status = 'open'
    and token_revoked_at is null
  for update;

  if not found then
    raise exception 'Caja no encontrada o enlace revocado.';
  end if;

  return public.create_sale(
    p_branch_id => v_session.branch_id,
    p_payment_method => p_payment_method,
    p_payment_reference => p_payment_reference,
    p_cash_session_id => v_session.id,
    p_created_by => 'cash_terminal:' || v_session.id,
    p_items => p_items,
    p_cash_session_access_token => p_access_token,
    p_source => 'cash_terminal'
  );
end;
$$;

revoke all on function public.next_internal_receipt_number(text) from public, anon, authenticated;
revoke all on function public.decrement_product_stock_for_sale(text, text, numeric, text[], text) from public, anon, authenticated;
revoke all on function public.open_cash_session(text, integer, text, text) from public, anon, authenticated;
revoke all on function public.close_cash_session(text, integer, text) from public, anon, authenticated;
revoke all on function public.create_sale(text, text, numeric, text, text, text, text, jsonb, text, text) from public, anon, authenticated;
revoke all on function public.get_cash_session_terminal(text, text) from public, anon, authenticated;
revoke all on function public.create_cash_session_sale(text, text, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.open_cash_session(text, integer, text, text) to authenticated;
grant execute on function public.close_cash_session(text, integer, text) to authenticated;
grant execute on function public.create_sale(text, text, numeric, text, text, text, text, jsonb, text, text) to authenticated;
grant execute on function public.get_cash_session_terminal(text, text) to anon, authenticated;
grant execute on function public.create_cash_session_sale(text, text, jsonb, text, text) to anon, authenticated;

create or replace function public.report_brand_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_brand_id text;
begin
  select m.brand_id into v_brand_id
  from public.multibrand_members m
  where m.user_id = auth.uid()
    and m.role = 'superadmin'
    and m.brand_id is not null
    and m.branch_id is null
    and m.warehouse_id is null
  limit 1;

  if v_brand_id is null then
    return jsonb_build_object('error', 'forbidden');
  end if;

  return jsonb_build_object(
    'brand_id', v_brand_id,
    'branch_count', (
      select count(*) from public.branches b where b.brand_id = v_brand_id
    ),
    'total_orders', (
      select count(*) from public.orders o
      where o.branch_id in (
        select b.id from public.branches b where b.brand_id = v_brand_id
      )
    ),
    'total_delivered_cop', (
      select coalesce(sum(o.total_cop), 0) from public.orders o
      where o.status = 'delivered'
        and o.branch_id in (
          select b.id from public.branches b where b.brand_id = v_brand_id
        )
    ),
    'sales_count', (
      select count(*) from public.sales s
      where s.status = 'completed'
        and s.branch_id in (
          select b.id from public.branches b where b.brand_id = v_brand_id
        )
    ),
    'sales_total_cop', (
      select coalesce(sum(s.total_cop), 0) from public.sales s
      where s.status = 'completed'
        and s.branch_id in (
          select b.id from public.branches b where b.brand_id = v_brand_id
        )
    ),
    'open_cash_sessions', (
      select count(*) from public.cash_sessions cs
      where cs.status = 'open'
        and cs.branch_id in (
          select b.id from public.branches b where b.brand_id = v_brand_id
        )
    ),
    'branch_sales', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'branch_id', b.id,
            'branch_name', b.name,
            'sales_count', coalesce(st.sales_count, 0),
            'sales_total_cop', coalesce(st.sales_total_cop, 0)
          )
          order by b.name
        ),
        '[]'::jsonb
      )
      from public.branches b
      left join (
        select s.branch_id, count(*) as sales_count, coalesce(sum(s.total_cop), 0) as sales_total_cop
        from public.sales s
        where s.status = 'completed'
        group by s.branch_id
      ) st on st.branch_id = b.id
      where b.brand_id = v_brand_id
    ),
    'orders_by_status', (
      select coalesce(
        jsonb_agg(jsonb_build_object('status', st.status, 'count', st.c)
                  order by st.status)
        filter (where st.status is not null),
        '[]'::jsonb
      )
      from (
        select o.status as status, count(*) as c
        from public.orders o
        where o.branch_id in (
          select b.id from public.branches b where b.brand_id = v_brand_id
        )
        group by o.status
      ) st
    ),
    'critical_stock_count', (
      select count(*) from public.branch_stock bs
      join public.branches b on b.id = bs.branch_id
      where b.brand_id = v_brand_id and bs.quantity <= 5
    ),
    'purchases_total', (
      select coalesce(sum(po.total_cost), 0) from public.purchase_orders po
      where po.warehouse_id in (
        select w.id from public.warehouses w where w.brand_id = v_brand_id
      )
    ),
    'dispatches_open', (
      select count(*) from public.dispatches d
      where d.status in ('preparing', 'shipped')
        and (
          d.branch_id in (select b.id from public.branches b where b.brand_id = v_brand_id)
          or d.warehouse_id in (select w.id from public.warehouses w where w.brand_id = v_brand_id)
        )
    ),
    'generated_at', now()
  );
end;
$$;

revoke all on function public.report_brand_overview() from public, anon, authenticated;
grant execute on function public.report_brand_overview() to authenticated;
