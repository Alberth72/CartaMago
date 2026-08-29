import { useCallback, useMemo, useRef, useState } from 'react'
import type { MenuItem, RestaurantProfile } from '../../../data/restaurantSeed'
import { makeBranchLinks } from '../../../lib/branchLinks'
import { useLocalStorage } from '../../../lib/useLocalStorage'
import { saveOrder, type SaveOrderResult } from '../../order/repositories/publicOrderRepository'
import { buildWhatsAppUrl, type CustomerDetails } from '../../order/orderMessage'
import type { ReceiptData } from '../../receipt/receiptTypes'
import { saveReceiptTrackingFallback } from '../../receipt/receiptFallbackStorage'
import {
  buildOrderReceipt,
  makeLocalOrderId,
  makeLocalTrackingToken,
} from '../../order/orderReceipt'
import {
  getDefaultPaymentMethod,
  getInitialPaymentStatus,
  getPaymentProvider,
  normalizePaymentMethod,
} from '../../order/payment'

type CartState = Record<string, number>
type CartNotes = Record<string, string>
type CartLine = { item: MenuItem; quantity: number; note: string }
type SubmissionStatus = 'idle' | 'saving' | 'saved' | 'failed'

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
  const storagePrefix = `branch:${branchId}`
  const [storedCart, setCart] = useLocalStorage<unknown>(`${storagePrefix}:cart`, {})
  const [storedItemNotes, setItemNotes] = useLocalStorage<unknown>(`${storagePrefix}:item-notes`, {})
  const [storedDetails, setDetails] = useLocalStorage<unknown>(`${storagePrefix}:order-details`, defaultCustomerDetails)
  const orderPanelRef = useRef<HTMLElement | null>(null)
  const [lastTrackingToken, setLastTrackingToken] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const [receiptSaved, setReceiptSaved] = useState(false)
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>('idle')
  const [whatsappNotification, setWhatsappNotification] =
    useState<SaveOrderResult['whatsappNotification']>(undefined)
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
  const branchLinks = useMemo(() => makeBranchLinks(branchId), [branchId])
  const whatsappUrl = buildWhatsAppUrl(restaurant, cartLines, details)
  const trackingUrl = lastTrackingToken ? branchLinks.trackingUrl(lastTrackingToken) : null

  const handleSubmitOrder = useCallback(() => {
    const message = buildWhatsAppUrl(restaurant, cartLines, details)
    const decodedMessage = decodeURIComponent(message.split('?text=')[1] ?? '')
    const deliveryProvider =
      details.fulfillmentMode === 'local_delivery'
        ? 'local'
        : details.fulfillmentMode === 'didi_food'
          ? 'didi_food'
          : 'none'
    const paymentStatus = getInitialPaymentStatus(details.paymentMethod)
    const paymentProvider = getPaymentProvider(details.paymentMethod)

    // Snapshot local del recibo: se muestra siempre, incluso si el backend
    // `create-order` falla en silencio. Luego se reconcilian los ids del servidor.
    const issuedAt = new Date().toISOString()
    const fallbackTrackingToken = makeLocalTrackingToken()
    const fallbackOrderId = makeLocalOrderId()
    const localReceipt = buildOrderReceipt({
      orderId: fallbackOrderId,
      trackingToken: fallbackTrackingToken,
      restaurant,
      cartLines,
      total,
      customerName: details.name,
      tableNumber: details.table,
      fulfillmentMode: details.fulfillmentMode,
      paymentMethod: details.paymentMethod,
      paymentStatus,
      createdAt: issuedAt,
    })

    setLastTrackingToken(fallbackTrackingToken)
    setReceipt(localReceipt)
    setReceiptSaved(false)
    setSubmissionStatus('saving')
    setWhatsappNotification(undefined)
    saveReceiptTrackingFallback(fallbackTrackingToken, {
      receipt: localReceipt,
      status: 'pending',
      fulfillmentMode: details.fulfillmentMode,
      paymentMethod: details.paymentMethod,
      paymentStatus,
      orderChannel: 'cartamago',
      whatsappLink: message,
      createdAt: issuedAt,
      updatedAt: issuedAt,
    })

    void saveOrder({
      branchId,
      orderChannel: 'cartamago',
      deliveryProvider,
      paymentStatus,
      paymentMethod: details.paymentMethod,
      paymentProvider,
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
      // Honeypot anti-bot: create-order rechaza ("invalid submission" -> 400) si
      // `website` NO esta vacio. El cliente real deja este campo vacio; un bot que
      // lo rellene con la URL de la pagina queda bloqueado por el servidor.
      website: '',
      items: cartLines.map((line) => ({
        productId: line.item.id,
        productName: line.item.name,
        quantity: line.quantity,
        unitPriceCop: line.item.price,
        lineNote: line.note,
      })),
    }).then((result) => {
      if (result?.trackingToken) {
        const serverReceipt = buildOrderReceipt({
          orderId: result.orderId ?? fallbackOrderId,
          trackingToken: result.trackingToken,
          restaurant,
          cartLines,
          total,
          customerName: details.name,
          tableNumber: details.table,
          fulfillmentMode: details.fulfillmentMode,
          paymentMethod: details.paymentMethod,
          paymentStatus,
          createdAt: issuedAt,
        })

        setLastTrackingToken(result.trackingToken)
        setReceipt(serverReceipt)
        setReceiptSaved(true)
        setSubmissionStatus('saved')
        setWhatsappNotification(result.whatsappNotification)
        saveReceiptTrackingFallback(result.trackingToken, {
          receipt: serverReceipt,
          status: 'pending',
          fulfillmentMode: details.fulfillmentMode,
          paymentMethod: details.paymentMethod,
          paymentStatus,
          orderChannel: 'cartamago',
          whatsappLink: message,
          createdAt: issuedAt,
          updatedAt: issuedAt,
        })
        return
      }

      setSubmissionStatus('failed')
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

  function startNewOrder() {
    setCart({})
    setItemNotes({})
    setDetails(defaultCustomerDetails)
    setReceipt(null)
    setReceiptSaved(false)
    setSubmissionStatus('idle')
    setLastTrackingToken(null)
    setWhatsappNotification(undefined)
    orderStartedAtRef.current = Date.now()
  }

  return {
    cartLines,
    details,
    total,
    hasUnknownPrices,
    itemCount,
    whatsappUrl,
    trackingUrl,
    receipt,
    receiptSaved,
    submissionStatus,
    whatsappNotification,
    orderPanelRef,
    addItem,
    removeItem,
    clearItem,
    updateItemNote,
    updateDetails,
    reviewOrder,
    getItemQuantity,
    getItemNote,
    handleSubmitOrder,
    startNewOrder,
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
