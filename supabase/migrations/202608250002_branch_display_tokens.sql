-- Tokens operativos por sede para pantallas fijas.
-- Cocina puede ver datos internos necesarios para preparar.
-- Sala ve un payload publico reducido.

alter table public.branches
  add column if not exists kitchen_display_token text,
  add column if not exists room_display_token text;

update public.branches
set kitchen_display_token = 'kd_' || replace(gen_random_uuid()::text, '-', '')
where kitchen_display_token is null;

update public.branches
set room_display_token = 'rd_' || replace(gen_random_uuid()::text, '-', '')
where room_display_token is null;

alter table public.branches
  alter column kitchen_display_token set default ('kd_' || replace(gen_random_uuid()::text, '-', '')),
  alter column room_display_token set default ('rd_' || replace(gen_random_uuid()::text, '-', '')),
  alter column kitchen_display_token set not null,
  alter column room_display_token set not null;

create unique index if not exists branches_kitchen_display_token_key
  on public.branches (kitchen_display_token);

create unique index if not exists branches_room_display_token_key
  on public.branches (room_display_token);

-- El menu publico necesita leer datos visibles de la sede, pero nunca los
-- tokens operativos. Revocamos SELECT de tabla completa para anon y exponemos
-- solo columnas publicas.
revoke select on public.branches from anon;
grant select (
  id,
  name,
  short_name,
  whatsapp_number,
  location,
  headline,
  description,
  fulfillment_modes,
  hero_image_url,
  social_handle
) on public.branches to anon;

create or replace function public.get_kitchen_display_orders(p_branch_id text, p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with allowed_branch as (
    select b.id
    from public.branches b
    where b.id = p_branch_id
      and b.kitchen_display_token = p_token
  ),
  display_orders as (
    select o.*
    from public.orders o
    join allowed_branch b on b.id = o.branch_id
    where o.status in ('pending', 'confirmed', 'preparing', 'ready')
    order by o.created_at desc
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', o.id,
        'branch_id', o.branch_id,
        'status', o.status,
        'order_channel', o.order_channel,
        'delivery_provider', o.delivery_provider,
        'payment_status', o.payment_status,
        'payment_method', o.payment_method,
        'payment_provider', o.payment_provider,
        'external_provider', o.external_provider,
        'external_order_id', o.external_order_id,
        'external_status', o.external_status,
        'customer_name', o.customer_name,
        'customer_phone', o.customer_phone,
        'customer_note', o.customer_note,
        'fulfillment_mode', o.fulfillment_mode,
        'delivery_address', o.delivery_address,
        'table_number', o.table_number,
        'total_items', o.total_items,
        'total_cop', o.total_cop,
        'whatsapp_message', o.whatsapp_message,
        'whatsapp_link', o.whatsapp_link,
        'created_at', o.created_at,
        'updated_at', o.updated_at,
        'items', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', i.id,
              'order_id', i.order_id,
              'product_id', i.product_id,
              'product_name', i.product_name,
              'quantity', i.quantity,
              'unit_price_cop', i.unit_price_cop,
              'line_note', i.line_note,
              'sort_order', i.sort_order
            )
            order by i.sort_order
          )
          from public.order_items i
          where i.order_id = o.id
        ), '[]'::jsonb)
      )
      order by o.created_at desc
    ),
    '[]'::jsonb
  )
  from display_orders o;
$$;

create or replace function public.get_room_display_orders(p_branch_id text, p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with allowed_branch as (
    select b.id
    from public.branches b
    where b.id = p_branch_id
      and b.room_display_token = p_token
  ),
  display_orders as (
    select o.*
    from public.orders o
    join allowed_branch b on b.id = o.branch_id
    where o.status in ('confirmed', 'preparing', 'ready')
    order by o.created_at desc
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', o.id,
        'branch_id', o.branch_id,
        'status', o.status,
        'customer_name', case when o.fulfillment_mode = 'pickup' then o.customer_name else '' end,
        'customer_note', '',
        'fulfillment_mode', o.fulfillment_mode,
        'delivery_address', '',
        'table_number', o.table_number,
        'total_items', o.total_items,
        'total_cop', 0,
        'whatsapp_message', '',
        'whatsapp_link', '',
        'created_at', o.created_at,
        'updated_at', o.updated_at,
        'items', '[]'::jsonb
      )
      order by o.created_at desc
    ),
    '[]'::jsonb
  )
  from display_orders o;
$$;

revoke all on function public.get_kitchen_display_orders(text, text) from public, anon, authenticated;
revoke all on function public.get_room_display_orders(text, text) from public, anon, authenticated;
grant execute on function public.get_kitchen_display_orders(text, text) to anon, authenticated;
grant execute on function public.get_room_display_orders(text, text) to anon, authenticated;
