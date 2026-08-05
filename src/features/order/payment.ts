import type { FulfillmentMode } from '../../data/restaurantSeed'

export type PaymentMethod =
  | 'cash'
  | 'card_at_counter'
  | 'card_at_table'
  | 'bank_transfer'
  | 'wompi'
  | 'didi_food'

export type PaymentStatus = 'not_required' | 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded'

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card_at_counter: 'Tarjeta en caja',
  card_at_table: 'Tarjeta en mesa',
  bank_transfer: 'Transferencia',
  wompi: 'Wompi online',
  didi_food: 'Pago en DiDiFood',
}

export const paymentMethodHelp: Record<PaymentMethod, string> = {
  cash: 'El local cobra al entregar, recoger o servir el pedido.',
  card_at_counter: 'El cliente paga con datafono al recoger en caja.',
  card_at_table: 'El cliente paga con datafono o cierre de cuenta en mesa.',
  bank_transfer: 'El local valida el comprobante antes de cerrar el pedido.',
  wompi: 'Pago online preparado para enlace o checkout Wompi generado desde backend.',
  didi_food: 'El pago lo administra DiDiFood dentro de su canal oficial.',
}

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  not_required: 'No aplica',
  pending: 'Pago pendiente',
  paid: 'Pagado',
  failed: 'Pago fallido',
  cancelled: 'Pago cancelado',
  refunded: 'Reembolsado',
}

export const paymentStatusColors: Record<PaymentStatus, string> = {
  not_required: 'bg-stone-100 text-stone-500 border-stone-200',
  pending: 'bg-amber-100 text-amber-800 border-amber-300',
  paid: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  failed: 'bg-red-100 text-red-800 border-red-300',
  cancelled: 'bg-stone-100 text-stone-500 border-stone-200',
  refunded: 'bg-blue-100 text-blue-800 border-blue-300',
}

export const paymentMethodsByFulfillment: Record<FulfillmentMode, PaymentMethod[]> = {
  pickup: ['cash', 'card_at_counter', 'bank_transfer', 'wompi'],
  local_delivery: ['cash', 'bank_transfer', 'wompi'],
  table: ['cash', 'card_at_table', 'bank_transfer', 'wompi'],
  didi_food: ['didi_food'],
}

export function getDefaultPaymentMethod(fulfillmentMode: FulfillmentMode) {
  return paymentMethodsByFulfillment[fulfillmentMode][0]
}

export function normalizePaymentMethod(
  value: unknown,
  fulfillmentMode: FulfillmentMode,
): PaymentMethod {
  const allowed = paymentMethodsByFulfillment[fulfillmentMode]
  return allowed.includes(value as PaymentMethod)
    ? value as PaymentMethod
    : getDefaultPaymentMethod(fulfillmentMode)
}

export function getPaymentProvider(paymentMethod: PaymentMethod) {
  if (paymentMethod === 'wompi') return 'wompi'
  if (paymentMethod === 'didi_food') return 'didi_food'
  return 'manual'
}

export function getInitialPaymentStatus(paymentMethod: PaymentMethod): PaymentStatus {
  if (paymentMethod === 'cash' || paymentMethod === 'card_at_counter' || paymentMethod === 'card_at_table') {
    return 'pending'
  }
  if (paymentMethod === 'bank_transfer' || paymentMethod === 'wompi' || paymentMethod === 'didi_food') {
    return 'pending'
  }
  return 'not_required'
}
