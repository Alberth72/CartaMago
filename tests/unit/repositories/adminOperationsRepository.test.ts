import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ client: null as unknown }))

vi.mock('../../../src/services/supabaseClient', () => ({
  getSupabaseClient: () => h.client,
  getSupabaseConfig: () => ({ url: 'x', anonKey: 'y', branchId: 'brasas-sazon', storageBucket: 'menu-assets' }),
  isSupabaseConfigured: () => true,
}))
vi.mock('../../../src/lib/runtimeFlags', () => ({ isE2EAdminMockEnabled: () => false }))

import {
  closeAdminCashSession,
  createAdminSale,
  dispatchAdminRequest,
  openAdminCashSession,
  receiveAdminDispatch,
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

describe('cash sessions', () => {
  it('opens a cash session with branch and opening amount', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'cash_1', error: null })
    h.client = makeRpcClient(rpc)

    await expect(openAdminCashSession({
      branchId: 'brasas-sazon',
      name: 'Caja 1',
      openingCashCop: 100000,
      notes: 'Turno manana',
    })).resolves.toBe('cash_1')

    expect(rpc).toHaveBeenCalledWith('open_cash_session', {
      p_branch_id: 'brasas-sazon',
      p_opening_cash_cop: 100000,
      p_notes: 'Turno manana',
      p_name: 'Caja 1',
    })
  })

  it('closes a cash session with closing amount', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null })
    h.client = makeRpcClient(rpc)

    await expect(closeAdminCashSession({
      cashSessionId: 'cash_1',
      closingCashCop: 126000,
      notes: 'Cuadre ok',
    })).resolves.toBeUndefined()

    expect(rpc).toHaveBeenCalledWith('close_cash_session', {
      p_cash_session_id: 'cash_1',
      p_closing_cash_cop: 126000,
      p_notes: 'Cuadre ok',
    })
  })
})

describe('createAdminSale', () => {
  it('creates a sale with payment data', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null })
    h.client = makeRpcClient(rpc)

    await expect(createAdminSale({
      branchId: 'brasas-sazon',
      items: [
        { productId: 'pollo-entero', quantity: 1 },
        { productId: 'limonada-natural', quantity: 2 },
      ],
      paymentMethod: 'cash',
      paymentReference: '',
      cashSessionId: 'cash_1',
    })).resolves.toBeUndefined()
    expect(rpc).toHaveBeenCalledWith('create_sale', {
      p_branch_id: 'brasas-sazon',
      p_items: [
        { product_id: 'pollo-entero', quantity: 1 },
        { product_id: 'limonada-natural', quantity: 2 },
      ],
      p_payment_method: 'cash',
      p_payment_reference: '',
      p_cash_session_id: 'cash_1',
    })
  })
})
