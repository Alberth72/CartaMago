import { useEffect, useState } from 'react'
import { CheckCircle2, Phone, RefreshCw, Save, Truck, Warehouse } from 'lucide-react'
import { useWarehousePurchasing } from '../hooks/useWarehousePurchasing'
import type { WarehousePurchaseStatus } from '../warehousePurchasingTypes'

const statusLabels: Record<WarehousePurchaseStatus, string> = {
  draft: 'Borrador',
  sent: 'Pendiente',
  received: 'Recibida',
  paid: 'Pagada',
  cancelled: 'Cancelada',
}

const moneyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export function WarehousePurchasingPanel() {
  const purchasing = useWarehousePurchasing()
  const data = purchasing.data
  const [warehouseId, setWarehouseId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [notes, setNotes] = useState('')

  const warehouses = data?.warehouses ?? []
  const suppliers = data?.suppliers ?? []
  const items = data?.items ?? []
  const orders = data?.purchaseOrders ?? []
  const selectedWarehouseId = warehouseId || data?.profile.primaryWarehouseId || warehouses[0]?.id || ''
  const visibleOrders = orders.filter((order) => !selectedWarehouseId || order.warehouseId === selectedWarehouseId)
  const openOrders = visibleOrders.filter((order) => order.status === 'draft' || order.status === 'sent')
  const recentOrders = visibleOrders.filter((order) => order.status !== 'draft' && order.status !== 'sent').slice(0, 4)
  const selectedSupplier = suppliers.find((supplier) => supplier.id === supplierId)

  useEffect(() => {
    if (!data) return
    const nextWarehouseId = data.profile.primaryWarehouseId ?? data.warehouses[0]?.id ?? ''
    if (nextWarehouseId && warehouseId !== nextWarehouseId) setWarehouseId(nextWarehouseId)
  }, [data, warehouseId])

  const getItemName = (id: string) => items.find((item) => item.id === id)?.name ?? id
  const getItemUnit = (id: string) => items.find((item) => item.id === id)?.unit ?? 'unidad'
  const getSupplierName = (id: string | null) => suppliers.find((supplier) => supplier.id === id)?.name ?? 'Proveedor'
  const getWarehouseName = (id: string) => warehouses.find((warehouse) => warehouse.id === id)?.name ?? id

  const canCreateOrder =
    Boolean(selectedWarehouseId) &&
    Boolean(supplierId) &&
    Boolean(itemId) &&
    Number(quantity) > 0 &&
    Number(unitCost) >= 0

  const handleCreateOrder = () => {
    if (!canCreateOrder) return
    void purchasing.createOrder({
      warehouseId: selectedWarehouseId,
      supplierId,
      itemId,
      quantity: Number(quantity),
      unitCost: Number(unitCost),
      notes,
    })
    setQuantity('')
    setUnitCost('')
    setNotes('')
  }

  if (purchasing.isLoading) {
    return (
      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-bold text-stone-500">Cargando compras de bodega...</p>
      </section>
    )
  }

  return (
    <div className="grid gap-4">
      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-md bg-sky-100 text-sky-700">
              <Warehouse size={22} />
            </span>
            <div>
              <h2 className="text-lg font-black text-stone-950">Abastecer bodega</h2>
              <p className="text-sm font-bold text-stone-500">{getWarehouseName(selectedWarehouseId)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void purchasing.reload()}
            disabled={purchasing.isLoading}
            className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-black text-stone-800 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-400"
          >
            <RefreshCw size={16} />
            Actualizar
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-black uppercase tracking-wide text-amber-700">Compras abiertas</p>
            <p className="mt-2 text-2xl font-black text-amber-950">{openOrders.length}</p>
          </div>
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
            <p className="text-xs font-black uppercase tracking-wide text-sky-700">Proveedores</p>
            <p className="mt-2 text-2xl font-black text-sky-950">{suppliers.length}</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Recibidas</p>
            <p className="mt-2 text-2xl font-black text-emerald-950">
              {visibleOrders.filter((order) => order.status === 'received' || order.status === 'paid').length}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-md bg-emerald-100 text-emerald-700">
              <Truck size={22} />
            </span>
            <div>
              <h2 className="text-lg font-black text-stone-950">Ordenes abiertas</h2>
              <p className="text-sm font-bold text-stone-500">Recibir mercancia suma al stock central</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {openOrders.length === 0 ? (
              <p className="rounded-md bg-stone-100 px-3 py-2 text-sm font-bold text-stone-600">
                No hay compras pendientes por recibir.
              </p>
            ) : (
              openOrders.map((order) => (
                <article key={order.id} className="rounded-lg border border-stone-200 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-stone-950">{getSupplierName(order.supplierId)}</p>
                      <p className="text-xs font-bold text-stone-500">
                        {order.items
                          .map((item) => `${getItemName(item.itemId)} x ${item.quantity} ${getItemUnit(item.itemId)}`)
                          .join(', ')}
                      </p>
                      {order.notes ? <p className="mt-1 text-xs font-semibold text-stone-500">{order.notes}</p> : null}
                    </div>
                    <div className="text-right">
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-black text-amber-800">
                        {statusLabels[order.status]}
                      </span>
                      <p className="mt-2 text-sm font-black text-stone-950">
                        {moneyFormatter.format(order.totalCost)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void purchasing.receiveOrder(order.id)}
                    disabled={purchasing.isSaving}
                    className="mt-3 inline-flex items-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-xs font-black text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-stone-400"
                  >
                    <CheckCircle2 size={15} />
                    Recibir compra
                  </button>
                </article>
              ))
            )}
          </div>

          {recentOrders.length > 0 ? (
            <div className="mt-5 border-t border-stone-200 pt-4">
              <h3 className="text-sm font-black text-stone-950">Historial reciente</h3>
              <div className="mt-2 grid gap-2">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between gap-3 rounded-md bg-stone-50 px-3 py-2">
                    <div>
                      <p className="text-sm font-black text-stone-800">{getSupplierName(order.supplierId)}</p>
                      <p className="text-xs font-bold text-stone-500">
                        {order.items.map((item) => getItemName(item.itemId)).join(', ')}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-stone-600">
                      {statusLabels[order.status]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <aside className="h-fit rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-md bg-red-100 text-red-700">
              <Save size={22} />
            </span>
            <div>
              <h3 className="text-base font-black text-stone-950">Nueva compra</h3>
              <p className="text-sm font-bold text-stone-500">Proveedor a bodega</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {warehouses.length > 1 ? (
              <label className="grid gap-1 text-sm font-bold text-stone-700">
                Bodega
                <select
                  value={selectedWarehouseId}
                  onChange={(event) => setWarehouseId(event.target.value)}
                  className="rounded-md border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-950 outline-none focus:border-red-500"
                >
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="grid gap-1 text-sm font-bold text-stone-700">
              Proveedor
              <select
                value={supplierId}
                onChange={(event) => setSupplierId(event.target.value)}
                className="rounded-md border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-950 outline-none focus:border-red-500"
              >
                <option value="">Selecciona proveedor</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>

            {selectedSupplier ? (
              <div className="rounded-md border border-sky-100 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-900">
                <p>{selectedSupplier.contactName ?? 'Contacto pendiente'}</p>
                {selectedSupplier.phone ? <p>{selectedSupplier.phone}</p> : null}
              </div>
            ) : null}

            <label className="grid gap-1 text-sm font-bold text-stone-700">
              Insumo
              <select
                value={itemId}
                onChange={(event) => setItemId(event.target.value)}
                className="rounded-md border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-950 outline-none focus:border-red-500"
              >
                <option value="">Selecciona insumo</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.unit})
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-sm font-bold text-stone-700">
                Cantidad
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className="min-w-0 rounded-md border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-950 outline-none focus:border-red-500"
                />
              </label>
              <label className="grid gap-1 text-sm font-bold text-stone-700">
                Costo unit.
                <input
                  type="number"
                  min="0"
                  value={unitCost}
                  onChange={(event) => setUnitCost(event.target.value)}
                  className="min-w-0 rounded-md border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-950 outline-none focus:border-red-500"
                />
              </label>
            </div>

            <label className="grid gap-1 text-sm font-bold text-stone-700">
              Nota
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={2}
                className="resize-none rounded-md border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-950 outline-none focus:border-red-500"
              />
            </label>

            <button
              type="button"
              onClick={handleCreateOrder}
              disabled={!canCreateOrder || purchasing.isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-red-900 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              <Save size={16} />
              Enviar compra
            </button>
          </div>
        </aside>
      </div>

      <details className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <summary className="cursor-pointer text-sm font-black text-stone-950">
          Proveedores cargados ({suppliers.length})
        </summary>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {suppliers.map((supplier) => (
            <article key={supplier.id} className="rounded-md border border-stone-200 p-3">
              <p className="text-sm font-black text-stone-950">{supplier.name}</p>
              <p className="mt-1 text-xs font-bold text-stone-500">{supplier.contactName ?? 'Contacto pendiente'}</p>
              {supplier.phone ? (
                <a href={`tel:${supplier.phone}`} className="mt-2 inline-flex items-center gap-2 text-xs font-black text-sky-700">
                  <Phone size={14} />
                  {supplier.phone}
                </a>
              ) : null}
            </article>
          ))}
        </div>
      </details>

      {purchasing.status ? (
        <p
          className={`rounded-lg border px-4 py-3 text-sm font-bold ${
            purchasing.status.includes('actualizado') ||
            purchasing.status.includes('enviada') ||
            purchasing.status.includes('guardado')
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {purchasing.status}
        </p>
      ) : null}
    </div>
  )
}
