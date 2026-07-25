import { Minus, Plus, Send, ShoppingBag, Trash2 } from 'lucide-react'
import { type RefObject } from 'react'
import type { FulfillmentMode, MenuItem, RestaurantProfile } from '../../../data/restaurantSeed'
import { formatCurrency } from '../../../lib/format'
import type { CustomerDetails } from '../../order/orderMessage'

const fulfillmentLabels: Record<FulfillmentMode, string> = {
  pickup: 'Recoger',
  delivery: 'Domicilio',
  table: 'Mesa',
}

type OrderPanelProps = {
  cartLines: Array<{ item: MenuItem; quantity: number; note: string }>
  details: CustomerDetails
  restaurant: RestaurantProfile
  total: number
  hasUnknownPrices: boolean
  itemCount: number
  whatsappUrl: string
  orderPanelRef: RefObject<HTMLElement | null>
  onUpdateDetails: (partial: Partial<CustomerDetails>) => void
  onAddItem: (itemId: string) => void
  onRemoveItem: (itemId: string) => void
  onClearItem: (itemId: string) => void
  onUpdateItemNote: (itemId: string, note: string) => void
  onWhatsAppClick?: () => void
}

export function OrderPanel({
  cartLines,
  details,
  restaurant,
  total,
  hasUnknownPrices,
  itemCount,
  whatsappUrl,
  orderPanelRef,
  onUpdateDetails,
  onAddItem,
  onRemoveItem,
  onClearItem,
  onUpdateItemNote,
  onWhatsAppClick,
}: OrderPanelProps) {
  return (
    <aside ref={orderPanelRef} id="pedido" tabIndex={-1} className="scroll-mt-4 outline-none lg:sticky lg:top-4 lg:self-start">
      <div className="rounded-lg border border-amber-100 bg-white p-4 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black">Tu pedido</h2>
            <p className="text-sm text-stone-600">{itemCount} productos seleccionados</p>
          </div>
          <span className="grid size-11 place-items-center rounded-md bg-amber-100 text-red-900">
            <ShoppingBag size={20} aria-hidden="true" />
          </span>
        </div>

        <div className="mt-4 space-y-3" aria-live="polite" aria-atomic="true">
          {cartLines.length === 0 ? (
            <p className="rounded-md bg-stone-50 p-4 text-sm leading-6 text-stone-700">
              Agrega productos del menu para armar el mensaje de WhatsApp.
            </p>
          ) : (
            cartLines.map((line) => (
              <div key={line.item.id} className="border-b border-stone-100 pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">{line.item.name}</p>
                    <p className="text-sm text-stone-600">
                      {line.item.price == null
                        ? (line.item.priceNote ?? 'Precio por confirmar')
                        : formatCurrency(line.item.price * line.quantity)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onRemoveItem(line.item.id)}
                      className="grid size-9 place-items-center rounded-md border border-stone-200 text-stone-700"
                      aria-label={`Restar ${line.item.name}`}
                    >
                      <Minus size={16} aria-hidden="true" />
                    </button>
                    <span className="w-7 text-center text-sm font-black">{line.quantity}</span>
                    <button
                      type="button"
                      onClick={() => onAddItem(line.item.id)}
                      className="grid size-9 place-items-center rounded-md border border-stone-200 text-stone-700"
                      aria-label={`Sumar ${line.item.name}`}
                    >
                      <Plus size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onClearItem(line.item.id)}
                      className="grid size-9 place-items-center rounded-md border border-stone-200 text-red-600"
                      aria-label={`Quitar ${line.item.name}`}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <input
                  value={line.note}
                  onChange={(e) => onUpdateItemNote(line.item.id, e.target.value)}
                  placeholder="Nota: punto, salsa..."
                  className="mt-2 h-8 w-full rounded-md border border-stone-200 px-2 text-xs outline-none focus:border-emerald-600"
                />
              </div>
            ))
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {restaurant.fulfillmentModes.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onUpdateDetails({ fulfillmentMode: mode })}
              className={`rounded-md border px-2 py-2 text-sm font-black ${
                details.fulfillmentMode === mode
                  ? 'border-red-900 bg-red-50 text-red-900'
                  : 'border-stone-200 text-stone-600'
              }`}
            >
              {fulfillmentLabels[mode]}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          <input
            value={details.name}
            onChange={(event) => onUpdateDetails({ name: event.target.value })}
            placeholder="Tu nombre"
            className="h-11 w-full rounded-md border border-stone-200 px-3 text-sm outline-none focus:border-emerald-600"
          />
          {details.fulfillmentMode === 'delivery' ? (
            <input
              value={details.address}
              onChange={(event) => onUpdateDetails({ address: event.target.value })}
              placeholder="Direccion para domicilio"
              className="h-11 w-full rounded-md border border-stone-200 px-3 text-sm outline-none focus:border-emerald-600"
            />
          ) : null}
          {details.fulfillmentMode === 'table' ? (
            <input
              value={details.table}
              onChange={(event) => onUpdateDetails({ table: event.target.value })}
              placeholder="Numero de mesa"
              className="h-11 w-full rounded-md border border-stone-200 px-3 text-sm outline-none focus:border-emerald-600"
            />
          ) : null}
          <textarea
            value={details.note}
            onChange={(event) => onUpdateDetails({ note: event.target.value })}
            placeholder="Notas generales para todo el pedido..."
            rows={3}
            className="w-full resize-none rounded-md border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
          />
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-4">
          <span className="text-sm font-bold text-stone-500">
            {hasUnknownPrices ? 'Total conocido' : 'Total aprox.'}
          </span>
          <span className="text-2xl font-black">{hasUnknownPrices && total === 0 ? 'Por confirmar' : formatCurrency(total)}</span>
        </div>

        {cartLines.length > 0 ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            onClick={onWhatsAppClick}
            className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 text-sm font-black text-white shadow-sm hover:bg-emerald-700"
          >
            <Send size={18} aria-hidden="true" />
            Pedir por WhatsApp
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-stone-200 text-sm font-black text-stone-500 shadow-sm"
          >
            <Send size={18} aria-hidden="true" />
            Pedir por WhatsApp
          </button>
        )}
      </div>
    </aside>
  )
}