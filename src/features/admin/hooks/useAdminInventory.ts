import { useCallback, useEffect, useState } from 'react'
import type { InventoryData, MermaReason } from '../inventoryTypes'
import { fetchAdminInventory, registerAdminMerma } from '../repositories/adminInventoryRepository'

export function useAdminInventory() {
  const [data, setData] = useState<InventoryData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState('')

  const loadInventory = useCallback(async () => {
    setIsLoading(true)
    setStatus('')
    try {
      const inventory = await fetchAdminInventory()
      setData(inventory)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo cargar el inventario.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadInventory()
  }, [loadInventory])

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