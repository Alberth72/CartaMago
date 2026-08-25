-- Auditoria y endurecimiento de RLS en orders / order_items.
-- Las migraciones iniciales dejaron politicas amplias `using(true)` para
-- `authenticated` (cualquier usuario autenticado podia leer/actualizar cualquier
-- pedido). Esto las reemplaza por politicas scoped por sede (`can_operate_branch`).
-- ADITIVA / idempotente: cada politica se dropea antes de crearse.

-- 1) Limpiar politicas legacy amplias.
drop policy if exists "public can insert orders" on public.orders;
drop policy if exists "public can read own orders" on public.orders;
drop policy if exists "authenticated can manage orders" on public.orders;
drop policy if exists "public can insert order items" on public.order_items;
drop policy if exists "public can read order items" on public.order_items;
drop policy if exists "authenticated can manage order items" on public.order_items;

-- 2) Privilegios: los pedidos se crean via Edge Function (service_role) o SQL de
--    seed/simulacion. El cliente anon no debe insertar directamente.
revoke insert on public.orders from anon;
revoke insert on public.order_items from anon;
revoke update, delete on public.orders from anon;
revoke update, delete on public.order_items from anon;

-- 3) Lectura publica para tracking (por orderId).
--    RIESGO RESIDUAL DOCUMENTADO: mientras no exista `tracking_token`, un anon que
--    adivine un orderId puede leer ese pedido. La vista /tracking es la unica que
--    usa este acceso. Fix pendiente: `docs/live-order-tracking-plan.md`.
drop policy if exists "anon can read orders for tracking" on public.orders;
create policy "anon can read orders for tracking"
on public.orders for select
to anon
using (true);

drop policy if exists "anon can read order items for tracking" on public.order_items;
create policy "anon can read order items for tracking"
on public.order_items for select
to anon
using (true);

-- 4) Lectura y actualizacion scoped por sede para usuarios autenticados.
drop policy if exists "authenticated can read scoped orders" on public.orders;
create policy "authenticated can read scoped orders"
on public.orders for select
to authenticated
using (public.can_operate_branch(branch_id));

drop policy if exists "authenticated can update scoped orders" on public.orders;
create policy "authenticated can update scoped orders"
on public.orders for update
to authenticated
using (public.can_operate_branch(branch_id))
with check (public.can_operate_branch(branch_id));

drop policy if exists "authenticated can read scoped order items" on public.order_items;
create policy "authenticated can read scoped order items"
on public.order_items for select
to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and public.can_operate_branch(o.branch_id)
  )
);

drop policy if exists "authenticated can update scoped order items" on public.order_items;
create policy "authenticated can update scoped order items"
on public.order_items for update
to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and public.can_operate_branch(o.branch_id)
  )
)
with check (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and public.can_operate_branch(o.branch_id)
  )
);