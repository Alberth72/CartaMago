export const SALE_PAYMENT_METHODS = ['cash', 'card_at_counter', 'card_at_table', 'bank_transfer', 'wompi', 'didi_food'] as const

export type SalePaymentMethod = (typeof SALE_PAYMENT_METHODS)[number]

export type SaleCartItemInput = {
  productId: string
  quantity: number
}

export type CreateAdminSaleInput = {
  branchId: string
  items: SaleCartItemInput[]
  paymentMethod: SalePaymentMethod
  paymentReference: string
  cashSessionId?: string | null
}

export type CreateCashSessionSaleInput = {
  cashSessionId: string
  accessToken: string
  items: SaleCartItemInput[]
  paymentMethod: SalePaymentMethod
  paymentReference: string
}

export type CashSaleResult = {
  saleId: string
  orderId: string
  receiptNumber: string
  trackingToken: string
  totalCop: number
  paymentStatus: string
  cashSessionId: string | null
}
