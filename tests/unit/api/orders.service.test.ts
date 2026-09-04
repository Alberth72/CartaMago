import { describe, expect, it, vi } from 'vitest'
import { OrdersService } from '../../../apps/api/src/orders/orders.service'

function makeService() {
  const rpc = {
    call: vi.fn().mockResolvedValue({
      saleId: 'sale_1',
      orderId: 'ord_1',
      receiptNumber: 'BS-001',
      trackingToken: 'tk_1',
      totalCop: 42000,
      paymentStatus: 'paid',
      cashSessionId: null,
    }),
  }

  return {
    rpc,
    service: new OrdersService(rpc as never),
  }
}

describe('OrdersService', () => {
  it('confirms an order payment through the canonical sales RPC', async () => {
    const { rpc, service } = makeService()
    const input = service.parseConfirmPaymentInput({
      orderId: 'ord_1',
      cashSessionId: '',
      paymentReference: 'transferencia 123',
    })

    await expect(service.confirmPayment(input, 'Bearer token_1')).resolves.toMatchObject({
      saleId: 'sale_1',
      receiptNumber: 'BS-001',
    })

    expect(rpc.call).toHaveBeenCalledWith('confirm_order_payment', {
      p_order_id: 'ord_1',
      p_cash_session_id: null,
      p_payment_reference: 'transferencia 123',
    }, 'Bearer token_1')
  })

  it('requires a bearer token for payment confirmation', async () => {
    const { service } = makeService()
    const input = service.parseConfirmPaymentInput({ orderId: 'ord_1' })

    await expect(service.confirmPayment(input)).rejects.toThrow(
      'Order payment confirmation requires a Supabase bearer token.',
    )
  })
})
