import { useEffect, useState } from 'react'
import { ArrowDownUp, CheckCircle2, PackageCheck, RefreshCw, Save, ShoppingCart, Truck, Warehouse } from 'lucide-react'
import { useAdminOperations } from '../hooks/useAdminOperations'
import type { DispatchRequestStatus, DispatchStatus } from '../operationsTypes'

const requestStatusLabels: Record<DispatchRequestStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  dispatched: 'Despachada',
  received: 'Recibida',
  rejected: 'Rechazada',
}

const dispatchStatusLabels: Record<DispatchStatus, string> = {
  preparing: 'Preparando',
  shipped: 'Enviada',
  received: 'Recibida',
  cancelled: 'Cancelada',
}

const roleLabels = {
  superadmin: 'Superadmin',
  warehouse_admin: 'Admin de bodega',
  branch_admin: 'Admin de sede',
  cashier: 'Cajero',
}

export function OperationsPanel() {
  const operations = useAdminOperations()
  const data = operations.data
  const [requestBranchId, setRequestBranchId] = useState('')
  const [requestItemId, setRequestItemId] = useState('')
  const [requestQuantity, setRequestQuantity] = useState('')
  const [requestNotes, setRequestNotes] = useState('')
  const [saleBranchId, setSaleBranchId] = useState('')
  const [saleProductId, setSaleProductId] = useState('')
  const [saleQuantity, setSaleQuantity] = useState('1')

  const branches = data?.branches ?? []
  const warehouses = data?.warehouses ?? []
  const items = data?.items ?? []
  const products = data?.products ?? []
  const requests = data?.requests ?? []
  const dispatches = data?.dispatches ?? []
  const profile = data?.profile

  const lockedBranchId = profile?.canManageWarehouse ? null : profile?.primaryBranchId
  const selectedRequestBranch =
    branches.find((branch) => branch.id === (lockedBranchId ?? requestBranchId)) ?? branches[0]
  const selectedWarehouseId = selectedRequestBranch?.warehouseId ?? warehouses[0]?.id ?? ''
  const saleProducts = products.filter((product) => !saleBranchId || product.branchId === saleBranchId)
  const canOperateAsBranch = Boolean(profile?.primaryBranchId || profile?.role === 'superadmin')
  const canDispatchFromWarehouse = Boolean(profile?.canManageWarehouse)

  useEffect(() => {
    if (!data) return

    const nextBranchId = lockedBranchId ?? data.branches[0]?.id ?? ''
    if (nextBranchId && requestBranchId !== nextBranchId) setRequestBranchId(nextBranchId)
    if (nextBranchId && saleBranchId !== nextBranchId) setSaleBranchId(nextBranchId)
  }, [data, lockedBranchId, requestBranchId, saleBranchId])

  const branchRows = branches.map((branch) => ({
    branch,
    stock: items.map((item) => ({
      item,
      quantity:
        data?.branchStock.find((entry) => entry.branchId === branch.id && entry.itemId === item.id)?.quantity ?? 0,
    })),
  }))

  const getItemName = (itemId: string) => items.find((item) => item.id === itemId)?.name ?? itemId
  const getBranchName = (branchId: string) => branches.find((branch) => branch.id === branchId)?.name ?? branchId
  const getWarehouseName = (warehouseId: string) =>
    warehouses.find((warehouse) => warehouse.id === warehouseId)?.name ?? warehouseId

  const canCreateRequest =
    canOperateAsBranch &&
    Boolean(selectedRequestBranch?.id) &&
    Boolean(selectedWarehouseId) &&
    Boolean(requestItemId) &&
    Number(requestQuantity) > 0
  const canSell = canOperateAsBranch && Boolean(saleBranchId) && Boolean(saleProductId) && Number(saleQuantity) > 0

  const handleCreateRequest = () => {
    if (!canCreateRequest || !selectedRequestBranch) return
    void operations.createRequest({
      branchId: selectedRequestBranch.id,
      warehouseId: selectedWarehouseId,
      itemId: requestItemId,
      quantity: Number(requestQuantity),
      notes: requestNotes,
    })
    setRequestQuantity('')
    setRequestNotes('')
  }

  const handleSellProduct = () => {
    if (!canSell) return
    void operations.sellProduct(saleBranchId, saleProductId, Number(saleQuantity))
    setSaleQuantity('1')
  }

  if (operations.isLoading) {
    return (
      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-bold text-stone-500">Cargando operacion multi-sede...</p>
      </section>
    )
  }

  return (
    <div className="grid gap-4">
      {profile ? (
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-stone-500">Perfil operativo</p>
              <h2 className="mt-1 text-lg font-black text-stone-950">{roleLabels[profile.role]}</h2>
              <p className="text-sm font-bold text-stone-500">{profile.email}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-black text-stone-700">
              {profile.primaryBranchId ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">
                  Sede: {getBranchName(profile.primaryBranchId)}
                </span>
              ) : null}
              {profile.primaryWarehouseId ? (
                <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-800">
                  Bodega: {getWarehouseName(profile.primaryWarehouseId)}
                </span>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="grid size-10 place-items-center rounded-md bg-sky-100 text-sky-700">
                <Warehouse size={22} />
              </span>
              <div>
                <h2 className="text-lg font-black text-stone-950">Bodega central</h2>
                <p className="text-sm font-bold text-stone-500">Stock disponible para reabastecer sedes</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void operations.reload()}
              disabled={operations.isLoading}
              className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-black text-stone-800 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-400"
            >
              <RefreshCw size={16} />
              Actualizar
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-xs font-black uppercase tracking-wide text-stone-500">
                  <th className="py-2 pr-4">Bodega</th>
                  <th className="py-2 pr-4">Insumo</th>
                  <th className="py-2 pr-4">Unidad</th>
                  <th className="py-2 text-right">Stock</th>
                </tr>
              </thead>
              <tbody>
                {(data?.warehouseStock ?? []).map((stock) => (
                  <tr key={stock.id} className="border-b border-stone-100">
                    <td className="py-2 pr-4 font-bold text-stone-700">{getWarehouseName(stock.warehouseId ?? '')}</td>
                    <td className="py-2 pr-4 font-black text-stone-950">{getItemName(stock.itemId)}</td>
                    <td className="py-2 pr-4 font-semibold text-stone-600">
                      {items.find((item) => item.id === stock.itemId)?.unit ?? 'unidad'}
                    </td>
                    <td className="py-2 text-right font-black text-stone-950">{stock.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="h-fit rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-md bg-amber-100 text-amber-700">
              <ArrowDownUp size={22} />
            </span>
            <div>
              <h3 className="text-base font-black text-stone-950">Solicitar reabastecimiento</h3>
              <p className="text-sm font-bold text-stone-500">La sede pide inventario a su bodega</p>
            </div>
          </div>

          {canOperateAsBranch ? (
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm font-bold text-stone-700">
              Sede
              <select
                value={requestBranchId}
                onChange={(event) => setRequestBranchId(event.target.value)}
                disabled={Boolean(lockedBranchId)}
                className="rounded-md border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-950 outline-none focus:border-red-500"
              >
                <option value="">Selecciona una sede</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-bold text-stone-700">
              Insumo
              <select
                value={requestItemId}
                onChange={(event) => setRequestItemId(event.target.value)}
                className="rounded-md border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-950 outline-none focus:border-red-500"
              >
                <option value="">Selecciona un insumo</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.unit})
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-bold text-stone-700">
              Cantidad
              <input
                type="number"
                min="1"
                value={requestQuantity}
                onChange={(event) => setRequestQuantity(event.target.value)}
                className="rounded-md border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-950 outline-none focus:border-red-500"
              />
            </label>

            <label className="grid gap-1 text-sm font-bold text-stone-700">
              Nota
              <textarea
                value={requestNotes}
                onChange={(event) => setRequestNotes(event.target.value)}
                rows={3}
                className="resize-none rounded-md border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-950 outline-none focus:border-red-500"
              />
            </label>

            <button
              type="button"
              onClick={handleCreateRequest}
              disabled={!canCreateRequest || operations.isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-red-900 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              <Save size={16} />
              Crear solicitud
            </button>
          </div>
          ) : (
            <p className="mt-4 rounded-md bg-stone-100 px-3 py-2 text-sm font-bold text-stone-600">
              Este usuario gestiona bodega; las solicitudes las crean las sedes.
            </p>
          )}
        </aside>
      </div>

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="grid size-10 place-items-center rounded-md bg-emerald-100 text-emerald-700">
            <PackageCheck size={22} />
          </span>
          <div>
            <h2 className="text-lg font-black text-stone-950">Stock por sede</h2>
            <p className="text-sm font-bold text-stone-500">Comparativo rapido de inventario operativo</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {branchRows.map(({ branch, stock }) => (
            <div key={branch.id} className="rounded-lg border border-stone-200 p-3">
              <h3 className="text-sm font-black text-stone-950">{branch.name}</h3>
              <div className="mt-3 grid gap-2">
                {stock.slice(0, 6).map(({ item, quantity }) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-bold text-stone-600">{item.name}</span>
                    <span className={`font-black ${quantity <= 10 ? 'text-red-700' : 'text-stone-950'}`}>
                      {quantity} {item.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-md bg-orange-100 text-orange-700">
              <Truck size={22} />
            </span>
            <div>
              <h2 className="text-lg font-black text-stone-950">Solicitudes de sedes</h2>
              <p className="text-sm font-bold text-stone-500">Despacha desde bodega y recibe en sede</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {requests.length === 0 ? (
              <p className="text-sm font-bold text-stone-500">No hay solicitudes registradas.</p>
            ) : (
              requests.map((request) => {
                const linkedDispatch = dispatches.find((dispatch) => dispatch.dispatchRequestId === request.id)
                return (
                  <div key={request.id} className="rounded-lg border border-stone-200 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-stone-950">{getBranchName(request.branchId)}</p>
                        <p className="text-xs font-bold text-stone-500">
                          {request.items.map((item) => `${getItemName(item.itemId)} x ${item.quantity}`).join(', ')}
                        </p>
                        {request.notes ? <p className="mt-1 text-xs font-semibold text-stone-500">{request.notes}</p> : null}
                      </div>
                      <span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-black text-stone-700">
                        {requestStatusLabels[request.status]}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {canDispatchFromWarehouse && (request.status === 'pending' || request.status === 'approved') && (
                        <button
                          type="button"
                          onClick={() => void operations.dispatchRequest(request.id)}
                          disabled={!canDispatchFromWarehouse || operations.isSaving}
                          className="inline-flex items-center gap-2 rounded-md bg-stone-900 px-3 py-2 text-xs font-black text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-400"
                        >
                          <Truck size={15} />
                          Despachar
                        </button>
                      )}
                      {canOperateAsBranch && linkedDispatch?.status === 'shipped' ? (
                        <button
                          type="button"
                          onClick={() => void operations.receiveDispatch(linkedDispatch.id)}
                          disabled={operations.isSaving}
                          className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-xs font-black text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-stone-400"
                        >
                          <CheckCircle2 size={15} />
                          Recibir en sede
                        </button>
                      ) : null}
                      {linkedDispatch ? (
                        <span className="inline-flex items-center rounded-md border border-stone-200 px-3 py-2 text-xs font-black text-stone-600">
                          Despacho: {dispatchStatusLabels[linkedDispatch.status]}
                        </span>
                      ) : null}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>

        <aside className="h-fit rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-md bg-red-100 text-red-700">
              <ShoppingCart size={22} />
            </span>
            <div>
              <h3 className="text-base font-black text-stone-950">Registrar venta</h3>
              <p className="text-sm font-bold text-stone-500">Descuenta insumos por formula</p>
            </div>
          </div>

          {canOperateAsBranch ? (
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm font-bold text-stone-700">
              Sede
              <select
                value={saleBranchId}
                onChange={(event) => {
                  setSaleBranchId(event.target.value)
                  setSaleProductId('')
                }}
                disabled={Boolean(lockedBranchId)}
                className="rounded-md border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-950 outline-none focus:border-red-500"
              >
                <option value="">Selecciona una sede</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-bold text-stone-700">
              Producto
              <select
                value={saleProductId}
                onChange={(event) => setSaleProductId(event.target.value)}
                className="rounded-md border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-950 outline-none focus:border-red-500"
              >
                <option value="">Selecciona un producto</option>
                {saleProducts.map((product) => (
                  <option key={`${product.branchId}:${product.id}`} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-bold text-stone-700">
              Cantidad vendida
              <input
                type="number"
                min="1"
                value={saleQuantity}
                onChange={(event) => setSaleQuantity(event.target.value)}
                className="rounded-md border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-950 outline-none focus:border-red-500"
              />
            </label>

            <button
              type="button"
              onClick={handleSellProduct}
              disabled={!canSell || operations.isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-red-900 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              <ShoppingCart size={16} />
              Registrar venta
            </button>
          </div>
          ) : (
            <p className="mt-4 rounded-md bg-stone-100 px-3 py-2 text-sm font-bold text-stone-600">
              La venta operativa se registra desde un usuario de sede.
            </p>
          )}
        </aside>
      </div>

      {operations.status ? (
        <p
          className={`rounded-lg border px-4 py-3 text-sm font-bold ${
            operations.status.includes('correctamente') ||
            operations.status.includes('despachada') ||
            operations.status.includes('recibido') ||
            operations.status.includes('descontado')
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {operations.status}
        </p>
      ) : null}
    </div>
  )
}
