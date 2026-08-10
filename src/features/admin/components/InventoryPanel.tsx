import { useState } from 'react'
import { AlertTriangle, History, Package, RefreshCw, Save } from 'lucide-react'
import { MERMA_REASONS, type MermaReason } from '../inventoryTypes'
import { useAdminInventory } from '../hooks/useAdminInventory'

export function InventoryPanel() {
  const inventory = useAdminInventory()
  const [selectedItemId, setSelectedItemId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState<MermaReason>('otro')

  const items = inventory.data?.items ?? []
  const stock = inventory.data?.stock ?? []
  const movements = inventory.data?.movements ?? []

  const getItemName = (itemId: string) => items.find((item) => item.id === itemId)?.name ?? itemId
  const getStockQuantity = (itemId: string) => stock.find((entry) => entry.itemId === itemId)?.quantity ?? 0

  const selectedStock = selectedItemId ? getStockQuantity(selectedItemId) : 0
  const parsedQuantity = Number(quantity)
  const canSubmit = Boolean(selectedItemId) && parsedQuantity > 0 && parsedQuantity <= selectedStock

  const handleSubmit = () => {
    if (!canSubmit) return
    void inventory.registerMerma(selectedItemId, parsedQuantity, reason)
    setQuantity('')
  }

  const reasonLabel = (value: string | null) =>
    MERMA_REASONS.find((option) => option.value === value)?.label ?? value ?? 'Otro'

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="grid gap-4">
        {/* Stock actual */}
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-md bg-emerald-100 text-emerald-700">
              <Package size={22} />
            </span>
            <div>
              <h2 className="text-lg font-black text-stone-950">Stock actual</h2>
              <p className="text-sm font-bold text-stone-500">Insumos y cantidades disponibles</p>
            </div>
          </div>

          {inventory.isLoading ? (
            <p className="mt-4 text-sm font-bold text-stone-500">Cargando inventario...</p>
          ) : items.length === 0 ? (
            <p className="mt-4 text-sm font-bold text-stone-500">
              No hay insumos registrados. Agrega insumos desde la base de datos.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-xs font-black uppercase tracking-wide text-stone-500">
                    <th className="py-2 pr-4">Insumo</th>
                    <th className="py-2 pr-4">Categoria</th>
                    <th className="py-2 pr-4">Unidad</th>
                    <th className="py-2 text-right">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const quantity = getStockQuantity(item.id)
                    const lowStock = quantity <= 5
                    return (
                      <tr key={item.id} className="border-b border-stone-100">
                        <td className="py-2 pr-4 font-black text-stone-950">{item.name}</td>
                        <td className="py-2 pr-4 font-semibold text-stone-600">{item.category}</td>
                        <td className="py-2 pr-4 font-semibold text-stone-600">{item.unit}</td>
                        <td className={`py-2 text-right font-black ${lowStock ? 'text-red-700' : 'text-stone-950'}`}>
                          {quantity} {lowStock && <AlertTriangle size={14} className="ml-1 inline text-red-600" />}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Historial de mermas */}
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-md bg-amber-100 text-amber-700">
              <History size={22} />
            </span>
            <div>
              <h2 className="text-lg font-black text-stone-950">Historial de mermas</h2>
              <p className="text-sm font-bold text-stone-500">Ultimos 50 movimientos registrados</p>
            </div>
          </div>

          {movements.length === 0 ? (
            <p className="mt-4 text-sm font-bold text-stone-500">No hay mermas registradas.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-xs font-black uppercase tracking-wide text-stone-500">
                    <th className="py-2 pr-4">Insumo</th>
                    <th className="py-2 pr-4">Cantidad</th>
                    <th className="py-2 pr-4">Motivo</th>
                    <th className="py-2 text-right">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => (
                    <tr key={movement.id} className="border-b border-stone-100">
                      <td className="py-2 pr-4 font-black text-stone-950">{getItemName(movement.itemId)}</td>
                      <td className="py-2 pr-4 font-black text-red-700">{movement.quantity}</td>
                      <td className="py-2 pr-4 font-semibold text-stone-600">{reasonLabel(movement.reason)}</td>
                      <td className="py-2 text-right font-semibold text-stone-500">
                        {new Date(movement.createdAt).toLocaleString('es-CO', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Formulario de merma */}
      <aside className="h-fit rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="grid size-10 place-items-center rounded-md bg-red-100 text-red-700">
            <AlertTriangle size={22} />
          </span>
          <div>
            <h3 className="text-base font-black text-stone-950">Registrar merma</h3>
            <p className="text-sm font-bold text-stone-500">Descuenta stock por perdida</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          <label className="grid gap-1 text-sm font-bold text-stone-700">
            Insumo
            <select
              value={selectedItemId}
              onChange={(event) => setSelectedItemId(event.target.value)}
              className="rounded-md border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-950 outline-none focus:border-red-500"
            >
              <option value="">Selecciona un insumo</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({getStockQuantity(item.id)} {item.unit})
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm font-bold text-stone-700">
            Cantidad
            <input
              type="number"
              min="1"
              max={selectedStock || undefined}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder={`Max: ${selectedStock}`}
              className="rounded-md border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-950 outline-none focus:border-red-500"
            />
          </label>

          <label className="grid gap-1 text-sm font-bold text-stone-700">
            Motivo
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value as MermaReason)}
              className="rounded-md border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-950 outline-none focus:border-red-500"
            >
              {MERMA_REASONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {selectedItemId && parsedQuantity > selectedStock && (
            <p className="text-sm font-bold text-red-700">
              La cantidad supera el stock disponible ({selectedStock}).
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || inventory.isSaving}
              className="inline-flex items-center gap-2 rounded-md bg-red-900 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              <Save size={16} />
              {inventory.isSaving ? 'Registrando...' : 'Registrar merma'}
            </button>
            <button
              type="button"
              onClick={() => void inventory.reload()}
              disabled={inventory.isLoading}
              className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-black text-stone-800 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-400"
            >
              <RefreshCw size={16} />
              Actualizar
            </button>
          </div>

          {inventory.status && (
            <p
              className={`text-sm font-bold ${
                inventory.status.includes('correctamente') ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {inventory.status}
            </p>
          )}
        </div>
      </aside>
    </div>
  )
}