import { isE2EAdminMockEnabled } from '../../../lib/runtimeFlags'
import { getSupabaseClient, isSupabaseConfigured } from '../../../services/menuRepository'

export type IntegrationProvider = 'whatsapp' | 'didi_food' | 'didi_pay'

export type RestaurantIntegrationRow = {
  id: string
  restaurant_id: string
  provider: IntegrationProvider
  enabled: boolean
  external_store_id: string | null
  credentials_ref: string | null
  settings_json: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type SaveIntegrationInput = {
  restaurantId: string
  provider: IntegrationProvider
  enabled: boolean
  externalStoreId: string
  settings: Record<string, unknown>
}

function makeIntegrationId(restaurantId: string, provider: IntegrationProvider) {
  return `${restaurantId}_${provider}`
}

export async function fetchRestaurantIntegrations(restaurantId: string): Promise<RestaurantIntegrationRow[]> {
  if (isE2EAdminMockEnabled() || !isSupabaseConfigured()) {
    return []
  }

  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('restaurant_integrations')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('provider', { ascending: true })

    if (error) {
      console.error('Failed to fetch integrations:', error)
      return []
    }

    return (data ?? []) as RestaurantIntegrationRow[]
  } catch (error) {
    console.error('Failed to fetch integrations:', error)
    return []
  }
}

export async function saveRestaurantIntegration(input: SaveIntegrationInput): Promise<RestaurantIntegrationRow | null> {
  if (isE2EAdminMockEnabled() || !isSupabaseConfigured()) {
    return {
      id: makeIntegrationId(input.restaurantId, input.provider),
      restaurant_id: input.restaurantId,
      provider: input.provider,
      enabled: input.enabled,
      external_store_id: input.externalStoreId.trim() || null,
      credentials_ref: null,
      settings_json: input.settings,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  try {
    const supabase = getSupabaseClient()
    const row = {
      id: makeIntegrationId(input.restaurantId, input.provider),
      restaurant_id: input.restaurantId,
      provider: input.provider,
      enabled: input.enabled,
      external_store_id: input.externalStoreId.trim() || null,
      credentials_ref: null,
      settings_json: input.settings,
    }

    const { data, error } = await supabase
      .from('restaurant_integrations')
      .upsert(row, { onConflict: 'id' })
      .select('*')
      .single()

    if (error) {
      console.error('Failed to save integration:', error)
      return null
    }

    return data as RestaurantIntegrationRow
  } catch (error) {
    console.error('Failed to save integration:', error)
    return null
  }
}
