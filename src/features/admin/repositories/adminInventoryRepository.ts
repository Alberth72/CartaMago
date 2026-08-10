import { isE2EAdminMockEnabled } from '../../../lib/runtimeFlags'
import { getSupabaseClient, getSupabaseConfig } from '../../../services/menuRepository'
import type { InventoryData, MermaReason } from '../inventoryTypes'
import {
  fetchMockInventory,
  registerMockMerma,
} from './adminMockRepository'

export async function fetchAdminInventory(): Promise<InventoryData> {
  if (isE2EAdminMockEnabled()) {
    return fetchMockInventory()
  }

  const supabase = getSupabaseClient()
  const { restaurantId } = getSupabaseConfig()

  const [itemsResult, stockResult, movementsResult] = await Promise.all([
    supabase.from('inventory_items').select('*').eq('restaurant_id', restaurantId).order('name', { ascending: true }),
    supabase.from('inventory_stock').select('*').eq('restaurant_id', restaurantId),
    supabase
      .from('inventory_movements')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('movement_type', 'merma')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  if (itemsResult.error || stockResult.error || movementsResult.error) {
    throw new Error(
      itemsResult.error?.message ??
        stockResult.error?.message ??
        movementsResult.error?.message ??
        'No se pudo cargar el inventario.',
    )
  }

  return {
    items: (itemsResult.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      unit: row.unit,
      category: row.category,
    })),
    stock: (stockResult.data ?? []).map((row) => ({
      id: row.id,
      itemId: row.item_id,
      quantity: Number(row.quantity),
    })),
    movements: (movementsResult.data ?? []).map((row) => ({
      id: row.id,
      itemId: row.item_id,
      quantity: Number(row.quantity),
      movementType: row.movement_type,
      reason: row.reason,
      createdAt: row.created_at,
    })),
  }
}

export async function registerAdminMerma(itemId: string, quantity: number, reason: MermaReason) {
  if (isE2EAdminMockEnabled()) {
    await registerMockMerma(itemId, quantity, reason)
    return
  }

  const { restaurantId } = getSupabaseConfig()
  const { error } = await getSupabaseClient().rpc('register_merma', {
    p_restaurant_id: restaurantId,
    p_item_id: itemId,
    p_quantity: quantity,
    p_reason: reason,
  })

  if (error) throw new Error(error.message)
}