import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ client: null as unknown }))

vi.mock('../../../src/services/supabaseClient', () => ({
  getSupabaseClient: () => h.client,
  getSupabaseConfig: () => ({ url: 'x', anonKey: 'y', branchId: 'brasas-sazon', storageBucket: 'menu-assets' }),
  isSupabaseConfigured: () => true,
}))
vi.mock('../../../src/lib/runtimeFlags', () => ({ isE2EAdminMockEnabled: () => false }))

import {
  dispatchAdminRequest,
  receiveAdminDispatch,
  sellAdminProduct,
} from '../../../src/features/admin/repositories/adminOperationsRepository'

function makeRpcClient(rpc: ReturnType<typeof vi.fn>) {
  return { rpc }
}

beforeEach(() => {
  h.client = makeRpcClient(vi.fn().mockResolvedValue({ data: null, error: null }))
})

describe('dispatchAdminRequest', () => {
  it('returns the dispatch id and passes RPC arguments', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'dsp_1', error: null })
    h.client = makeRpcClient(rpc)

    await expect(dispatchAdminRequest('drq_1')).resolves.toBe('dsp_1')
    expect(rpc).toHaveBeenCalledWith('dispatch_request', { p_dispatch_request_id: 'drq_1' })
  })

  it('throws when the RPC fails', async () => {
    h.client = makeRpcClient(vi.fn().mockResolvedValue({ data: null, error: { message: 'stock insuficiente' } }))

    await expect(dispatchAdminRequest('drq_1')).rejects.toThrow('stock insuficiente')
  })
})

describe('receiveAdminDispatch', () => {
  it('receives a dispatch at the branch', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null })
    h.client = makeRpcClient(rpc)

    await expect(receiveAdminDispatch('dsp_1')).resolves.toBeUndefined()
    expect(rpc).toHaveBeenCalledWith('receive_dispatch', { p_dispatch_id: 'dsp_1' })
  })
})

describe('sellAdminProduct', () => {
  it('sells a product and sends option ids', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null })
    h.client = makeRpcClient(rpc)

    await expect(sellAdminProduct('brasas-sazon', 'pollo-entero', 1)).resolves.toBeUndefined()
    expect(rpc).toHaveBeenCalledWith('sell_product', {
      p_branch_id: 'brasas-sazon',
      p_product_id: 'pollo-entero',
      p_quantity: 1,
      p_option_ids: [],
    })
  })
})