import { isE2EAdminMockEnabled } from '../../../lib/runtimeFlags'
import { getSupabaseClient, getSupabaseConfig } from '../../../services/menuRepository'
import type { InventoryData, MermaReason } from '../inventoryTypes'
import { fetchAdminScope } from './adminScopeRepository'
import {
  fetchMockInventory,
  registerMockMerma,
} from './adminMockRepository'

export async function fetchAdminInventory(): Promise<InventoryData> {
  if (isE2EAdminMockEnabled()) {
    return fetchMockInventory()
  }

  const supabase = getSupabaseClient()
  const scope = await fetchAdminScope()
  const branchId = scope.primaryBranchId ?? getSupabaseConfig().branchId

  const [itemsResult, stockResult, movementsResult] = await Promise.all([
    supabase.from('inventory_items').select('*').eq('branch_id', branchId).order('name', { ascending: true }),
    supabase.from('branch_stock').select('*').eq('branch_id', branchId),
    supabase
      .from('inventory_movements')
      .select('*')
      .eq('branch_id', branchId)
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

  const scope = await fetchAdminScope()
  const branchId = scope.primaryBranchId ?? getSupabaseConfig().branchId
  const { error } = await getSupabaseClient().rpc('register_merma', {
    p_branch_id: branchId,
    p_item_id: itemId,
    p_quantity: quantity,
    p_reason: reason,
  })

  if (error) throw new Error(error.message)
}
