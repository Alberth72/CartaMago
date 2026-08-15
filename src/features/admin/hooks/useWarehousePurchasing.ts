import { useCallback, useEffect, useState } from 'react'
import type {
  CreatePurchaseOrderInput,
  CreateAndLinkSupplierItemInput,
  CreateSupplierInput,
  LinkSupplierItemInput,
  WarehousePurchasingData,
} from '../warehousePurchasingTypes'
import {
  createAndLinkWarehouseSupplierItem,
  createWarehousePurchaseOrder,
  createWarehouseSupplier,
  fetchWarehousePurchasing,
  linkWarehouseSupplierItem,
  receiveWarehousePurchaseOrder,
} from '../repositories/adminWarehousePurchasingRepository'

export function useWarehousePurchasing() {
  const [data, setData] = useState<WarehousePurchasingData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState('')

  const loadPurchasing = useCallback(async () => {
    setIsLoading(true)
    setStatus('')
    try {
      setData(await fetchWarehousePurchasing())
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudieron cargar las compras de bodega.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPurchasing()
  }, [loadPurchasing])

  const runAction = useCallback(
    async (action: () => Promise<unknown>, successMessage: string) => {
      setIsSaving(true)
      setStatus('')
      try {
        await action()
        await loadPurchasing()
        setStatus(successMessage)
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'No se pudo completar la accion.')
      } finally {
        setIsSaving(false)
      }
    },
    [loadPurchasing],
  )

  return {
    data,
    isLoading,
    isSaving,
    status,
    createOrder: (input: CreatePurchaseOrderInput) =>
      runAction(() => createWarehousePurchaseOrder(input), 'Orden enviada al proveedor.'),
    receiveOrder: (orderId: string) =>
      runAction(() => receiveWarehousePurchaseOrder(orderId), 'Compra recibida y stock central actualizado.'),
    createSupplier: (input: CreateSupplierInput) =>
      runAction(() => createWarehouseSupplier(input), 'Proveedor guardado para esta bodega.'),
    linkSupplierItem: (input: LinkSupplierItemInput) =>
      runAction(() => linkWarehouseSupplierItem(input), 'Insumo vinculado al proveedor.'),
    createAndLinkItem: (input: CreateAndLinkSupplierItemInput) =>
      runAction(() => createAndLinkWarehouseSupplierItem(input), 'Insumo creado y asociado al proveedor.'),
    reload: loadPurchasing,
  }
}
