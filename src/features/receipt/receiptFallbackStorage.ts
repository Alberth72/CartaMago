import type { OrderStatus } from '../order/types'
import type { ReceiptData } from './receiptTypes'

const storagePrefix = 'cartamago:receipt-tracking:'
const maxAgeMs = 24 * 60 * 60 * 1000

export type ReceiptTrackingFallback = {
  receipt: ReceiptData
  status: OrderStatus
  fulfillmentMode: string
  paymentMethod: string
  paymentStatus: string
  orderChannel: string
  whatsappLink: string
  createdAt: string
  updatedAt: string
  storedAt: string
}

export function saveReceiptTrackingFallback(trackingToken: string, fallback: Omit<ReceiptTrackingFallback, 'storedAt'>) {
  if (!trackingToken || typeof window === 'undefined') return

  try {
    window.localStorage.setItem(
      `${storagePrefix}${trackingToken}`,
      JSON.stringify({ ...fallback, storedAt: new Date().toISOString() }),
    )
  } catch (error) {
    console.warn('Failed to store receipt tracking fallback:', error)
  }
}

export function loadReceiptTrackingFallback(trackingToken: string): ReceiptTrackingFallback | null {
  if (!trackingToken || typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(`${storagePrefix}${trackingToken}`)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<ReceiptTrackingFallback>
    if (!parsed.receipt?.orderId || !parsed.receipt.receiptNumber) return null

    const storedAt = new Date(parsed.storedAt ?? 0).getTime()
    if (!Number.isFinite(storedAt) || Date.now() - storedAt > maxAgeMs) {
      window.localStorage.removeItem(`${storagePrefix}${trackingToken}`)
      return null
    }

    return parsed as ReceiptTrackingFallback
  } catch (error) {
    console.warn('Failed to load receipt tracking fallback:', error)
    return null
  }
}
