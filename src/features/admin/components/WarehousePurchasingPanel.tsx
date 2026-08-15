import { useEffect, useState } from 'react'
import { CheckCircle2, Phone, Plus, RefreshCw, Save, Truck, Warehouse } from 'lucide-react'
import { useWarehousePurchasing } from '../hooks/useWarehousePurchasing'
import type { WarehousePurchaseStatus } from '../warehousePurchasingTypes'

const statusLabels: Record<WarehousePurchaseStatus, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
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
  const [supplierName, setSupplierName] = useState('')
  const [supplierContact, setSupplierContact] = useState('')
  const [supplierPhone, setSupplierPhone] = useState('')
  const [supplierTerms, setSupplierTerms] = useState('')

  const warehouses = data?.warehouses ?? []
  const suppliers = data?.suppliers ?? []
  const items = data?.items ?? []
  const orders = data?.purchaseOrders ?? []
  const stock = data?.stock ?? []
  const selectedWarehouseId = warehouseId || data?.profile.primaryWarehouseId || warehouses[0]?.id || ''
  const visibleOrders = orders.filter((order) => !selectedWarehouseId || order.warehouseId === selectedWarehouseId)

  useEffect(() => {
    if (!data) return
    const nextWarehouseId = data.profile.primaryWarehouseId ?? data.warehouses[0]?.id ?? ''
    if (nextWarehouseId && warehouseId !== nextWarehouseId) setWarehouseId(nextWarehouseId)
  }, [data, warehouseId])

  const getItemName = (id: string) => items.find((item) => item.id === id)?.name ?? id
  const getItemUnit = (id: string) => items.find((item) => item.id === id)?.unit ?? 'unidad'
  const getWarehouseName = (id: string) => warehouses.find((warehouse) => warehouse.id === id)?.name ?? id

  const canCreateOrder =
    Boolean(selectedWarehouseId) &&
    Boolean(supplierId) &&
    Boolean(itemId) &&
    Number(quantity) > 0 &&
    Number(unitCost) >= 0
  const canCreateSupplier = Boolean(selectedWarehouseId) && supplierName.trim().length > 2

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

  const handleCreateSupplier = () => {
    if (!canCreateSupplier) return
    void purchasing.createSupplier({
      warehouseId: selectedWarehouseId,
      name: supplierName,
      contactName: supplierContact,
      phone: supplierPhone,
      terms: supplierTerms,
    })
    setSupplierName('')
    setSupplierContact('')
    setSupplierPhone('')
    setSupplierTerms('')
  }

  if (purchasing.isLoading) {
    return (
      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-bold text-stone-500">Cargando proveedores y compras de bodega...</p>
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
              <h2 className="text-lg font-black text-stone-950">Compras a proveedores</h2>
              <p className="text-sm font-bold text-stone-500">Reabastece la bodega central antes de despachar sedes</p>
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

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {suppliers.map((supplier) => (
            <article key={supplier.id} className="rounded-lg border border-stone-200 p-3">
              <p className="text-sm font-black text-stone-950">{supplier.name}</p>
              <p className="mt-1 text-xs font-bold text-stone-500">
                {supplier.contactName ?? 'Contacto pendiente'}
              </p>
              {supplier.phone ? (
                <a
                  href={`tel:${supplier.phone}`}
                  className="mt-2 inline-flex items-center gap-2 text-xs font-black text-sky-700"
                >
                  <Phone size={14} />
                  {supplier.phone}
                </a>
              ) : null}
              {supplier.terms ? <p className="mt-2 text-xs font-semibold text-stone-500">{supplier.terms}</p> : null}
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-md bg-emerald-100 text-emerald-700">
              <Truck size={22} />
            </span>
            <div>
              <h2 className="text-lg font-black text-stone-950">Pedidos por proveedor</h2>
              <p className="text-sm font-bold text-stone-500">Ordenes abiertas y recepcionadas en bodega</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {suppliers.map((supplier) => {
              const supplierOrders = visibleOrders.filter((order) => order.supplierId === supplier.id)
              return (
                <div key={supplier.id} className="rounded-lg border border-stone-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black text-stone-950">{supplier.name}</h3>
                      <p className="text-xs font-bold text-stone-500">
                        {supplierOrders.length} ordenes registradas
                      </p>
                    </div>
                    <span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-black text-stone-700">
                      {supplier.contactName ?? 'Proveedor'}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2">
                    {supplierOrders.length === 0 ? (
                      <p className="text-sm font-bold text-stone-500">Sin pedidos para este proveedor.</p>
                    ) : (
                      supplierOrders.map((order) => (
                        <div key={order.id} className="rounded-md border border-stone-100 bg-stone-50 p-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-black text-stone-950">
                                {getWarehouseName(order.warehouseId)} · {moneyFormatter.format(order.totalCost)}
                              </p>
                              <p className="text-xs font-bold text-stone-500">
                                {order.items
                                  .map((item) => `${getItemName(item.itemId)} x ${item.quantity} ${getItemUnit(item.itemId)}`)
                                  .join(', ')}
                              </p>
                              {order.notes ? <p className="mt-1 text-xs font-semibold text-stone-500">{order.notes}</p> : null}
                            </div>
                            <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-stone-700">
                              {statusLabels[order.status]}
                            </span>
                          </div>

                          {(order.status === 'draft' || order.status === 'sent') ? (
                            <button
                              type="button"
                              onClick={() => void purchasing.receiveOrder(order.id)}
                              disabled={purchasing.isSaving}
                              className="mt-3 inline-flex items-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-xs font-black text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-stone-400"
                            >
                              <CheckCircle2 size={15} />
                              Recibir en bodega
                            </button>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <aside className="grid h-fit gap-4">
          <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="grid size-10 place-items-center rounded-md bg-amber-100 text-amber-700">
                <Save size={22} />
              </span>
              <div>
                <h3 className="text-base font-black text-stone-950">Nueva orden</h3>
                <p className="text-sm font-bold text-stone-500">Proveedor abastece stock central</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm font-bold text-stone-700">
                Bodega
                <select
                  value={selectedWarehouseId}
                  onChange={(event) => setWarehouseId(event.target.value)}
                  disabled={warehouses.length <= 1}
                  className="rounded-md border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-950 outline-none focus:border-red-500"
                >
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </label>

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

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-bold text-stone-700">
                  Cantidad
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    className="rounded-md border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-950 outline-none focus:border-red-500"
                  />
                </label>
                <label className="grid gap-1 text-sm font-bold text-stone-700">
                  Costo unit.
                  <input
                    type="number"
                    min="0"
                    value={unitCost}
                    onChange={(event) => setUnitCost(event.target.value)}
                    className="rounded-md border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-950 outline-none focus:border-red-500"
                  />
                </label>
              </div>

              <label className="grid gap-1 text-sm font-bold text-stone-700">
                Nota
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
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
                Enviar orden
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="grid size-10 place-items-center rounded-md bg-sky-100 text-sky-700">
                <Plus size={22} />
              </span>
              <div>
                <h3 className="text-base font-black text-stone-950">Proveedor nuevo</h3>
                <p className="text-sm font-bold text-stone-500">Contacto de compras de bodega</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm font-bold text-stone-700">
                Nombre
                <input
                  value={supplierName}
                  onChange={(event) => setSupplierName(event.target.value)}
                  className="rounded-md border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-950 outline-none focus:border-red-500"
                />
              </label>
              <label className="grid gap-1 text-sm font-bold text-stone-700">
                Contacto
                <input
                  value={supplierContact}
                  onChange={(event) => setSupplierContact(event.target.value)}
                  className="rounded-md border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-950 outline-none focus:border-red-500"
                />
              </label>
              <label className="grid gap-1 text-sm font-bold text-stone-700">
                Telefono
                <input
                  value={supplierPhone}
                  onChange={(event) => setSupplierPhone(event.target.value)}
                  className="rounded-md border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-950 outline-none focus:border-red-500"
                />
              </label>
              <label className="grid gap-1 text-sm font-bold text-stone-700">
                Condiciones
                <textarea
                  value={supplierTerms}
                  onChange={(event) => setSupplierTerms(event.target.value)}
                  rows={3}
                  className="resize-none rounded-md border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-950 outline-none focus:border-red-500"
                />
              </label>
              <button
                type="button"
                onClick={handleCreateSupplier}
                disabled={!canCreateSupplier || purchasing.isSaving}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-black text-stone-900 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-400"
              >
                <Plus size={16} />
                Guardar proveedor
              </button>
            </div>
          </section>
        </aside>
      </div>

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black text-stone-950">Stock central despues de compras</h2>
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
          {stock.map((entry) => (
            <div key={entry.id} className="rounded-lg border border-stone-200 p-3">
              <p className="text-sm font-black text-stone-950">{getItemName(entry.itemId)}</p>
              <p className="mt-1 text-xs font-bold text-stone-500">{getWarehouseName(entry.warehouseId ?? '')}</p>
              <p className="mt-2 text-xl font-black text-stone-950">
                {entry.quantity} {getItemUnit(entry.itemId)}
              </p>
            </div>
          ))}
        </div>
      </section>

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
