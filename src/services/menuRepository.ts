import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  categories as seedCategories,
  menuItems as seedMenuItems,
  menuPhotos as seedMenuPhotos,
  restaurant as seedRestaurant,
  type MenuCategory,
  type MenuItem,
  type MenuPhoto,
  type RestaurantProfile,
} from '../data/brasasSazonMenu'

export type MenuData = {
  restaurant: RestaurantProfile
  categories: MenuCategory[]
  menuItems: MenuItem[]
  menuPhotos: MenuPhoto[]
  source: 'seed' | 'supabase'
}

export type ProductRow = {
  id: string
  restaurant_id: string
  category_id: string
  name: string
  description: string
  price_cop: number | null
  badge: string | null
  image_url: string | null
  available: boolean
  sort_order: number | null
}

export type CategoryRow = {
  id: string
  restaurant_id: string
  name: string
  description: string
  image_url: string | null
  sort_order: number | null
}

export type RestaurantRow = {
  id: string
  name: string
  short_name: string | null
  whatsapp_number: string
  location: string | null
  headline: string
  description: string
  fulfillment_modes: string[] | null
  hero_image_url: string | null
  social_handle: string | null
}

const env = import.meta.env as Record<string, string | undefined>

let supabaseClient: SupabaseClient | null = null

export function getSupabaseConfig() {
  return {
    url: env.VITE_SUPABASE_URL,
    anonKey: env.VITE_SUPABASE_ANON_KEY,
    restaurantId: env.VITE_RESTAURANT_ID ?? 'brasas-sazon',
    storageBucket: env.VITE_MENU_STORAGE_BUCKET ?? 'menu-assets',
  }
}

export function isSupabaseConfigured() {
  const { url, anonKey } = getSupabaseConfig()
  return Boolean(url && anonKey)
}

export function getSupabaseClient() {
  const { url, anonKey } = getSupabaseConfig()
  if (!url || !anonKey) {
    throw new Error('Supabase is not configured')
  }

  supabaseClient ??= createClient(url, anonKey)
  return supabaseClient
}

export function getSeedMenuData(): MenuData {
  return {
    restaurant: seedRestaurant,
    categories: seedCategories,
    menuItems: seedMenuItems,
    menuPhotos: seedMenuPhotos,
    source: 'seed',
  }
}

export async function fetchPublicMenu(): Promise<MenuData> {
  if (!isSupabaseConfigured()) {
    return getSeedMenuData()
  }

  try {
    const supabase = getSupabaseClient()
    const { restaurantId } = getSupabaseConfig()
    const [restaurantResult, categoriesResult, productsResult, photosResult] = await Promise.all([
      supabase.from('restaurants').select('*').eq('id', restaurantId).single(),
      supabase.from('categories').select('*').eq('restaurant_id', restaurantId).order('sort_order', { ascending: true }),
      supabase.from('products').select('*').eq('restaurant_id', restaurantId).order('sort_order', { ascending: true }),
      supabase.from('menu_photos').select('*').eq('restaurant_id', restaurantId).order('sort_order', { ascending: true }),
    ])

    if (restaurantResult.error || categoriesResult.error || productsResult.error || photosResult.error) {
      throw new Error(
        restaurantResult.error?.message ??
          categoriesResult.error?.message ??
          productsResult.error?.message ??
          photosResult.error?.message,
      )
    }

    return {
      restaurant: {
        name: restaurantResult.data.name,
        shortName: restaurantResult.data.short_name ?? restaurantResult.data.name,
        whatsappNumber: restaurantResult.data.whatsapp_number,
        location: restaurantResult.data.location ?? 'Asadero y Restaurante',
        headline: restaurantResult.data.headline,
        description: restaurantResult.data.description,
        fulfillmentModes: restaurantResult.data.fulfillment_modes ?? ['pickup', 'delivery', 'table'],
        heroImage: restaurantResult.data.hero_image_url ?? seedRestaurant.heroImage,
        socialHandle: restaurantResult.data.social_handle ?? '',
      },
      categories: ((categoriesResult.data ?? []) as CategoryRow[]).map((category) => ({
        id: category.id,
        name: category.name,
        description: category.description,
        image: category.image_url ?? undefined,
      })),
      menuItems: ((productsResult.data ?? []) as ProductRow[]).map((product) => ({
        id: product.id,
        categoryId: product.category_id,
        name: product.name,
        description: product.description,
        price: product.price_cop,
        badge: product.badge ?? undefined,
        imageUrl: product.image_url ?? undefined,
        available: product.available,
      })),
      menuPhotos: ((photosResult.data ?? []) as Array<{ id: string; title: string; image_url: string }>).map((photo) => ({
        id: photo.id,
        title: photo.title,
        image: photo.image_url,
      })),
      source: 'supabase',
    }
  } catch (error) {
    console.warn('Falling back to seed menu data', error)
    return getSeedMenuData()
  }
}

export function toProductRow(product: MenuItem, restaurantId: string, sortOrder = 0): ProductRow {
  return {
    id: product.id,
    restaurant_id: restaurantId,
    category_id: product.categoryId,
    name: product.name,
    description: product.description,
    price_cop: product.price,
    badge: product.badge ?? null,
    image_url: product.imageUrl ?? null,
    available: product.available,
    sort_order: sortOrder,
  }
}

export function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
