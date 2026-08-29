import { useCallback, useEffect, useState } from 'react'
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
} from '../repositories/adminOperationsRepository'

export function useAdminOperations() {
  const [data, setData] = useState<OperationsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState('')

  const loadOperations = useCallback(async () => {
    setIsLoading(true)
    setStatus('')
    try {
      setData(await fetchAdminOperations())
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo cargar la operacion.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadOperations()
  }, [loadOperations])

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
    createSale: (input: CreateSaleInput) =>
      runAction(() => createAdminSale(input), 'Venta registrada, pago guardado y stock descontado.'),
    reload: loadOperations,
  }
}
