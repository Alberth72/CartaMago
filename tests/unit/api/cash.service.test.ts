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

  const transactions = {
    createCashSessionSale: vi.fn().mockResolvedValue({
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
    transactions,
    service: new CashService(
      rpc as never,
      transactions as never,
    ),
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

  it('creates a terminal sale through the Nest-owned cash transaction service', async () => {
    const { rpc, transactions, service } = makeService()
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

    expect(transactions.createCashSessionSale).toHaveBeenCalledWith(input)
    expect(rpc.call).not.toHaveBeenCalledWith('create_cash_session_sale', expect.anything(), expect.anything())
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
