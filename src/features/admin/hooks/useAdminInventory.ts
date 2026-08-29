import { useCallback, useEffect, useState } from 'react'
import { subscribeToStockChanged } from '../../../lib/stockSync'
import type { InventoryData, MermaReason } from '../inventoryTypes'
import {
  fetchAdminInventory,
  registerAdminMerma,
  subscribeToAdminInventoryChanges,
} from '../repositories/adminInventoryRepository'

export function useAdminInventory() {
  const [data, setData] = useState<InventoryData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState('')

  const loadInventory = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true)
      setStatus('')
    }
    try {
      const inventory = await fetchAdminInventory()
      setData(inventory)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo cargar el inventario.')
    } finally {
      if (!options?.silent) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadInventory()
  }, [loadInventory])

  useEffect(() => {
    if (!data?.branchId) return undefined

    let reloadTimer: ReturnType<typeof setTimeout> | null = null
    const reloadSoon = () => {
      if (reloadTimer) clearTimeout(reloadTimer)
      reloadTimer = setTimeout(() => void loadInventory({ silent: true }), 250)
    }
    const unsubscribeRealtime = subscribeToAdminInventoryChanges(data.branchId, reloadSoon)
    const unsubscribeLocal = subscribeToStockChanged((payload) => {
      if (!payload.branchId || payload.branchId === data.branchId) reloadSoon()
    })
    const reloadOnActivity = () => {
      if (document.visibilityState === 'visible') reloadSoon()
    }

    window.addEventListener('focus', reloadOnActivity)
    document.addEventListener('visibilitychange', reloadOnActivity)

    return () => {
      if (reloadTimer) clearTimeout(reloadTimer)
      window.removeEventListener('focus', reloadOnActivity)
      document.removeEventListener('visibilitychange', reloadOnActivity)
      unsubscribeRealtime?.()
      unsubscribeLocal()
    }
  }, [data?.branchId, loadInventory])

  const registerMerma = useCallback(
    async (itemId: string, quantity: number, reason: MermaReason) => {
      setIsSaving(true)
      setStatus('')
      try {
        await registerAdminMerma(itemId, quantity, reason)
        await loadInventory()
        setStatus('Merma registrada correctamente.')
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'No se pudo registrar la merma.')
      } finally {
        setIsSaving(false)
      }
    },
    [loadInventory],
  )

  return {
    data,
    isLoading,
    isSaving,
    status,
    registerMerma,
    reload: loadInventory,
  }
}
