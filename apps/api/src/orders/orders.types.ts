export const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'] as const

export type OrderStatus = typeof ORDER_STATUSES[number]

export type UpdateOrderStatusInput = {
  orderId: string
  status: OrderStatus
}

export type ConfirmOrderPaymentInput = {
  orderId: string
  cashSessionId: string | null
  paymentReference: string
}

export type WhatsAppNotificationResult = {
  status: 'skipped' | 'sent' | 'failed'
  destinationPhone?: string
  providerMessageId?: string
  errorCode?: string
  errorMessage?: string
  templateName?: string
}
