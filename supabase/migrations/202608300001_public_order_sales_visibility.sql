-- Hace visibles los pedidos publicos QR en reportes de superadmin sin duplicar
-- ventas que ya tengan comprobante interno en public.sales, y permite convertir
-- un pago confirmado de pedido publico en venta canonica.

create or replace function public.confirm_order_payment(
  p_order_id text,
  p_cash_session_id text default null,
  p_payment_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_existing_sale public.sales%rowtype;
  v_sale_id text := gen_random_uuid()::text;
  v_payment_id text := gen_random_uuid()::text;
  v_receipt_id text := gen_random_uuid()::text;
  v_receipt_number text;
  v_payment_method text;
  v_payment_provider text;
  v_receipt_items jsonb;
  v_cash_session_id text := p_cash_session_id;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Pedido no encontrado.';
  end if;

  if not public.can_operate_branch(v_order.branch_id) then
    raise exception 'No tienes permiso para confirmar pago de esta sede.';
  end if;

  if v_order.status = 'cancelled' then
    raise exception 'No se puede confirmar pago de un pedido cancelado.';
  end if;

  if coalesce(v_order.order_channel, 'cartamago') not in ('cartamago', 'whatsapp', 'didi_food') then
    raise exception 'Solo los pedidos publicos pueden confirmarse por esta ruta.';
  end if;

  select * into v_existing_sale
  from public.sales
  where order_id = v_order.id
    and status = 'completed'
  order by sold_at desc
  limit 1;

  if found then
    update public.orders
    set payment_status = 'paid',
        updated_at = now()
    where id = v_order.id
      and payment_status <> 'paid';

    return jsonb_build_object(
      'saleId', v_existing_sale.id,
      'orderId', v_order.id,
      'receiptNumber', v_existing_sale.receipt_number,
      'trackingToken', v_order.tracking_token,
      'totalCop', v_existing_sale.total_cop,
      'paymentStatus', 'paid',
      'cashSessionId', v_existing_sale.cash_session_id
    );
  end if;

  if v_cash_session_id is not null then
    if not exists (
      select 1 from public.cash_sessions cs
      where cs.id = v_cash_session_id
        and cs.branch_id = v_order.branch_id
        and cs.status = 'open'
        and cs.token_revoked_at is null
    ) then
      raise exception 'La caja seleccionada no esta abierta para esta sede.';
    end if;
  end if;

  v_payment_method := coalesce(nullif(trim(coalesce(v_order.payment_method, '')), ''), 'cash');
  if v_payment_method not in ('cash', 'card_at_counter', 'card_at_table', 'bank_transfer', 'wompi', 'didi_food') then
    raise exception 'Metodo de pago no soportado.';
  end if;

  v_payment_provider := coalesce(nullif(trim(coalesce(v_order.payment_provider, '')), ''), case
    when v_payment_method = 'wompi' then 'wompi'
    when v_payment_method = 'didi_food' then 'didi_food'
    else 'manual'
  end);

  if v_payment_provider not in ('manual', 'wompi', 'didi_food') then
    v_payment_provider := case
      when v_payment_method = 'wompi' then 'wompi'
      when v_payment_method = 'didi_food' then 'didi_food'
      else 'manual'
    end;
  end if;

  v_receipt_number := public.next_internal_receipt_number(v_order.branch_id);

  insert into public.sales (
    id, branch_id, cash_session_id, order_id, cashier_user_id, source, payment_status,
    subtotal_cop, total_cop, receipt_number, created_by, sold_at
  ) values (
    v_sale_id,
    v_order.branch_id,
    v_cash_session_id,
    v_order.id,
    auth.uid(),
    'qr_order',
    'paid',
    greatest(coalesce(v_order.total_cop, 0), 0),
    greatest(coalesce(v_order.total_cop, 0), 0),
    v_receipt_number,
    'order_payment:' || v_order.id,
    now()
  );

  insert into public.sale_items (
    id, sale_id, product_id, product_name, quantity, unit_price_cop, line_total_cop, sort_order
  )
  select gen_random_uuid()::text,
         v_sale_id,
         i.product_id,
         i.product_name,
         i.quantity,
         coalesce(i.unit_price_cop, 0),
         greatest(coalesce(i.unit_price_cop, 0) * i.quantity, 0),
         i.sort_order
  from public.order_items i
  where i.order_id = v_order.id
  order by i.sort_order;

  insert into public.sale_payments (
    id, sale_id, payment_method, payment_provider, payment_status, amount_cop, reference, paid_at
  ) values (
    v_payment_id,
    v_sale_id,
    v_payment_method,
    v_payment_provider,
    'paid',
    greatest(coalesce(v_order.total_cop, 0), 0),
    nullif(trim(coalesce(p_payment_reference, '')), ''),
    now()
  );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'productId', i.product_id,
        'productName', i.product_name,
        'quantity', i.quantity,
        'unitPriceCop', i.unit_price_cop,
        'lineTotalCop', greatest(coalesce(i.unit_price_cop, 0) * i.quantity, 0)
      )
      order by i.sort_order
    ),
    '[]'::jsonb
  ) into v_receipt_items
  from public.order_items i
  where i.order_id = v_order.id;

  insert into public.sale_receipts (
    id, sale_id, branch_id, receipt_number, total_cop, payload
  ) values (
    v_receipt_id,
    v_sale_id,
    v_order.branch_id,
    v_receipt_number,
    greatest(coalesce(v_order.total_cop, 0), 0),
    jsonb_build_object(
      'type', 'internal_receipt',
      'dian', false,
      'branchId', v_order.branch_id,
      'saleId', v_sale_id,
      'orderId', v_order.id,
      'receiptNumber', v_receipt_number,
      'totalCop', greatest(coalesce(v_order.total_cop, 0), 0),
      'paymentMethod', v_payment_method,
      'paymentStatus', 'paid',
      'items', v_receipt_items
    )
  );

  update public.orders
  set payment_status = 'paid',
      payment_provider = v_payment_provider,
      updated_at = now()
  where id = v_order.id;

  return jsonb_build_object(
    'saleId', v_sale_id,
    'orderId', v_order.id,
    'receiptNumber', v_receipt_number,
    'trackingToken', v_order.tracking_token,
    'totalCop', greatest(coalesce(v_order.total_cop, 0), 0),
    'paymentStatus', 'paid',
    'cashSessionId', v_cash_session_id
  );
