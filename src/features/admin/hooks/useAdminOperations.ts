import { useCallback, useEffect, useState } from 'react'
import type { CreateDispatchRequestInput, OperationsData } from '../operationsTypes'
import {
  createAdminDispatchRequest,
  dispatchAdminRequest,
  fetchAdminOperations,
  receiveAdminDispatch,
  sellAdminProduct,
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
    async (action: () => Promise<unknown>, successMessage: string) => {
      setIsSaving(true)
      setStatus('')
      try {
        await action()
        await loadOperations()
        setStatus(successMessage)
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'No se pudo completar la operacion.')
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
    dispatchRequest: (requestId: string) =>
      runAction(() => dispatchAdminRequest(requestId), 'Solicitud despachada desde bodega.'),
    receiveDispatch: (dispatchId: string) =>
      runAction(() => receiveAdminDispatch(dispatchId), 'Despacho recibido en sede.'),
    sellProduct: (branchId: string, productId: string, quantity: number) =>
      runAction(() => sellAdminProduct(branchId, productId, quantity), 'Venta registrada y stock descontado.'),
    reload: loadOperations,
  }
}
