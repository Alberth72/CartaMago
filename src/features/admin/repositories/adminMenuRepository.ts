import type { MenuItem } from '../../../data/restaurantSeed'
import {
  getSupabaseClient,
  getSupabaseConfig,
  slugify,
  toProductRow,
  type CategoryRow,
  type ProductRow,
  type RestaurantRow,
} from '../../../services/menuRepository'
import type { AdminMenuData, AdminRestaurantForm } from '../types'

export async function fetchAdminMenu(): Promise<AdminMenuData> {
  const supabase = getSupabaseClient()
  const { restaurantId } = getSupabaseConfig()
  const [restaurantResult, categoriesResult, productsResult] = await Promise.all([
    supabase.from('restaurants').select('*').eq('id', restaurantId).single(),
    supabase.from('categories').select('*').eq('restaurant_id', restaurantId).order('sort_order', { ascending: true }),
    supabase.from('products').select('*').eq('restaurant_id', restaurantId).order('sort_order', { ascending: true }),
  ])

  if (restaurantResult.error || categoriesResult.error || productsResult.error) {
    throw new Error(restaurantResult.error?.message ?? categoriesResult.error?.message ?? productsResult.error?.message ?? 'No se pudo cargar el menu.')
  }

  const restaurantRow = restaurantResult.data as RestaurantRow

  return {
    restaurantForm: {
      name: restaurantRow.name,
      shortName: restaurantRow.short_name ?? '',
      whatsappNumber: restaurantRow.whatsapp_number,
      location: restaurantRow.location ?? '',
      headline: restaurantRow.headline,
      description: restaurantRow.description,
      socialHandle: restaurantRow.social_handle ?? '',
    },
    categories: ((categoriesResult.data ?? []) as CategoryRow[]).map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      image: category.image_url ?? undefined,
    })),
    products: ((productsResult.data ?? []) as ProductRow[]).map((product) => ({
      id: product.id,
      categoryId: product.category_id,
      name: product.name,
      description: product.description,
      price: product.price_cop,
      badge: product.badge ?? undefined,
      imageUrl: product.image_url ?? undefined,
      available: product.available,
    })),
  }
}

export async function upsertAdminCategory(name: string, description: string, sortOrder: number) {
  const { restaurantId } = getSupabaseConfig()
  const { error } = await getSupabaseClient().from('categories').upsert({
    id: slugify(name),
    restaurant_id: restaurantId,
    name: name.trim(),
    description: description.trim(),
    image_url: null,
    sort_order: sortOrder,
  })

  if (error) throw new Error(error.message)
}

export async function deleteAdminCategory(id: string) {
  const { error } = await getSupabaseClient().from('categories').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function updateAdminRestaurant(form: AdminRestaurantForm, whatsappNumber: string) {
  const { restaurantId } = getSupabaseConfig()
  const { error } = await getSupabaseClient()
    .from('restaurants')
    .update({
      name: form.name.trim(),
      short_name: form.shortName.trim() || null,
      whatsapp_number: whatsappNumber,
      location: form.location.trim() || null,
      headline: form.headline.trim(),
      description: form.description.trim(),
      social_handle: form.socialHandle.trim() || null,
    })
    .eq('id', restaurantId)

  if (error) throw new Error(error.message)
}

export async function upsertAdminProduct(product: MenuItem, sortOrder: number) {
  const { restaurantId } = getSupabaseConfig()
  const { error } = await getSupabaseClient()
    .from('products')
    .upsert(toProductRow(product, restaurantId, sortOrder))

  if (error) throw new Error(error.message)
}

export async function deleteAdminProduct(id: string) {
  const { error } = await getSupabaseClient().from('products').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function uploadAdminProductImage(file: File, productName: string) {
  const supabase = getSupabaseClient()
  const { restaurantId, storageBucket } = getSupabaseConfig()
  const extension = file.name.split('.').pop() ?? 'jpg'
  const productSlug = slugify(productName || 'producto')
  const path = `${restaurantId}/products/${productSlug}-${Date.now()}.${extension}`

  const { error } = await supabase.storage.from(storageBucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(storageBucket).getPublicUrl(path)
  return data.publicUrl
}