end;
$$;

revoke all on function public.confirm_order_payment(text, text, text) from public, anon, authenticated;
grant execute on function public.confirm_order_payment(text, text, text) to authenticated;

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
        and coalesce(s.source, 'admin_pos') <> 'qr_order'
        and s.branch_id in (
          select b.id from public.branches b where b.brand_id = v_brand_id
        )
    ),
    'sales_total_cop', (
      select coalesce(sum(s.total_cop), 0) from public.sales s
      where s.status = 'completed'
        and coalesce(s.source, 'admin_pos') <> 'qr_order'
        and s.branch_id in (
          select b.id from public.branches b where b.brand_id = v_brand_id
        )
    ),
    'public_orders_count', (
      select coalesce(sum(c), 0)
      from (
        select count(*) as c
        from public.sales s
        where s.status = 'completed'
          and s.source = 'qr_order'
          and s.branch_id in (
            select b.id from public.branches b where b.brand_id = v_brand_id
          )
        union all
        select count(*) as c
        from public.orders o
        where o.status <> 'cancelled'
          and coalesce(o.order_channel, 'cartamago') in ('cartamago', 'whatsapp', 'didi_food')
          and not exists (select 1 from public.sales s where s.order_id = o.id)
          and o.branch_id in (
            select b.id from public.branches b where b.brand_id = v_brand_id
          )
      ) public_sources
    ),
    'public_orders_total_cop', (
      select coalesce(sum(total_cop), 0)
      from (
        select s.total_cop
        from public.sales s
        where s.status = 'completed'
          and s.source = 'qr_order'
          and s.branch_id in (
            select b.id from public.branches b where b.brand_id = v_brand_id
          )
        union all
        select o.total_cop
        from public.orders o
        where o.status <> 'cancelled'
          and coalesce(o.order_channel, 'cartamago') in ('cartamago', 'whatsapp', 'didi_food')
          and not exists (select 1 from public.sales s where s.order_id = o.id)
          and o.branch_id in (
            select b.id from public.branches b where b.brand_id = v_brand_id
          )
      ) public_totals
    ),
    'revenue_total_cop', (
      select coalesce(sum(total_cop), 0)
      from (
        select s.total_cop
        from public.sales s
        where s.status = 'completed'
          and s.branch_id in (
            select b.id from public.branches b where b.brand_id = v_brand_id
          )
        union all
        select o.total_cop
        from public.orders o
        where o.status <> 'cancelled'
          and coalesce(o.order_channel, 'cartamago') in ('cartamago', 'whatsapp', 'didi_food')
          and not exists (select 1 from public.sales s where s.order_id = o.id)
          and o.branch_id in (
            select b.id from public.branches b where b.brand_id = v_brand_id
          )
      ) totals
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
            'sales_total_cop', coalesce(st.sales_total_cop, 0),
            'public_orders_count', coalesce(qr.public_orders_count, 0),
            'public_orders_total_cop', coalesce(qr.public_orders_total_cop, 0),
            'revenue_total_cop', coalesce(st.sales_total_cop, 0) + coalesce(qr.public_orders_total_cop, 0)
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
          and coalesce(s.source, 'admin_pos') <> 'qr_order'
        group by s.branch_id
      ) st on st.branch_id = b.id
      left join (
        select branch_id, count(*) as public_orders_count, coalesce(sum(total_cop), 0) as public_orders_total_cop
        from (
          select s.branch_id, s.total_cop
          from public.sales s
          where s.status = 'completed'
            and s.source = 'qr_order'
          union all
          select o.branch_id, o.total_cop
          from public.orders o
          where o.status <> 'cancelled'
            and coalesce(o.order_channel, 'cartamago') in ('cartamago', 'whatsapp', 'didi_food')
            and not exists (select 1 from public.sales s where s.order_id = o.id)
        ) public_branch_totals
        group by branch_id
      ) qr on qr.branch_id = b.id
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
