import { getSupabaseClient, isSupabaseConfigured } from '../../../services/menuRepository'
import type { SaveOrderInput } from '../types'

function makeId(prefix = 'ord') {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${ts}_${rand}`
}

export async function saveOrder(input: SaveOrderInput): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, order not saved')
    return null
  }

  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.functions.invoke<{ orderId: string }>('create-order', {
      body: input,
      headers: {
        'x-idempotency-key': makeId('idem'),
      },
    })

    if (error) {
      console.error('create-order function unavailable:', error.message)
      return null
    }

    return data?.orderId ?? null
  } catch (error) {
    console.error('create-order function failed:', error)
    return null
  }
}
