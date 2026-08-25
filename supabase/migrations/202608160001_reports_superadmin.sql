-- Reportes consolidados para el rol superadmin (solo lectura / informes).
-- ADITIVA y read-only: no altera tablas existentes.
-- Solo quien es superadmin de una marca puede consultar el resumen de su marca.

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

-- Solo el rol superadmin de la marca puede llamar a la funcion de reportes.
revoke all on function public.report_brand_overview() from public, anon, authenticated;
grant execute on function public.report_brand_overview() to authenticated;