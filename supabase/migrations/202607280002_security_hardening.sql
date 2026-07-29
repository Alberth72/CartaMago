create table if not exists public.restaurant_members (
  id text primary key,
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin', 'staff')),
  created_at timestamptz not null default now(),
  unique (restaurant_id, user_id)
);

alter table public.restaurant_members enable row level security;

grant select, insert, update, delete on public.restaurant_members to authenticated;

create or replace function public.is_restaurant_member(target_restaurant_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.restaurant_members
    where restaurant_id = target_restaurant_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.restaurant_has_members(target_restaurant_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.restaurant_members
    where restaurant_id = target_restaurant_id
  );
$$;

create or replace function public.can_manage_restaurant(target_restaurant_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.role() = 'authenticated'
    and (
      public.is_restaurant_member(target_restaurant_id)
      or not public.restaurant_has_members(target_restaurant_id)
    );
$$;

drop policy if exists "authenticated can read restaurant members" on public.restaurant_members;
create policy "authenticated can read restaurant members"
on public.restaurant_members for select
to authenticated
using (public.can_manage_restaurant(restaurant_id));

drop policy if exists "restaurant owners can manage members" on public.restaurant_members;
create policy "restaurant owners can manage members"
on public.restaurant_members for all
to authenticated
using (
  public.can_manage_restaurant(restaurant_id)
  and exists (
    select 1
    from public.restaurant_members owner_member
    where owner_member.restaurant_id = restaurant_members.restaurant_id
      and owner_member.user_id = auth.uid()
      and owner_member.role = 'owner'
  )
)
with check (
  public.can_manage_restaurant(restaurant_id)
  and (
    not public.restaurant_has_members(restaurant_id)
    or exists (
      select 1
      from public.restaurant_members owner_member
      where owner_member.restaurant_id = restaurant_members.restaurant_id
        and owner_member.user_id = auth.uid()
        and owner_member.role = 'owner'
    )
  )
);

drop policy if exists "authenticated can manage restaurants" on public.restaurants;
create policy "authenticated members can manage restaurants"
on public.restaurants for all
to authenticated
using (public.can_manage_restaurant(id))
with check (public.can_manage_restaurant(id));

drop policy if exists "authenticated can manage categories" on public.categories;
create policy "authenticated members can manage categories"
on public.categories for all
to authenticated
using (public.can_manage_restaurant(restaurant_id))
with check (public.can_manage_restaurant(restaurant_id));

drop policy if exists "authenticated can manage products" on public.products;
create policy "authenticated members can manage products"
on public.products for all
to authenticated
using (public.can_manage_restaurant(restaurant_id))
with check (public.can_manage_restaurant(restaurant_id));

drop policy if exists "authenticated can manage menu photos" on public.menu_photos;
create policy "authenticated members can manage menu photos"
on public.menu_photos for all
to authenticated
using (public.can_manage_restaurant(restaurant_id))
with check (public.can_manage_restaurant(restaurant_id));

drop policy if exists "public can read own orders" on public.orders;
drop policy if exists "public can read order items" on public.order_items;

drop policy if exists "authenticated can manage orders" on public.orders;
create policy "authenticated members can manage orders"
on public.orders for all
to authenticated
using (public.can_manage_restaurant(restaurant_id))
with check (public.can_manage_restaurant(restaurant_id));

drop policy if exists "authenticated can manage order items" on public.order_items;
create policy "authenticated members can manage order items"
on public.order_items for all
to authenticated
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and public.can_manage_restaurant(orders.restaurant_id)
  )
)
with check (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and public.can_manage_restaurant(orders.restaurant_id)
  )
);

drop policy if exists "authenticated can manage restaurant integrations" on public.restaurant_integrations;
create policy "authenticated members can manage restaurant integrations"
on public.restaurant_integrations for all
to authenticated
using (public.can_manage_restaurant(restaurant_id))
with check (public.can_manage_restaurant(restaurant_id));

drop policy if exists "authenticated can manage integration events" on public.integration_events;
create policy "authenticated members can manage integration events"
on public.integration_events for all
to authenticated
using (public.can_manage_restaurant(restaurant_id))
with check (public.can_manage_restaurant(restaurant_id));

drop policy if exists "authenticated can upload menu assets" on storage.objects;
create policy "authenticated members can upload menu assets"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'menu-assets'
  and public.can_manage_restaurant((storage.foldername(name))[1])
);

drop policy if exists "authenticated can update menu assets" on storage.objects;
create policy "authenticated members can update menu assets"
on storage.objects for update
to authenticated
using (
  bucket_id = 'menu-assets'
  and public.can_manage_restaurant((storage.foldername(name))[1])
)
with check (
  bucket_id = 'menu-assets'
  and public.can_manage_restaurant((storage.foldername(name))[1])
);

drop policy if exists "authenticated can delete menu assets" on storage.objects;
create policy "authenticated members can delete menu assets"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'menu-assets'
  and public.can_manage_restaurant((storage.foldername(name))[1])
);
