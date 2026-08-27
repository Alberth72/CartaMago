import type { OrderStatus } from '../order/types'

export type CustomerTrackingItem = {
  product_name: string
  quantity: number
  unit_price_cop: number | null
  line_note: string
}

export type CustomerTrackingView = {
  orderId: string
  receiptNumber: string
  businessName: string
  branchName: string
  orderChannel: string
  status: OrderStatus
  fulfillmentMode: string
  paymentMethod: string
  paymentStatus: string
  totalCop: number
  whatsappLink: string
  createdAt: string
  updatedAt: string
  customerName: string | null
  tableNumber: string | null
  items: CustomerTrackingItem[]
}
