export type ReceiptLine = {
  id?: string
  productName: string
  quantity: number
  unitPriceCop: number | null
  lineTotalCop?: number
  lineNote?: string
}

export type ReceiptData = {
  receiptNumber: string
  orderId: string
  saleId?: string
  trackingToken?: string
  businessName: string
  branchName: string
  cashSessionName?: string
  channelLabel: string
  fulfillmentLabel: string
  paymentLabel: string
  paymentStatusLabel: string
  issuedAt: string
  customerName?: string | null
  tableNumber?: string | null
  items: ReceiptLine[]
  totalCop: number
  footer?: string
}
