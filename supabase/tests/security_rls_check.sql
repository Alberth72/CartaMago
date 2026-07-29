-- Read-only security assertions for the Supabase schema.
-- Run after applying migrations in local Supabase or a staging project.

do $$
declare
  failures text[] := array[]::text[];
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'restaurant_members'
  ) then
    failures := array_append(failures, 'missing public.restaurant_members');
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'can_manage_restaurant'
  ) then
    failures := array_append(failures, 'missing public.can_manage_restaurant');
  end if;

  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'order_status_events'
  ) then
    failures := array_append(failures, 'missing public.order_status_events');
  end if;

  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'order_idempotency_keys'
  ) then
    failures := array_append(failures, 'missing public.order_idempotency_keys');
  end if;

  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'order_rate_limits'
  ) then
    failures := array_append(failures, 'missing public.order_rate_limits');
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in ('orders', 'order_items')
      and policyname in ('public can read own orders', 'public can read order items')
  ) then
    failures := array_append(failures, 'orders/order_items public read policies still exist');
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in ('orders', 'order_items')
      and policyname in ('public can insert orders', 'public can insert order items')
  ) then
    failures := array_append(failures, 'orders/order_items public insert policies still exist');
  end if;

  if has_table_privilege('anon', 'public.orders', 'insert')
    or has_table_privilege('anon', 'public.order_items', 'insert')
    or has_table_privilege('authenticated', 'public.orders', 'insert')
    or has_table_privilege('authenticated', 'public.order_items', 'insert') then
    failures := array_append(failures, 'orders/order_items public insert grants still exist');
  end if;

  if has_table_privilege('anon', 'public.order_rate_limits', 'select')
    or has_table_privilege('anon', 'public.order_rate_limits', 'insert')
    or has_table_privilege('authenticated', 'public.order_rate_limits', 'select')
    or has_table_privilege('authenticated', 'public.order_rate_limits', 'insert') then
    failures := array_append(failures, 'order_rate_limits public grants exist');
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'restaurants',
        'categories',
        'products',
        'menu_photos',
        'orders',
        'order_items',
        'restaurant_integrations',
        'integration_events'
      )
      and policyname like 'authenticated can manage %'
  ) then
    failures := array_append(failures, 'legacy authenticated manage-all policies still exist');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'authenticated members can manage orders'
  ) then
    failures := array_append(failures, 'missing membership policy for orders');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'order_items'
      and policyname = 'authenticated members can manage order items'
  ) then
    failures := array_append(failures, 'missing membership policy for order_items');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'restaurant_integrations'
      and policyname = 'authenticated members can manage restaurant integrations'
  ) then
    failures := array_append(failures, 'missing membership policy for restaurant_integrations');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'authenticated members can upload menu assets'
  ) then
    failures := array_append(failures, 'missing membership storage upload policy');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'order_status_events'
      and policyname = 'authenticated members can read order status events'
  ) then
    failures := array_append(failures, 'missing membership policy for order_status_events');
  end if;

  if array_length(failures, 1) > 0 then
    raise exception 'security_rls_check failed: %', array_to_string(failures, '; ');
  end if;
end $$;

select 'security_rls_check passed' as result;
