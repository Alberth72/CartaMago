-- Keep admin inventory synchronized when sales, public orders, dispatches, or merma change stock.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'branch_stock'
    ) then
      alter publication supabase_realtime add table public.branch_stock;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'inventory_movements'
    ) then
      alter publication supabase_realtime add table public.inventory_movements;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'warehouse_stock'
    ) then
      alter publication supabase_realtime add table public.warehouse_stock;
    end if;
  end if;
end $$;
