-- Fix: sale_receipts uses issued_at, not created_at. The public tracking RPC
-- must never fail before returning the order payload.

create or replace function public.get_order_tracking(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_order public.orders%rowtype;
  v_items jsonb;
  v_receipt_number text;
  v_branch_name text;
  v_business_name text;
begin
  select o.* into v_order
  from public.orders o
  where o.tracking_token = p_token;

  if not found then
    return jsonb_build_object('error', 'not_found');
  end if;

  select sr.receipt_number
  into v_receipt_number
  from public.sales s
  join public.sale_receipts sr on sr.sale_id = s.id
  where s.order_id = v_order.id
  order by sr.issued_at desc
  limit 1;

  select b.name, coalesce(br.name, b.name)
  into v_branch_name, v_business_name
  from public.branches b
  left join public.brands br on br.id = b.brand_id
  where b.id = v_order.branch_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'product_name', i.product_name,
        'quantity', i.quantity,
        'unit_price_cop', i.unit_price_cop,
        'line_note', i.line_note
      )
      order by i.sort_order
    ),
    '[]'::jsonb
  )
  into v_items
  from public.order_items i
  where i.order_id = v_order.id;

  return jsonb_build_object(
    'orderId', v_order.id,
    'receiptNumber', coalesce(v_receipt_number, 'PED-' || upper(left(replace(v_order.id, '-', ''), 10))),
    'businessName', coalesce(v_business_name, v_branch_name, v_order.branch_id),
    'branchName', coalesce(v_branch_name, v_order.branch_id),
    'orderChannel', coalesce(v_order.order_channel, 'cartamago'),
    'status', v_order.status,
    'fulfillmentMode', v_order.fulfillment_mode,
    'paymentMethod', v_order.payment_method,
    'paymentStatus', coalesce(v_order.payment_status, 'pending'),
    'totalCop', v_order.total_cop,
    'whatsappLink', v_order.whatsapp_link,
    'createdAt', v_order.created_at,
    'updatedAt', v_order.updated_at,
    'customerName', null,
    'tableNumber', nullif(v_order.table_number, ''),
    'items', v_items
  );
end;
$$;

revoke all on function public.get_order_tracking(text) from public, anon, authenticated;
grant execute on function public.get_order_tracking(text) to anon, authenticated;
