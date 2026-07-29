export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'

export type OrderRow = {
  id: string
  restaurant_id: string
  status: OrderStatus
  order_channel?: string
  delivery_provider?: string
  payment_status?: string
  external_provider?: string | null
  external_order_id?: string | null
  external_status?: string | null
  external_payload?: Record<string, unknown>
  customer_name: string
  customer_note: string
  fulfillment_mode: string
  delivery_address: string
  table_number: string
  total_items: number
  total_cop: number
  whatsapp_message: string
  whatsapp_link: string
  created_at: string
  updated_at: string
}

export type OrderItemRow = {
  id: string
  order_id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price_cop: number | null
  line_note: string
  sort_order: number
}

export type OrderWithItems = OrderRow & { items: OrderItemRow[] }

export type SaveOrderInput = {
  restaurantId: string
  orderChannel?: string
  deliveryProvider?: string
  paymentStatus?: string
  externalProvider?: string
  externalOrderId?: string
  externalStatus?: string
  externalPayload?: Record<string, unknown>
  customerName: string
  customerNote: string
  fulfillmentMode: string
  deliveryAddress: string
  tableNumber: string
  totalItems: number
  totalCop: number
  whatsappMessage: string
  whatsappLink: string
  orderStartedAt?: number
  website?: string
  captchaToken?: string
  items: Array<{
    productId: string
    productName: string
    quantity: number
    unitPriceCop: number | null
    lineNote: string
  }>
}
