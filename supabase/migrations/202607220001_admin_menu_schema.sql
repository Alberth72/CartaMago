create table if not exists public.restaurants (
  id text primary key,
  name text not null,
  short_name text,
  whatsapp_number text not null,
  location text,
  headline text not null,
  description text not null,
  fulfillment_modes text[] not null default array['pickup', 'delivery', 'table'],
  hero_image_url text,
  social_handle text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id text primary key,
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  name text not null,
  description text not null default '',
  image_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key,
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  category_id text not null references public.categories(id) on delete restrict,
  name text not null,
  description text not null default '',
  price_cop int,
  badge text,
  image_url text,
  available boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_photos (
  id text primary key,
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  title text not null,
  image_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_restaurants_updated_at on public.restaurants;
create trigger set_restaurants_updated_at
before update on public.restaurants
for each row execute function public.set_updated_at();

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists set_menu_photos_updated_at on public.menu_photos;
create trigger set_menu_photos_updated_at
before update on public.menu_photos
for each row execute function public.set_updated_at();

alter table public.restaurants enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.menu_photos enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.restaurants, public.categories, public.products, public.menu_photos to anon, authenticated;
grant insert, update, delete on public.restaurants, public.categories, public.products, public.menu_photos to authenticated;

create policy "public can read restaurants"
on public.restaurants for select
to anon, authenticated
using (true);

create policy "authenticated can manage restaurants"
on public.restaurants for all
to authenticated
using (true)
with check (true);

create policy "public can read categories"
on public.categories for select
to anon, authenticated
using (true);

create policy "authenticated can manage categories"
on public.categories for all
to authenticated
using (true)
with check (true);

create policy "public can read available products"
on public.products for select
to anon, authenticated
using (available = true or auth.role() = 'authenticated');

create policy "authenticated can manage products"
on public.products for all
to authenticated
using (true)
with check (true);

create policy "public can read menu photos"
on public.menu_photos for select
to anon, authenticated
using (true);

create policy "authenticated can manage menu photos"
on public.menu_photos for all
to authenticated
using (true)
with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'menu-assets',
  'menu-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "public can read menu assets"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'menu-assets');

create policy "authenticated can upload menu assets"
on storage.objects for insert
to authenticated
with check (bucket_id = 'menu-assets');

create policy "authenticated can update menu assets"
on storage.objects for update
to authenticated
using (bucket_id = 'menu-assets')
with check (bucket_id = 'menu-assets');

create policy "authenticated can delete menu assets"
on storage.objects for delete
to authenticated
using (bucket_id = 'menu-assets');
