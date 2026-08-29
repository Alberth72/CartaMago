import { useCallback, useEffect, useState } from 'react'
import { notifyStockChanged, subscribeToStockChanged } from '../../../lib/stockSync'
import type {
  CloseCashSessionInput,
  CreateDispatchRequestInput,
  CreateProductFormulaInput,
  CreateSaleInput,
  OpenCashSessionInput,
  OperationsData,
} from '../operationsTypes'
import {
  closeAdminCashSession,
  createAdminDispatchRequest,
  createAdminProductFormula,
  dispatchAdminRequest,
  fetchAdminOperations,
  openAdminCashSession,
  receiveAdminDispatch,
  createAdminSale,
  subscribeToAdminOperationsStockChanges,
} from '../repositories/adminOperationsRepository'

export function useAdminOperations() {
  const [data, setData] = useState<OperationsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState('')

  const loadOperations = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true)
      setStatus('')
    }
    try {
      setData(await fetchAdminOperations())
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo cargar la operacion.')
    } finally {
      if (!options?.silent) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadOperations()
  }, [loadOperations])

  const branchScopeKey = data ? data.branches.map((branch) => branch.id).sort().join('|') : ''
  const warehouseScopeKey = data ? data.warehouses.map((warehouse) => warehouse.id).sort().join('|') : ''

  useEffect(() => {
    if (!branchScopeKey && !warehouseScopeKey) return undefined

    let reloadTimer: ReturnType<typeof setTimeout> | null = null
    const reloadSoon = () => {
      if (reloadTimer) clearTimeout(reloadTimer)
      reloadTimer = setTimeout(() => void loadOperations({ silent: true }), 250)
    }
    const branchIds = branchScopeKey ? branchScopeKey.split('|') : []
    const warehouseIds = warehouseScopeKey ? warehouseScopeKey.split('|') : []
    const unsubscribeRealtime = subscribeToAdminOperationsStockChanges(
      {
        branchIds,
        warehouseIds,
      },
      reloadSoon,
    )
    const unsubscribeLocal = subscribeToStockChanged((payload) => {
      const branchMatches = !payload.branchId || branchIds.includes(payload.branchId)
      const warehouseMatches = !payload.warehouseId || warehouseIds.includes(payload.warehouseId)
      if (branchMatches && warehouseMatches) reloadSoon()
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
  }, [branchScopeKey, warehouseScopeKey, loadOperations])

  const runAction = useCallback(
    async <T,>(action: () => Promise<T>, successMessage: string) => {
      setIsSaving(true)
      setStatus('')
      try {
        const result = await action()
        await loadOperations()
        setStatus(successMessage)
        return result
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'No se pudo completar la operacion.')
        return null
      } finally {
        setIsSaving(false)
      }
    },
    [loadOperations],
  )

  return {
    data,
    isLoading,
    isSaving,
    status,
    createRequest: (input: CreateDispatchRequestInput) =>
      runAction(() => createAdminDispatchRequest(input), 'Solicitud creada correctamente.'),
    createProductFormula: (input: CreateProductFormulaInput) =>
      runAction(() => createAdminProductFormula(input), 'Fórmula guardada correctamente.'),
    dispatchRequest: (requestId: string) =>
      runAction(() => dispatchAdminRequest(requestId), 'Solicitud despachada desde bodega.'),
    receiveDispatch: (dispatchId: string) =>
      runAction(() => receiveAdminDispatch(dispatchId), 'Despacho recibido en sede.'),
    openCashSession: (input: OpenCashSessionInput) =>
      runAction(() => openAdminCashSession(input), 'Caja abierta correctamente.'),
    closeCashSession: (input: CloseCashSessionInput) =>
      runAction(() => closeAdminCashSession(input), 'Caja cerrada correctamente.'),
    createSale: async (input: CreateSaleInput) => {
      const result = await runAction(() => createAdminSale(input), 'Venta registrada, pago guardado y stock descontado.')
      if (result) notifyStockChanged({ branchId: input.branchId, source: 'admin-sale' })
      return result
    },
    reload: loadOperations,
  }
}
