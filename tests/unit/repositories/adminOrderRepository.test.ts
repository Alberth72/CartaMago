import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ client: null as unknown }))

vi.mock('../../../src/services/supabaseClient', () => ({
  getSupabaseClient: () => h.client,
  getSupabaseConfig: () => ({ url: 'x', anonKey: 'y', branchId: 'brasas-sazon', storageBucket: 'menu-assets' }),
  isSupabaseConfigured: () => true,
}))
vi.mock('../../../src/lib/runtimeFlags', () => ({ isE2EAdminMockEnabled: () => false }))
vi.mock('../../../src/services/apiClient', () => ({
  ApiRequestError: class ApiRequestError extends Error {
    status = 0
  },
  shouldFallbackToSupabase: (error: unknown) => {
    const candidate = error as { status?: number } | null
    return candidate == null || candidate.status == null || candidate.status === 0 || candidate.status >= 500
  },
  postApiJson: vi.fn().mockRejectedValue(new Error('CartaMago API is not configured.')),
}))

import { confirmOrderPayment, fetchOrders, updateOrderStatus } from '../../../src/features/admin/repositories/adminOrderRepository'
import { postApiJson } from '../../../src/services/apiClient'

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
    auth: {
      getSession: async () => ({ data: { session: null } }),
    },
  }
}

beforeEach(() => {
  h.client = makeClient({})
  vi.mocked(postApiJson).mockRejectedValue(new Error('CartaMago API is not configured.'))
})

afterEach(() => {
  vi.restoreAllMocks()
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
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
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
      auth: {
        getSession: async () => ({ data: { session: null } }),
      },
    }

    await expect(updateOrderStatus('o1', 'confirmed')).resolves.toBe(false)
  })
})

describe('confirmOrderPayment', () => {
  it('returns true when the payment confirmation succeeds through the API', async () => {
    vi.mocked(postApiJson).mockResolvedValue({ ok: true })

    await expect(confirmOrderPayment('o1')).resolves.toBe(true)

    expect(postApiJson).toHaveBeenCalledWith('orders/payment', { orderId: 'o1' }, undefined)
  })

  it('falls back to the confirmation RPC when the API is unavailable', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { saleId: 'sale_1' }, error: null })
    h.client = {
      from: () => builder(() => ({ data: null, error: null })),
      rpc,
      auth: {
        getSession: async () => ({ data: { session: null } }),
      },
    }

    await expect(confirmOrderPayment('o1')).resolves.toBe(true)

    expect(rpc).toHaveBeenCalledWith('confirm_order_payment', {
      p_order_id: 'o1',
      p_cash_session_id: null,
      p_payment_reference: '',
    })
  })
})
