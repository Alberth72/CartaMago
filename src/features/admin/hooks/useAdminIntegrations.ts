import { useCallback, useEffect, useMemo, useState } from 'react'
import { getSupabaseConfig } from '../../../services/menuRepository'
import {
  fetchRestaurantIntegrations,
  saveRestaurantIntegration,
  type RestaurantIntegrationRow,
} from '../repositories/adminIntegrationRepository'

type IntegrationForm = {
  externalStoreId: string
  sandboxStatus: string
  notes: string
}

const emptyForm: IntegrationForm = {
  externalStoreId: '',
  sandboxStatus: 'pending',
  notes: '',
}

function readTextSetting(settings: Record<string, unknown>, key: string) {
  const value = settings[key]
  return typeof value === 'string' ? value : ''
}

export function useAdminIntegrations() {
  const [integrations, setIntegrations] = useState<RestaurantIntegrationRow[]>([])
  const [form, setForm] = useState<IntegrationForm>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  const didiFoodIntegration = useMemo(
    () => integrations.find((integration) => integration.provider === 'didi_food') ?? null,
    [integrations],
  )

  const loadIntegrations = useCallback(async () => {
    setLoading(true)
    const { restaurantId } = getSupabaseConfig()
    const rows = await fetchRestaurantIntegrations(restaurantId)
    const didiFood = rows.find((integration) => integration.provider === 'didi_food')

    setIntegrations(rows)
    setForm({
      externalStoreId: didiFood?.external_store_id ?? '',
      sandboxStatus: readTextSetting(didiFood?.settings_json ?? {}, 'sandboxStatus') || 'pending',
      notes: readTextSetting(didiFood?.settings_json ?? {}, 'notes'),
    })
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadIntegrations()
  }, [loadIntegrations])

  const updateForm = useCallback((patch: Partial<IntegrationForm>) => {
    setForm((prev) => ({ ...prev, ...patch }))
  }, [])

  const saveDidiFoodDraft = useCallback(async () => {
    setSaving(true)
    setStatus('')

    const { restaurantId } = getSupabaseConfig()
    const saved = await saveRestaurantIntegration({
      restaurantId,
      provider: 'didi_food',
      enabled: false,
      externalStoreId: form.externalStoreId,
      settings: {
        sandboxStatus: form.sandboxStatus,
        notes: form.notes,
        readiness: 'credentials_required',
      },
    })

    if (!saved) {
      setStatus('No se pudo guardar la preparacion de DiDi Food.')
      setSaving(false)
      return false
    }

    setIntegrations((prev) => {
      const others = prev.filter((integration) => integration.id !== saved.id)
      return [...others, saved]
    })
    setStatus('Preparacion de DiDi Food guardada.')
    setSaving(false)
    return true
  }, [form])

  return {
    didiFoodIntegration,
    form,
    loading,
    saving,
    status,
    reload: loadIntegrations,
    updateForm,
    saveDidiFoodDraft,
  }
}
