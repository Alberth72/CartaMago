import { useCallback, useMemo, useRef } from 'react'
import type { MenuItem, RestaurantProfile } from '../../../data/restaurantSeed'
import { useLocalStorage } from '../../../lib/useLocalStorage'
import { saveOrder } from '../../order/repositories/publicOrderRepository'
import { buildWhatsAppUrl, type CustomerDetails } from '../../order/orderMessage'

type CartState = Record<string, number>
type CartNotes = Record<string, string>
type CartLine = { item: MenuItem; quantity: number; note: string }

type UsePublicMenuOrderInput = {
  restaurantId: string
  restaurant: RestaurantProfile
  menuItems: MenuItem[]
}

export function usePublicMenuOrder({
  restaurantId,
  restaurant,
  menuItems,
}: UsePublicMenuOrderInput) {
  const [cart, setCart] = useLocalStorage<CartState>('cart', {})
  const [itemNotes, setItemNotes] = useLocalStorage<CartNotes>('item-notes', {})
  const [details, setDetails] = useLocalStorage<CustomerDetails>('order-details', {
    name: '',
    note: '',
    address: '',
    table: '',
    fulfillmentMode: 'pickup',
  })
  const orderPanelRef = useRef<HTMLElement | null>(null)
  const orderStartedAtRef = useRef(Date.now())

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([itemId, quantity]) => ({
          item: menuItems.find((item) => item.id === itemId),
          quantity,
          note: itemNotes[itemId] ?? '',
        }))
        .filter((line): line is CartLine => Boolean(line.item) && line.quantity > 0),
    [cart, menuItems, itemNotes],
  )

  const total = cartLines.reduce((sum, line) => sum + (line.item.price ?? 0) * line.quantity, 0)
  const hasUnknownPrices = cartLines.some((line) => line.item.price == null)
  const itemCount = cartLines.reduce((sum, line) => sum + line.quantity, 0)
  const whatsappUrl = buildWhatsAppUrl(restaurant, cartLines, details)

  const handleWhatsAppClick = useCallback(() => {
    const message = buildWhatsAppUrl(restaurant, cartLines, details)
    const decodedMessage = decodeURIComponent(message.split('?text=')[1] ?? '')
    const deliveryProvider =
      details.fulfillmentMode === 'local_delivery'
        ? 'local'
        : details.fulfillmentMode === 'didi_food'
          ? 'didi_food'
          : 'none'

    void saveOrder({
      restaurantId,
      orderChannel: 'cartamago',
      deliveryProvider,
      paymentStatus: 'not_required',
      externalProvider: details.fulfillmentMode === 'didi_food' ? 'didi_food' : undefined,
      externalStatus: details.fulfillmentMode === 'didi_food' ? 'draft' : undefined,
      customerName: details.name,
      customerNote: details.note,
      fulfillmentMode: details.fulfillmentMode,
      deliveryAddress: details.address,
      tableNumber: details.table,
      totalItems: itemCount,
      totalCop: total,
      whatsappMessage: decodedMessage,
      whatsappLink: message,
      orderStartedAt: orderStartedAtRef.current,
      website: '',
      items: cartLines.map((line) => ({
        productId: line.item.id,
        productName: line.item.name,
        quantity: line.quantity,
        unitPriceCop: line.item.price,
        lineNote: line.note,
      })),
    })
  }, [restaurant, restaurantId, cartLines, details, itemCount, total])

  function addItem(itemId: string) {
    setCart((current) => ({
      ...current,
      [itemId]: (current[itemId] ?? 0) + 1,
    }))
  }

  function removeItem(itemId: string) {
    setCart((current) => {
      const nextQuantity = (current[itemId] ?? 0) - 1
      if (nextQuantity <= 0) {
        const { [itemId]: _removed, ...rest } = current
        return rest
      }

      return {
        ...current,
        [itemId]: nextQuantity,
      }
    })
  }

  function clearItem(itemId: string) {
    setCart((current) => {
      const { [itemId]: _removed, ...rest } = current
      return rest
    })
  }

  function updateItemNote(itemId: string, note: string) {
    setItemNotes((current) => ({ ...current, [itemId]: note }))
  }

  function updateDetails(partial: Partial<CustomerDetails>) {
    setDetails((current) => ({ ...current, ...partial }))
  }

  function reviewOrder() {
    orderPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    orderPanelRef.current?.focus({ preventScroll: true })
  }

  function getItemQuantity(itemId: string) {
    return cart[itemId] ?? 0
  }

  function getItemNote(itemId: string) {
    return itemNotes[itemId] ?? ''
  }

  return {
    cartLines,
    details,
    total,
    hasUnknownPrices,
    itemCount,
    whatsappUrl,
    orderPanelRef,
    addItem,
    removeItem,
    clearItem,
    updateItemNote,
    updateDetails,
    reviewOrder,
    getItemQuantity,
    getItemNote,
    handleWhatsAppClick,
  }
}
