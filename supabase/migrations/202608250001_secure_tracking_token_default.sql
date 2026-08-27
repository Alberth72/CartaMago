-- Cierra el tracking publico por token:
-- 1) Todo pedido debe tener tracking_token no adivinable.
-- 2) La lectura anonima directa de orders/order_items queda bloqueada.
-- 3) El cliente publico consulta solo por RPC segura get_order_tracking(token).

alter table public.orders
  alter column tracking_token set default ('tk_' || replace(gen_random_uuid()::text, '-', ''));

update public.orders
set tracking_token = 'tk_' || replace(gen_random_uuid()::text, '-', '')
where tracking_token is null;

alter table public.orders
  alter column tracking_token set not null;

drop policy if exists "anon can read orders for tracking" on public.orders;
drop policy if exists "anon can read order items for tracking" on public.order_items;

revoke select on public.orders from anon;
revoke select on public.order_items from anon;

grant execute on function public.get_order_tracking(text) to anon, authenticated;
