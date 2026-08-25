import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ client: null as unknown }))

vi.mock('../../../src/services/supabaseClient', () => ({
  getSupabaseClient: () => h.client,
  getSupabaseConfig: () => ({ url: 'x', anonKey: 'y', branchId: 'brasas-sazon', storageBucket: 'menu-assets' }),
  isSupabaseConfigured: () => true,
}))
vi.mock('../../../src/lib/runtimeFlags', () => ({ isE2EAdminMockEnabled: () => false }))

import { fetchOrders, updateOrderStatus } from '../../../src/features/admin/repositories/adminOrderRepository'

function builder(result: () => { data: unknown; error: unknown }) {
  const target: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'order', 'in', 'limit', 'single', 'update', 'insert', 'upsert']
  for (const method of methods) target[method] = () => target
  ;(target as { then: unknown }).then = (resolve: (value: unknown) => void) => {
    resolve(result())
    return undefined
  }
  return target
}

function makeClient(overrides: { orders?: { data: unknown; error: unknown }; items?: { data: unknown; error: unknown } }) {
  return {
    from: (table: string) =>
      table === 'orders'
        ? builder(() => overrides.orders ?? { data: [], error: null })
        : builder(() => overrides.items ?? { data: [], error: null }),
    rpc: () => ({ data: null, error: null }),
    auth: {},
  }
}

beforeEach(() => {
  h.client = makeClient({})
})

describe('fetchOrders', () => {
  it('fetches orders and attaches their items', async () => {
    h.client = makeClient({
      orders: { data: [{ id: 'o1', status: 'pending' }], error: null },
      items: { data: [{ id: 'i1', order_id: 'o1', name: 'Pollo' }], error: null },
    })

    const orders = await fetchOrders('brasas-sazon')

    expect(orders).toHaveLength(1)
    expect((orders[0] as { items: unknown[] }).items).toEqual([{ id: 'i1', order_id: 'o1', name: 'Pollo' }])
  })

  it('returns an empty list when a query errors', async () => {
    h.client = makeClient({ orders: { data: null, error: { message: 'boom' } } })

    await expect(fetchOrders('brasas-sazon')).resolves.toEqual([])
  })
})

describe('updateOrderStatus', () => {
  it('returns true when the update succeeds', async () => {
    h.client = makeClient({ orders: { data: null, error: null } })

    await expect(updateOrderStatus('o1', 'confirmed')).resolves.toBe(true)
  })

  it('returns false when the update errors', async () => {
    h.client = {
      from: () => builder(() => ({ data: null, error: { message: 'x' } })),
      rpc: () => ({ data: null, error: null }),
    }

    await expect(updateOrderStatus('o1', 'confirmed')).resolves.toBe(false)
  })
})