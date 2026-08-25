import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ client: null as unknown }))

vi.mock('../../../src/services/supabaseClient', () => ({
  getSupabaseClient: () => h.client,
  getSupabaseConfig: () => ({ url: 'x', anonKey: 'y', branchId: 'brasas-sazon', storageBucket: 'menu-assets' }),
  isSupabaseConfigured: () => true,
}))
vi.mock('../../../src/lib/runtimeFlags', () => ({ isE2EAdminMockEnabled: () => false }))

import {
  createWarehousePurchaseOrder,
  receiveWarehousePurchaseOrder,
} from '../../../src/features/admin/repositories/adminWarehousePurchasingRepository'

function makeRpcClient(rpc: ReturnType<typeof vi.fn>) {
  return { rpc }
}

beforeEach(() => {
  h.client = makeRpcClient(vi.fn().mockResolvedValue({ data: null, error: null }))
})

describe('createWarehousePurchaseOrder', () => {
  it('returns the purchase order id and passes RPC arguments', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'po_1', error: null })
    h.client = makeRpcClient(rpc)

    await expect(
      createWarehousePurchaseOrder({
        warehouseId: 'w1',
        supplierId: 's1',
        itemId: 'carbon',
        quantity: 10,
        unitCost: 5000,
        notes: 'pedido',
      }),
    ).resolves.toBe('po_1')

    expect(rpc).toHaveBeenCalledWith('create_purchase_order', {
      p_warehouse_id: 'w1',
      p_supplier_id: 's1',
      p_items: [{ item_id: 'carbon', quantity: 10, unit_cost: 5000 }],
      p_notes: 'pedido',
    })
  })

  it('throws when the RPC fails', async () => {
    h.client = makeRpcClient(vi.fn().mockResolvedValue({ data: null, error: { message: 'sin stock' } }))

    await expect(
      createWarehousePurchaseOrder({
        warehouseId: 'w1',
        supplierId: 's1',
        itemId: 'carbon',
        quantity: 10,
        unitCost: 5000,
        notes: '',
      }),
    ).rejects.toThrow('sin stock')
  })
})

describe('receiveWarehousePurchaseOrder', () => {
  it('receives a purchase order into central stock', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null })
    h.client = makeRpcClient(rpc)

    await expect(receiveWarehousePurchaseOrder('po_1')).resolves.toBeUndefined()
    expect(rpc).toHaveBeenCalledWith('receive_purchase_order', { p_purchase_order_id: 'po_1' })
  })
})