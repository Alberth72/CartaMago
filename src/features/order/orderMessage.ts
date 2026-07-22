import type { FulfillmentMode, MenuItem, RestaurantProfile } from '../../data/demoMenu'
import { formatCurrency } from '../../lib/format'

export type CartLine = {
  item: MenuItem
  quantity: number
}

export type CustomerDetails = {
  name: string
  note: string
  address: string
  table: string
  fulfillmentMode: FulfillmentMode
}

const fulfillmentLabels: Record<FulfillmentMode, string> = {
  pickup: 'Recoger en el local',
  delivery: 'Domicilio',
  table: 'Mesa',
}

export function buildWhatsAppUrl(
  restaurant: RestaurantProfile,
  lines: CartLine[],
  details: CustomerDetails,
) {
  const total = lines.reduce((sum, line) => sum + line.item.price * line.quantity, 0)
  const itemLines = lines
    .map((line) => {
      const lineTotal = formatCurrency(line.item.price * line.quantity)
      return `- ${line.quantity} x ${line.item.name}: ${lineTotal}`
    })
    .join('\n')

  const fulfillmentDetail =
    details.fulfillmentMode === 'delivery'
      ? `Direccion: ${details.address || 'por confirmar'}`
      : details.fulfillmentMode === 'table'
        ? `Mesa: ${details.table || 'por confirmar'}`
        : 'Cliente recoge en el local'

  const message = [
    `Hola, quiero hacer este pedido en ${restaurant.name}:`,
    '',
    itemLines,
    '',
    `Total aproximado: ${formatCurrency(total)}`,
    `Entrega: ${fulfillmentLabels[details.fulfillmentMode]}`,
    fulfillmentDetail,
    details.name ? `Nombre: ${details.name}` : 'Nombre: por confirmar',
    details.note ? `Notas: ${details.note}` : '',
    '',
    'Quedo atento a confirmacion de disponibilidad y tiempo de entrega.',
  ]
    .filter(Boolean)
    .join('\n')

  return `https://wa.me/${restaurant.whatsappNumber}?text=${encodeURIComponent(message)}`
}
