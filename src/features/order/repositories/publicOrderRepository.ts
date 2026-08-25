import { getSupabaseClient, isSupabaseConfigured } from '../../../services/menuRepository'
import type { SaveOrderInput } from '../types'

function makeId(prefix = 'ord') {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${ts}_${rand}`
}

export type SaveOrderResult = {
  orderId: string
  trackingToken: string
}

export async function saveOrder(input: SaveOrderInput): Promise<SaveOrderResult | null> {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, order not saved')
    return null
  }

  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.functions.invoke<{ orderId: string; trackingToken?: string }>('create-order', {
      body: input,
      headers: {
        'x-idempotency-key': makeId('idem'),
      },
    })

    if (error) {
      console.error('create-order function unavailable:', error.message)
      return null
    }

    if (!data?.orderId) return null

    return {
      orderId: data.orderId,
      trackingToken: data.trackingToken ?? data.orderId,
    }
  } catch (error) {
    console.error('create-order function failed:', error)
    return null
  }
}
