drop policy if exists "public can insert orders" on public.orders;
drop policy if exists "public can insert order items" on public.order_items;

revoke insert on public.orders from anon, authenticated;
revoke insert on public.order_items from anon, authenticated;

grant select on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant update, delete on public.orders to authenticated;
grant update, delete on public.order_items to authenticated;

grant select, insert, update, delete on public.orders to service_role;
grant select, insert, update, delete on public.order_items to service_role;
