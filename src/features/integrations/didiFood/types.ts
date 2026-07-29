import type { CartLine, CustomerDetails } from '../../order/orderMessage'

export type DidiFoodDraftOrder = {
  restaurantId: string
  customerName: string
  deliveryAddress: string
  note: string
  items: Array<{
    productId: string
    name: string
    quantity: number
    unitPriceCop: number | null
    note: string
  }>
  totalCop: number
}

export function buildDidiFoodDraftOrder(
  restaurantId: string,
  lines: CartLine[],
  details: CustomerDetails,
): DidiFoodDraftOrder {
  return {
    restaurantId,
    customerName: details.name,
    deliveryAddress: details.address,
    note: details.note,
    totalCop: lines.reduce((sum, line) => sum + (line.item.price ?? 0) * line.quantity, 0),
    items: lines.map((line) => ({
      productId: line.item.id,
      name: line.item.name,
      quantity: line.quantity,
      unitPriceCop: line.item.price,
      note: line.note ?? '',
    })),
  }
}
