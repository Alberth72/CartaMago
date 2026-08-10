import { useCallback, useMemo, useRef } from 'react'
import type { MenuItem, RestaurantProfile } from '../../../data/restaurantSeed'
import { useLocalStorage } from '../../../lib/useLocalStorage'
import { saveOrder } from '../../order/repositories/publicOrderRepository'
import { buildWhatsAppUrl, type CustomerDetails } from '../../order/orderMessage'
import {
  getDefaultPaymentMethod,
  getInitialPaymentStatus,
  getPaymentProvider,
  normalizePaymentMethod,
} from '../../order/payment'

type CartState = Record<string, number>
type CartNotes = Record<string, string>
type CartLine = { item: MenuItem; quantity: number; note: string }

const defaultCustomerDetails: CustomerDetails = {
  name: '',
  phone: '',
  note: '',
  address: '',
  table: '',
  fulfillmentMode: 'pickup',
  paymentMethod: 'cash',
}

type UsePublicMenuOrderInput = {
  branchId: string
  restaurant: RestaurantProfile
  menuItems: MenuItem[]
}

export function usePublicMenuOrder({
  branchId,
  restaurant,
  menuItems,
}: UsePublicMenuOrderInput) {
  const [storedCart, setCart] = useLocalStorage<unknown>('cart', {})
  const [storedItemNotes, setItemNotes] = useLocalStorage<unknown>('item-notes', {})
  const [storedDetails, setDetails] = useLocalStorage<unknown>('order-details', defaultCustomerDetails)
  const orderPanelRef = useRef<HTMLElement | null>(null)
  const orderStartedAtRef = useRef(Date.now())
  const cart = normalizeCart(storedCart)
  const itemNotes = normalizeCartNotes(storedItemNotes)
  const details = normalizeCustomerDetails(storedDetails)

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
      branchId,
      orderChannel: 'cartamago',
      deliveryProvider,
      paymentStatus: getInitialPaymentStatus(details.paymentMethod),
      paymentMethod: details.paymentMethod,
      paymentProvider: getPaymentProvider(details.paymentMethod),
      externalProvider: details.fulfillmentMode === 'didi_food' ? 'didi_food' : undefined,
      externalStatus:
        details.fulfillmentMode === 'didi_food'
          ? 'draft'
          : details.paymentMethod === 'wompi'
            ? 'payment_link_required'
            : undefined,
      customerName: details.name,
      customerPhone: details.phone,
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
  }, [restaurant, branchId, cartLines, details, itemCount, total])

  function addItem(itemId: string) {
    setCart((current: unknown) => {
      const currentCart = normalizeCart(current)
      return {
        ...currentCart,
        [itemId]: (currentCart[itemId] ?? 0) + 1,
      }
    })
  }

  function removeItem(itemId: string) {
    setCart((current: unknown) => {
      const currentCart = normalizeCart(current)
      const nextQuantity = (currentCart[itemId] ?? 0) - 1
      if (nextQuantity <= 0) {
        const { [itemId]: _removed, ...rest } = currentCart
        return rest
      }

      return {
        ...currentCart,
        [itemId]: nextQuantity,
      }
    })
  }

  function clearItem(itemId: string) {
    setCart((current: unknown) => {
      const { [itemId]: _removed, ...rest } = normalizeCart(current)
      return rest
    })
  }

  function updateItemNote(itemId: string, note: string) {
    setItemNotes((current: unknown) => ({ ...normalizeCartNotes(current), [itemId]: note }))
  }

  function updateDetails(partial: Partial<CustomerDetails>) {
    setDetails((current: unknown) => {
      const currentDetails = normalizeCustomerDetails(current)
      const nextFulfillmentMode = partial.fulfillmentMode ?? currentDetails.fulfillmentMode
      const nextPaymentMethod =
        partial.paymentMethod ??
        (partial.fulfillmentMode
          ? getDefaultPaymentMethod(nextFulfillmentMode)
          : currentDetails.paymentMethod)

      return {
        ...currentDetails,
        ...partial,
        paymentMethod: normalizePaymentMethod(nextPaymentMethod, nextFulfillmentMode),
      }
    })
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

function normalizeCart(value: unknown): CartState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  const cart: CartState = {}
  for (const [itemId, quantity] of Object.entries(value as Record<string, unknown>)) {
    if (typeof quantity === 'number' && Number.isFinite(quantity) && quantity > 0) {
      cart[itemId] = quantity
    }
  }
  return cart
}

function normalizeCartNotes(value: unknown): CartNotes {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  const notes: CartNotes = {}
  for (const [itemId, note] of Object.entries(value as Record<string, unknown>)) {
    if (typeof note === 'string') {
      notes[itemId] = note
    }
  }
  return notes
}

function normalizeCustomerDetails(value: unknown): CustomerDetails {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaultCustomerDetails

  const candidate = value as Partial<Record<keyof CustomerDetails, unknown>>
  const fulfillmentMode = candidate.fulfillmentMode
  const normalizedFulfillmentMode =
    fulfillmentMode === 'pickup' ||
    fulfillmentMode === 'local_delivery' ||
    fulfillmentMode === 'didi_food' ||
    fulfillmentMode === 'table'
      ? fulfillmentMode
      : 'pickup'

  return {
    name: typeof candidate.name === 'string' ? candidate.name : '',
    phone: typeof candidate.phone === 'string' ? candidate.phone : '',
    note: typeof candidate.note === 'string' ? candidate.note : '',
    address: typeof candidate.address === 'string' ? candidate.address : '',
    table: typeof candidate.table === 'string' ? candidate.table : '',
    fulfillmentMode: normalizedFulfillmentMode,
    paymentMethod: normalizePaymentMethod(candidate.paymentMethod, normalizedFulfillmentMode),
  }
}
