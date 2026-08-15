import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Phone, Plus, RefreshCw, Save, Truck, Warehouse } from 'lucide-react'
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

type PurchasingView = 'receive' | 'suppliers' | 'history'

export function WarehousePurchasingPanel() {
  const purchasing = useWarehousePurchasing()
  const data = purchasing.data
  const [activeView, setActiveView] = useState<PurchasingView>('receive')
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
  const [selectedSupplierDetailId, setSelectedSupplierDetailId] = useState('')
  const [linkItemId, setLinkItemId] = useState('')
  const [linkUnitCost, setLinkUnitCost] = useState('')
  const [linkLeadTimeDays, setLinkLeadTimeDays] = useState('1')
  const [newItemName, setNewItemName] = useState('')
  const [newItemUnit, setNewItemUnit] = useState('unidad')
  const [newItemCategory, setNewItemCategory] = useState('General')
  const [newItemUnitCost, setNewItemUnitCost] = useState('')
  const [newItemLeadTimeDays, setNewItemLeadTimeDays] = useState('1')

  const warehouses = useMemo(() => data?.warehouses ?? [], [data?.warehouses])
  const suppliers = useMemo(() => data?.suppliers ?? [], [data?.suppliers])
  const supplierItems = useMemo(() => data?.supplierItems ?? [], [data?.supplierItems])
  const items = useMemo(() => data?.items ?? [], [data?.items])
  const orders = useMemo(() => data?.purchaseOrders ?? [], [data?.purchaseOrders])
  const selectedWarehouseId = warehouseId || data?.profile.primaryWarehouseId || warehouses[0]?.id || ''
  const visibleOrders = orders.filter((order) => !selectedWarehouseId || order.warehouseId === selectedWarehouseId)
  const openOrders = visibleOrders.filter((order) => order.status === 'draft' || order.status === 'sent')
  const recentOrders = visibleOrders.filter((order) => order.status !== 'draft' && order.status !== 'sent').slice(0, 4)
  const selectedSupplier = suppliers.find((supplier) => supplier.id === supplierId)
  const selectedSupplierDetail = suppliers.find((supplier) => supplier.id === selectedSupplierDetailId) ?? suppliers[0]
  const selectedSupplierOffers = selectedSupplierDetail
    ? supplierItems.filter((entry) => entry.supplierId === selectedSupplierDetail.id)
    : []
  const selectedSupplierItems = supplierItems.filter((entry) => entry.supplierId === supplierId)
  const purchaseItems = selectedSupplierItems.length > 0
    ? items.filter((item) => selectedSupplierItems.some((entry) => entry.itemId === item.id))
    : items

  useEffect(() => {
    if (!data) return
    const nextWarehouseId = data.profile.primaryWarehouseId ?? data.warehouses[0]?.id ?? ''
    if (nextWarehouseId && warehouseId !== nextWarehouseId) setWarehouseId(nextWarehouseId)
  }, [data, warehouseId])

  useEffect(() => {
    if (selectedSupplierDetailId && suppliers.some((supplier) => supplier.id === selectedSupplierDetailId)) return
    const nextSupplierId = suppliers[0]?.id ?? ''
    if (nextSupplierId) setSelectedSupplierDetailId(nextSupplierId)
  }, [selectedSupplierDetailId, suppliers])

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
  const canCreateSupplier = Boolean(selectedWarehouseId) && supplierName.trim().length > 2
  const canLinkSupplierItem =
    Boolean(selectedSupplierDetail?.id) && Boolean(linkItemId) && Number(linkUnitCost) >= 0 && Number(linkLeadTimeDays) > 0
  const canCreateAndLinkItem =
    Boolean(selectedWarehouseId) &&
    Boolean(selectedSupplierDetail?.id) &&
    newItemName.trim().length > 1 &&
    Boolean(newItemUnit.trim()) &&
    Boolean(newItemCategory.trim()) &&
    Number(newItemUnitCost) >= 0 &&
    Number(newItemLeadTimeDays) > 0

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

  const handleLinkSupplierItem = () => {
    if (!canLinkSupplierItem) return
    void purchasing.linkSupplierItem({
      supplierId: selectedSupplierDetail?.id ?? '',
      itemId: linkItemId,
      unitCost: Number(linkUnitCost),
      leadTimeDays: Number(linkLeadTimeDays),
    })
    setLinkItemId('')
    setLinkUnitCost('')
    setLinkLeadTimeDays('1')
  }

  const handleCreateAndLinkItem = () => {
    if (!canCreateAndLinkItem || !selectedSupplierDetail) return
    void purchasing.createAndLinkItem({
      warehouseId: selectedWarehouseId,
      supplierId: selectedSupplierDetail.id,
      name: newItemName,
      unit: newItemUnit,
      category: newItemCategory,
      unitCost: Number(newItemUnitCost),
      leadTimeDays: Number(newItemLeadTimeDays),
    })
    setNewItemName('')
    setNewItemUnit('unidad')
    setNewItemCategory('General')
    setNewItemUnitCost('')
    setNewItemLeadTimeDays('1')
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

      <section className="grid gap-2 rounded-lg border border-stone-200 bg-white p-2 shadow-sm md:grid-cols-3">
        {[
          {
            id: 'receive' as const,
            label: 'Recibir compras',
            description: `${openOrders.length} abiertas`,
            icon: Truck,
          },
          {
            id: 'suppliers' as const,
            label: 'Proveedores e insumos',
            description: `${suppliers.length} proveedores`,
            icon: Phone,
          },
          {
            id: 'history' as const,
            label: 'Historial',
            description: `${recentOrders.length} recientes`,
            icon: CheckCircle2,
          },
        ].map((action) => {
          const ActionIcon = action.icon
          const selected = activeView === action.id
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => setActiveView(action.id)}
              aria-pressed={selected}
              className={`flex min-h-16 items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors ${
                selected
                  ? 'border-red-900 bg-red-50 text-red-950'
                  : 'border-transparent bg-white text-stone-700 hover:border-stone-200 hover:bg-stone-50'
              }`}
            >
              <span className={`grid size-9 shrink-0 place-items-center rounded-md ${
                selected ? 'bg-red-900 text-white' : 'bg-stone-100 text-stone-500'
              }`}>
                <ActionIcon size={18} />
              </span>
              <span>
                <span className="block text-sm font-black">{action.label}</span>
                <span className="block text-xs font-bold text-stone-500">{action.description}</span>
              </span>
            </button>
          )
        })}
      </section>

      {activeView === 'receive' ? (
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
                onChange={(event) => {
                  setSupplierId(event.target.value)
                  setItemId('')
                  setUnitCost('')
                }}
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
                onChange={(event) => {
                  const nextItemId = event.target.value
                  setItemId(nextItemId)
                  const offer = selectedSupplierItems.find((entry) => entry.itemId === nextItemId)
                  if (offer) setUnitCost(String(offer.unitCost))
                }}
                className="rounded-md border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-950 outline-none focus:border-red-500"
              >
                <option value="">Selecciona insumo</option>
                {purchaseItems.map((item) => (
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
      ) : null}

      {activeView === 'suppliers' ? (
      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="grid size-10 place-items-center rounded-md bg-sky-100 text-sky-700">
            <Phone size={22} />
          </span>
          <div>
            <h2 className="text-lg font-black text-stone-950">Proveedores e insumos</h2>
            <p className="text-sm font-bold text-stone-500">Selecciona un proveedor para ver y asociar sus insumos</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_340px]">
          <div className="grid h-fit gap-2">
            {suppliers.map((supplier) => {
              const offers = supplierItems.filter((entry) => entry.supplierId === supplier.id)
              const selected = selectedSupplierDetail?.id === supplier.id
              return (
                <button
                  key={supplier.id}
                  type="button"
                  onClick={() => setSelectedSupplierDetailId(supplier.id)}
                  aria-pressed={selected}
                  className={`rounded-md border p-3 text-left transition-colors ${
                    selected ? 'border-red-900 bg-red-50' : 'border-stone-200 bg-white hover:bg-stone-50'
                  }`}
                >
                  <span className="block text-sm font-black text-stone-950">{supplier.name}</span>
                  <span className="mt-1 block text-xs font-bold text-stone-500">
                    {supplier.contactName ?? 'Contacto pendiente'}
                  </span>
                  <span className="mt-2 inline-flex rounded-full bg-stone-100 px-2 py-1 text-xs font-black text-stone-700">
                    {offers.length} insumos asociados
                  </span>
                </button>
              )
            })}
          </div>

          <div className="rounded-md border border-stone-200 p-3">
            {selectedSupplierDetail ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-stone-950">{selectedSupplierDetail.name}</h3>
                    <p className="text-sm font-bold text-stone-500">
                      {selectedSupplierDetail.contactName ?? 'Contacto pendiente'}
                    </p>
                    {selectedSupplierDetail.phone ? (
                      <a
                        href={`tel:${selectedSupplierDetail.phone}`}
                        className="mt-2 inline-flex items-center gap-2 text-xs font-black text-sky-700"
                      >
                        <Phone size={14} />
                        {selectedSupplierDetail.phone}
                      </a>
                    ) : null}
                  </div>
                  <span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-black text-stone-700">
                    {selectedSupplierOffers.length} insumos
                  </span>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-stone-200 text-xs font-black uppercase tracking-wide text-stone-500">
                        <th className="py-2 pr-4">Insumo</th>
                        <th className="py-2 pr-4">Unidad</th>
                        <th className="py-2 pr-4 text-right">Costo</th>
                        <th className="py-2 text-right">Entrega</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSupplierOffers.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-4 text-sm font-bold text-stone-500">
                            Este proveedor todavia no tiene insumos asociados.
                          </td>
                        </tr>
                      ) : (
                        selectedSupplierOffers.map((offer) => (
                          <tr key={offer.id} className="border-b border-stone-100">
                            <td className="py-2 pr-4 font-black text-stone-950">{getItemName(offer.itemId)}</td>
                            <td className="py-2 pr-4 font-semibold text-stone-600">{getItemUnit(offer.itemId)}</td>
                            <td className="py-2 pr-4 text-right font-black text-stone-950">
                              {moneyFormatter.format(offer.unitCost)}
                            </td>
                            <td className="py-2 text-right font-semibold text-stone-600">
                              {offer.leadTimeDays} dia{offer.leadTimeDays === 1 ? '' : 's'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
                  <h4 className="text-sm font-black text-amber-950">Crear insumo nuevo para este proveedor</h4>
                  <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1.2fr)_110px_130px_110px_90px]">
                    <label className="grid gap-1 text-sm font-bold text-stone-700">
                      Nombre
                      <input
                        value={newItemName}
                        onChange={(event) => setNewItemName(event.target.value)}
                        className="min-w-0 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-950 outline-none focus:border-red-500"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-bold text-stone-700">
                      Unidad
                      <input
                        value={newItemUnit}
                        onChange={(event) => setNewItemUnit(event.target.value)}
                        className="min-w-0 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-950 outline-none focus:border-red-500"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-bold text-stone-700">
                      Categoria
                      <input
                        value={newItemCategory}
                        onChange={(event) => setNewItemCategory(event.target.value)}
                        className="min-w-0 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-950 outline-none focus:border-red-500"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-bold text-stone-700">
                      Costo
                      <input
                        type="number"
                        min="0"
                        value={newItemUnitCost}
                        onChange={(event) => setNewItemUnitCost(event.target.value)}
                        className="min-w-0 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-950 outline-none focus:border-red-500"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-bold text-stone-700">
                      Dias
                      <input
                        type="number"
                        min="1"
                        value={newItemLeadTimeDays}
                        onChange={(event) => setNewItemLeadTimeDays(event.target.value)}
                        className="min-w-0 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-950 outline-none focus:border-red-500"
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateAndLinkItem}
                    disabled={!canCreateAndLinkItem || purchasing.isSaving}
                    className="mt-3 inline-flex items-center justify-center gap-2 rounded-md bg-red-900 px-3 py-2 text-xs font-black text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-stone-400"
                  >
                    <Plus size={15} />
                    Crear y asociar
                  </button>
                </div>

                <div className="mt-3 rounded-md border border-stone-200 bg-stone-50 p-3">
                  <h4 className="text-sm font-black text-stone-950">Asociar insumo existente</h4>
                  <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_110px_90px]">
                    <label className="grid gap-1 text-sm font-bold text-stone-700">
                      Insumo
                      <select
                        value={linkItemId}
                        onChange={(event) => setLinkItemId(event.target.value)}
                        className="min-w-0 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-950 outline-none focus:border-red-500"
                      >
                        <option value="">Selecciona insumo</option>
                        {items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.unit})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1 text-sm font-bold text-stone-700">
                      Costo
                      <input
                        type="number"
                        min="0"
                        value={linkUnitCost}
                        onChange={(event) => setLinkUnitCost(event.target.value)}
                        className="min-w-0 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-950 outline-none focus:border-red-500"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-bold text-stone-700">
                      Dias
                      <input
                        type="number"
                        min="1"
                        value={linkLeadTimeDays}
                        onChange={(event) => setLinkLeadTimeDays(event.target.value)}
                        className="min-w-0 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-950 outline-none focus:border-red-500"
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={handleLinkSupplierItem}
                    disabled={!canLinkSupplierItem || purchasing.isSaving}
                    className="mt-3 inline-flex items-center justify-center gap-2 rounded-md bg-stone-900 px-3 py-2 text-xs font-black text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-400"
                  >
                    <Plus size={15} />
                    Asociar insumo
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm font-bold text-stone-500">No hay proveedores registrados.</p>
            )}
          </div>

          <aside className="grid h-fit gap-3 rounded-md border border-stone-200 p-3">
            <div>
              <h3 className="text-sm font-black text-stone-950">Nuevo proveedor</h3>
              <p className="text-xs font-bold text-stone-500">Primero crea el contacto, luego asocia insumos</p>
            </div>

            <label className="grid gap-1 text-sm font-bold text-stone-700">
              Nombre proveedor
              <input
                value={supplierName}
                onChange={(event) => setSupplierName(event.target.value)}
                className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-950 outline-none focus:border-red-500"
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <label className="grid gap-1 text-sm font-bold text-stone-700">
                Contacto
                <input
                  value={supplierContact}
                  onChange={(event) => setSupplierContact(event.target.value)}
                  className="min-w-0 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-950 outline-none focus:border-red-500"
                />
              </label>
              <label className="grid gap-1 text-sm font-bold text-stone-700">
                Telefono
                <input
                  value={supplierPhone}
                  onChange={(event) => setSupplierPhone(event.target.value)}
                  className="min-w-0 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-950 outline-none focus:border-red-500"
                />
              </label>
            </div>
            <label className="grid gap-1 text-sm font-bold text-stone-700">
              Condiciones
              <textarea
                value={supplierTerms}
                onChange={(event) => setSupplierTerms(event.target.value)}
                rows={3}
                className="resize-none rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-950 outline-none focus:border-red-500"
              />
            </label>
            <button
              type="button"
              onClick={handleCreateSupplier}
              disabled={!canCreateSupplier || purchasing.isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-xs font-black text-stone-900 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-400"
            >
              <Plus size={15} />
              Guardar proveedor
            </button>
          </aside>
        </div>
      </section>
      ) : null}

      {activeView === 'history' ? (
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-md bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={22} />
            </span>
            <div>
              <h2 className="text-lg font-black text-stone-950">Historial de compras</h2>
              <p className="text-sm font-bold text-stone-500">Compras recibidas, pagadas o cerradas</p>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {recentOrders.length === 0 ? (
              <p className="rounded-md bg-stone-100 px-3 py-2 text-sm font-bold text-stone-600">
                No hay compras cerradas recientes.
              </p>
            ) : (
              recentOrders.map((order) => (
                <article key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-stone-200 px-3 py-2">
                  <div>
                    <p className="text-sm font-black text-stone-950">{getSupplierName(order.supplierId)}</p>
                    <p className="text-xs font-bold text-stone-500">
                      {order.items.map((item) => getItemName(item.itemId)).join(', ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-black text-stone-600">
                      {statusLabels[order.status]}
                    </span>
                    <p className="mt-1 text-sm font-black text-stone-950">{moneyFormatter.format(order.totalCost)}</p>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      ) : null}

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
