import type { FulfillmentMode, MenuItem, RestaurantProfile } from '../../data/restaurantSeed'
import { formatCurrency, formatMenuPrice } from '../../lib/format'
import { paymentMethodLabels, type PaymentMethod } from './payment'

export type CartLine = {
  item: MenuItem
  quantity: number
  note?: string
}

export type CustomerDetails = {
  name: string
  phone: string
  note: string
  address: string
  table: string
  fulfillmentMode: FulfillmentMode
  paymentMethod: PaymentMethod
}

const fulfillmentLabels: Record<FulfillmentMode, string> = {
  pickup: 'Recoger en el local',
  local_delivery: 'Domicilio con mensajeria del local',
  didi_food: 'Domicilio por DiDiFood',
  table: 'Mesa',
}

export function buildWhatsAppUrl(
  restaurant: RestaurantProfile,
  lines: CartLine[],
  details: CustomerDetails,
) {
  const total = lines.reduce((sum, line) => sum + (line.item.price ?? 0) * line.quantity, 0)
  const hasUnknownPrices = lines.some((line) => line.item.price == null)
  const itemLines = lines
    .map((line) => {
      const lineTotal =
        line.item.price == null
          ? (line.item.priceNote ?? 'precio por confirmar')
          : formatCurrency(line.item.price * line.quantity)
      const lineNote = line.note ? ` (${line.note})` : ''
      return `- ${line.quantity} x ${line.item.name}${lineNote}: ${lineTotal}`
    })
    .join('\n')

  const fulfillmentDetail =
    details.fulfillmentMode === 'local_delivery'
      ? `Direccion domicilio local: ${details.address || 'por confirmar'}`
      : details.fulfillmentMode === 'didi_food'
        ? `Direccion DiDiFood: ${details.address || 'por confirmar'}`
      : details.fulfillmentMode === 'table'
        ? `Mesa: ${details.table || 'por confirmar'}`
        : 'Cliente recoge en el local'

  const message = [
    `Hola, quiero hacer este pedido en ${restaurant.name}:`,
    '',
    itemLines,
    '',
    hasUnknownPrices
      ? `Total: ${total > 0 ? `${formatCurrency(total)} + precios por confirmar` : 'por confirmar'}`
      : `Total aproximado: ${formatMenuPrice(total)}`,
    `Entrega: ${fulfillmentLabels[details.fulfillmentMode]}`,
    fulfillmentDetail,
    `Pago: ${paymentMethodLabels[details.paymentMethod]}`,
    details.name ? `Nombre: ${details.name}` : 'Nombre: por confirmar',
    details.phone ? `Telefono: ${details.phone}` : 'Telefono: por confirmar',
    details.note ? `Notas: ${details.note}` : '',
    '',
    'Quedo atento a confirmacion de disponibilidad y tiempo de entrega.',
  ]
    .filter(Boolean)
    .join('\n')

  return `https://wa.me/${restaurant.whatsappNumber}?text=${encodeURIComponent(message)}`
}
