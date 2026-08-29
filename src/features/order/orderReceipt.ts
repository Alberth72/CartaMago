import type { FulfillmentMode } from '../../data/restaurantSeed'
import type { RestaurantProfile } from '../../data/restaurantSeed'
import type { MenuItem } from '../../data/restaurantSeed'
import type { ReceiptData, ReceiptLine } from '../receipt/receiptTypes'
import { paymentMethodLabels, paymentStatusLabels, type PaymentMethod, type PaymentStatus } from './payment'

const fulfillmentLabels: Record<FulfillmentMode, string> = {
  pickup: 'Recoger',
  local_delivery: 'Domicilio local',
  didi_food: 'DiDiFood',
  table: 'Mesa',
}

/**
 * Snapshot de recibo que se muestra en pantalla cuando el cliente confirma el
 * pedido por WhatsApp. Se construye primero en el navegador (para que el recibo
 * exista siempre, incluso si el backend `create-order` falla en silencio y luego
 * se reconcilian los ids del servidor cuando la persistencia responde).
 *
 * Reutiliza `ReceiptData` / `ReceiptCard` compartidos con caja y tracking, y los
 * labels de `admin/orderUi` y `order/payment`.
 */
export type OrderReceiptDraft = {
  orderId: string
  trackingToken: string
  restaurant: RestaurantProfile
  branchName?: string
  cartLines: Array<{ item: MenuItem; quantity: number; note?: string }>
  total: number
  customerName?: string
  tableNumber?: string
  fulfillmentMode: FulfillmentMode
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  createdAt?: string
}

export function buildOrderReceipt(draft: OrderReceiptDraft): ReceiptData {
  const items: ReceiptLine[] = draft.cartLines.map((line, index) => ({
    id: `${draft.orderId}:item:${index}`,
    productName: line.item.name,
    quantity: line.quantity,
    unitPriceCop: line.item.price,
    lineNote: line.note || undefined,
  }))

  return {
    receiptNumber: makeReceiptNumber(draft.orderId),
    orderId: draft.orderId,
    trackingToken: draft.trackingToken,
    businessName: draft.restaurant.name,
    branchName: draft.branchName ?? draft.restaurant.shortName ?? draft.restaurant.name,
    channelLabel: 'CartaMago',
    fulfillmentLabel: fulfillmentLabels[draft.fulfillmentMode] ?? draft.fulfillmentMode,
    paymentLabel: paymentMethodLabels[draft.paymentMethod] ?? draft.paymentMethod,
    paymentStatusLabel: paymentStatusLabels[draft.paymentStatus] ?? 'Pago pendiente',
    issuedAt: draft.createdAt ?? new Date().toISOString(),
    customerName: draft.customerName || null,
    tableNumber: draft.tableNumber || null,
    items,
    totalCop: draft.total,
    footer:
      'Pedido recibido. El local confirma por WhatsApp disponibilidad, tiempos y pago.',
  }
}

export function makeReceiptNumber(orderId: string) {
  const digits = orderId.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  return `PED-${digits.slice(0, 10)}`
}

export function makeLocalOrderId(prefix = 'ord') {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${ts}_${rand}`
}

export function makeLocalTrackingToken(prefix = 'tk') {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${ts}_${rand}`
}