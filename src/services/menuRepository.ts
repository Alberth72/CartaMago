import { isE2EAdminMockEnabled } from '../lib/runtimeFlags'
import { getSupabaseClient, getSupabaseConfig, isSupabaseConfigured } from './supabaseClient'
import {
  getSeedById,
  type FulfillmentMode,
  type MenuCategory,
  type MenuItem,
  type MenuPhoto,
  type RestaurantProfile,
} from '../data/restaurantSeed'

export { slugify } from '../lib/slug'
export { getSupabaseClient, getSupabaseConfig, isSupabaseConfigured } from './supabaseClient'

export type MenuData = {
  branchId: string
  restaurant: RestaurantProfile
  categories: MenuCategory[]
  menuItems: MenuItem[]
  menuPhotos: MenuPhoto[]
  source: 'seed' | 'supabase'
}

export type ProductRow = {
  id: string
  branch_id: string
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
  branch_id: string
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

const defaultFulfillmentModes: FulfillmentMode[] = ['pickup', 'local_delivery', 'didi_food', 'table']

function normalizeFulfillmentMode(mode: string): FulfillmentMode | null {
  if (mode === 'delivery') return 'local_delivery'
  if (mode === 'pickup' || mode === 'local_delivery' || mode === 'didi_food' || mode === 'table') return mode
  return null
}

function normalizeFulfillmentModes(modes: string[] | null | undefined): FulfillmentMode[] {
  const normalized = (modes ?? [])
    .map(normalizeFulfillmentMode)
    .filter((mode): mode is FulfillmentMode => Boolean(mode))

  return normalized.length > 0 ? normalized : defaultFulfillmentModes
}

export function getSeedMenuData(): MenuData {
  const { branchId } = getSupabaseConfig()
  const seed = getSeedById(branchId)
  if (!seed) {
    throw new Error(`No seed data for restaurant: ${branchId}`)
  }
  return {
    branchId,
    restaurant: seed.restaurant,
    categories: seed.categories,
    menuItems: seed.menuItems,
    menuPhotos: seed.menuPhotos,
    source: 'seed',
  }
}

export async function fetchPublicMenu(): Promise<MenuData> {
  if (isE2EAdminMockEnabled() || !isSupabaseConfigured()) {
    return getSeedMenuData()
  }

  try {
    const supabase = getSupabaseClient()
    const { branchId } = getSupabaseConfig()
    const [restaurantResult, categoriesResult, productsResult, photosResult] = await Promise.all([
      supabase.from('branches').select('*').eq('id', branchId).single(),
      supabase.from('categories').select('*').eq('branch_id', branchId).order('sort_order', { ascending: true }),
      supabase.from('products').select('*').eq('branch_id', branchId).order('sort_order', { ascending: true }),
      supabase.from('menu_photos').select('*').eq('branch_id', branchId).order('sort_order', { ascending: true }),
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
      branchId,
      restaurant: {
        name: restaurantResult.data.name,
        shortName: restaurantResult.data.short_name ?? restaurantResult.data.name,
        whatsappNumber: restaurantResult.data.whatsapp_number,
        location: restaurantResult.data.location ?? 'Asadero y Restaurante',
        headline: restaurantResult.data.headline,
        description: restaurantResult.data.description,
        fulfillmentModes: normalizeFulfillmentModes(restaurantResult.data.fulfillment_modes),
        heroImage: restaurantResult.data.hero_image_url ?? getSeedById(branchId)?.restaurant.heroImage ?? '',
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

export function toProductRow(product: MenuItem, branchId: string, sortOrder = 0): ProductRow {
  return {
    id: product.id,
    branch_id: branchId,
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
