import { describe, expect, it, vi } from 'vitest'
import { CashService } from '../../../apps/api/src/cash/cash.service'

function makeService() {
  const rpc = {
    call: vi.fn().mockResolvedValue({
      saleId: 'sale_1',
      orderId: 'ord_1',
      receiptNumber: 'BS-001',
      trackingToken: 'tk_1',
      totalCop: 42000,
      paymentStatus: 'paid',
      cashSessionId: 'cash_1',
    }),
  }

  return {
    rpc,
    service: new CashService(rpc),
  }
}

describe('CashService', () => {
  it('creates an admin sale through the existing create_sale RPC', async () => {
    const { rpc, service } = makeService()
    const input = service.parseAdminSaleInput({
      branchId: 'brasas-sazon',
      items: [{ productId: 'pollo-entero', quantity: 1 }],
      paymentMethod: 'cash',
      paymentReference: '',
      cashSessionId: 'cash_1',
    })

    await expect(service.createAdminSale(input, 'Bearer token_1')).resolves.toMatchObject({
      saleId: 'sale_1',
      receiptNumber: 'BS-001',
    })

    expect(rpc.call).toHaveBeenCalledWith('create_sale', {
      p_branch_id: 'brasas-sazon',
      p_items: [{ product_id: 'pollo-entero', quantity: 1 }],
      p_payment_method: 'cash',
      p_payment_reference: '',
      p_cash_session_id: 'cash_1',
    }, 'Bearer token_1')
  })

  it('creates a terminal sale through the existing create_cash_session_sale RPC', async () => {
    const { rpc, service } = makeService()
    const input = service.parseCashSessionSaleInput({
      cashSessionId: 'cash_1',
      accessToken: 'access_1',
      items: [{ productId: 'limonada-natural', quantity: 2 }],
      paymentMethod: 'card_at_counter',
      paymentReference: 'voucher 123',
    })

    await expect(service.createCashSessionSale(input)).resolves.toMatchObject({
      orderId: 'ord_1',
      totalCop: 42000,
    })

    expect(rpc.call).toHaveBeenCalledWith('create_cash_session_sale', {
      p_cash_session_id: 'cash_1',
      p_access_token: 'access_1',
      p_items: [{ product_id: 'limonada-natural', quantity: 2 }],
      p_payment_method: 'card_at_counter',
      p_payment_reference: 'voucher 123',
    })
  })

  it('requires a bearer token for admin sales', async () => {
    const { service } = makeService()
    const input = service.parseAdminSaleInput({
      branchId: 'brasas-sazon',
      items: [{ productId: 'pollo-entero', quantity: 1 }],
      paymentMethod: 'cash',
    })

    await expect(service.createAdminSale(input)).rejects.toThrow('Admin sale requires a Supabase bearer token.')
  })
})
