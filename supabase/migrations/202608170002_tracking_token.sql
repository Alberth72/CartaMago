-- Tracking por token (no adivinable) para la vista publica del cliente.
-- 1) Agrega columna tracking_token a orders (nullable, unica parcial).
-- 2) Backfill de tokens para pedidos existentes/demo.
-- 3) Crea la RPC get_tracking_token_segura que devuelve SOLO campos seguros
--    (sin telefono, direccion, notas ni payloads de integraciones).

alter table public.orders
  add column if not exists tracking_token text;

create unique index if not exists orders_tracking_token_key
  on public.orders (tracking_token)
  where tracking_token is not null;

-- Backfill para pedidos que ya existen (demo/simulacion).
update public.orders
set tracking_token = 'tk_' || replace(gen_random_uuid()::text, '-', '')
where tracking_token is null;

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
begin
  select o into v_order
  from public.orders o
  where o.tracking_token = p_token;

  if not found then
    return jsonb_build_object('error', 'not_found');
  end if;

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
    'status', v_order.status,
    'fulfillmentMode', v_order.fulfillment_mode,
    'paymentMethod', v_order.payment_method,
    'totalCop', v_order.total_cop,
    'whatsappLink', v_order.whatsapp_link,
    'createdAt', v_order.created_at,
    'updatedAt', v_order.updated_at,
    'items', v_items
  );
end;
$$;

-- El cliente (anon) y usuarios autenticados pueden consultar SOLO por token.
revoke all on function public.get_order_tracking(text) from public, anon, authenticated;
grant execute on function public.get_order_tracking(text) to anon, authenticated;