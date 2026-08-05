import {
  Banknote,
  Bike,
  CheckCircle2,
  CreditCard,
  Landmark,
  Minus,
  PackageCheck,
  Plus,
  Send,
  ShoppingBag,
  Smartphone,
  Truck,
  Trash2,
  Utensils,
  type LucideIcon,
} from 'lucide-react'
import { type RefObject } from 'react'
import type { FulfillmentMode, MenuItem, RestaurantProfile } from '../../../data/restaurantSeed'
import { formatCurrency } from '../../../lib/format'
import type { CustomerDetails } from '../../order/orderMessage'
import {
  paymentMethodHelp,
  paymentMethodLabels,
  paymentMethodsByFulfillment,
  type PaymentMethod,
} from '../../order/payment'

const fulfillmentLabels: Record<FulfillmentMode, string> = {
  pickup: 'Recoger',
  local_delivery: 'Domicilio local',
  didi_food: 'DiDiFood',
  table: 'Mesa',
}

const fulfillmentHelp: Record<FulfillmentMode, string> = {
  pickup: 'Solicita el pedido por WhatsApp. El local confirma disponibilidad y hora antes de prepararlo.',
  local_delivery: 'El local confirma por WhatsApp cobertura, costo de domicilio y tiempo estimado.',
  didi_food: 'DiDi Food necesita integracion oficial. Por ahora no finalizamos este canal desde CartaMago.',
  table: 'Envia el pedido por WhatsApp para que el local lo confirme en mesa mientras activamos notificaciones internas.',
}

const fulfillmentMicrocopy: Record<FulfillmentMode, string> = {
  pickup: 'Pasa por el local',
  local_delivery: 'Lo lleva el restaurante',
  didi_food: 'Canal externo',
  table: 'Para comer aqui',
}

const fulfillmentBadges: Record<FulfillmentMode, string> = {
  pickup: 'Rapido',
  local_delivery: 'Local',
  didi_food: 'Proximo',
  table: 'Mesa',
}

const fulfillmentIcons: Record<FulfillmentMode, LucideIcon> = {
  pickup: PackageCheck,
  local_delivery: Truck,
  didi_food: Bike,
  table: Utensils,
}

const submitLabels: Record<FulfillmentMode, string> = {
  pickup: 'Solicitar recogida por WhatsApp',
  local_delivery: 'Pedir domicilio por WhatsApp',
  didi_food: 'DiDi Food proximamente',
  table: 'Enviar pedido de mesa por WhatsApp',
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
  const requirements = getMissingRequirements(details, cartLines.length, total, hasUnknownPrices)
  const canSubmit = requirements.length === 0 && details.fulfillmentMode !== 'didi_food'
  const availablePaymentMethods = paymentMethodsByFulfillment[details.fulfillmentMode]
  const submitLabel = details.paymentMethod === 'wompi'
    ? 'Solicitar enlace de pago Wompi'
    : submitLabels[details.fulfillmentMode]

  return (
    <aside ref={orderPanelRef} id="pedido" tabIndex={-1} data-testid="order-panel" className="scroll-mt-4 outline-none lg:sticky lg:top-4 lg:self-start">
      <div className="rounded-xl border border-amber-200 bg-white p-4 shadow-xl shadow-amber-900/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black">Tu pedido</h2>
            <p className="text-sm text-stone-600">{itemCount} productos seleccionados</p>
          </div>
          <span className="grid size-11 place-items-center rounded-lg bg-amber-100 text-red-900 shadow-sm shadow-amber-900/10">
            <ShoppingBag size={20} aria-hidden="true" />
          </span>
        </div>

        <div data-testid="cart-lines" className="mt-4 space-y-3" aria-live="polite" aria-atomic="true">
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

        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase text-stone-400">Tipo de entrega</p>
          <div className="grid grid-cols-2 gap-2">
            {restaurant.fulfillmentModes.map((mode) => {
              const FulfillmentIcon = fulfillmentIcons[mode]
              const selected = details.fulfillmentMode === mode

              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onUpdateDetails({ fulfillmentMode: mode })}
                  data-testid={`fulfillment-${mode}`}
                  aria-pressed={selected}
                  className={`group relative min-h-[104px] overflow-hidden rounded-lg border p-3 text-left transition duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 ${
                    selected
                      ? 'border-red-900 bg-red-50 text-red-950 shadow-lg shadow-red-900/10 ring-1 ring-red-900/10'
                      : 'border-stone-200 bg-white text-stone-600 hover:border-amber-300 hover:bg-amber-50/50 hover:shadow-md hover:shadow-amber-900/10'
                  }`}
                >
                  <span className={`absolute inset-x-0 top-0 h-1 transition-colors ${selected ? 'bg-red-900' : 'bg-transparent'}`} />
                  <span className="flex items-start justify-between gap-2">
                    <span className={`grid size-10 place-items-center rounded-lg transition duration-200 group-hover:scale-105 ${
                      selected ? 'bg-red-900 text-white shadow-md shadow-red-900/20' : 'bg-stone-100 text-stone-500'
                    }`}>
                      <FulfillmentIcon size={19} aria-hidden="true" />
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black ${
                      selected ? 'bg-white text-red-900' : 'bg-stone-100 text-stone-500'
                    }`}>
                      {selected ? <CheckCircle2 size={12} className="animate-pulse" aria-hidden="true" /> : null}
                      {fulfillmentBadges[mode]}
                    </span>
                  </span>
                  <span className="mt-3 block text-sm font-black">{fulfillmentLabels[mode]}</span>
                  <span className="mt-1 block text-xs leading-5 text-stone-500">{fulfillmentMicrocopy[mode]}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase text-stone-400">Medio de pago</p>
          <div className="grid gap-2">
            {availablePaymentMethods.map((method) => {
              const PaymentIcon = paymentMethodIcons[method]

              return (
                <button
                  key={method}
                  type="button"
                  onClick={() => onUpdateDetails({ paymentMethod: method })}
                  data-testid={`payment-method-${method}`}
                  aria-pressed={details.paymentMethod === method}
                  className={`group flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition duration-200 hover:-translate-y-0.5 active:translate-y-0 ${
                    details.paymentMethod === method
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-950 shadow-md shadow-emerald-900/10'
                      : 'border-stone-200 text-stone-600 hover:border-emerald-200 hover:bg-emerald-50/40 hover:shadow-sm'
                  }`}
                >
                  <span className={`grid size-8 shrink-0 place-items-center rounded-md bg-white transition group-hover:scale-105 ${
                    details.paymentMethod === method ? 'text-emerald-700' : 'text-stone-500'
                  }`}>
                    <PaymentIcon size={16} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-black">{paymentMethodLabels[method]}</span>
                    <span className="block text-xs leading-5 text-stone-500">{paymentMethodHelp[method]}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <input
            value={details.name}
            onChange={(event) => onUpdateDetails({ name: event.target.value })}
            data-testid="customer-name"
            placeholder="Tu nombre"
            className="h-11 w-full rounded-md border border-stone-200 px-3 text-sm outline-none focus:border-emerald-600"
          />
          {details.fulfillmentMode !== 'table' && details.fulfillmentMode !== 'didi_food' ? (
            <input
              value={details.phone}
              onChange={(event) => onUpdateDetails({ phone: event.target.value })}
              data-testid="customer-phone"
              placeholder="Telefono para confirmar"
              className="h-11 w-full rounded-md border border-stone-200 px-3 text-sm outline-none focus:border-emerald-600"
            />
          ) : null}
          {details.fulfillmentMode === 'local_delivery' ? (
            <input
              value={details.address}
              onChange={(event) => onUpdateDetails({ address: event.target.value })}
              data-testid="delivery-address"
              placeholder="Direccion para domicilio local"
              className="h-11 w-full rounded-md border border-stone-200 px-3 text-sm outline-none focus:border-emerald-600"
            />
          ) : null}
          {details.fulfillmentMode === 'didi_food' ? (
            <div data-testid="didi-food-pending" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
              DiDi Food se activara cuando conectemos la tienda oficial. Este canal no envia pedidos por WhatsApp.
            </div>
          ) : null}
          {details.fulfillmentMode === 'table' ? (
            <input
              value={details.table}
              onChange={(event) => onUpdateDetails({ table: event.target.value })}
              data-testid="table-number"
              placeholder="Numero de mesa"
              className="h-11 w-full rounded-md border border-stone-200 px-3 text-sm outline-none focus:border-emerald-600"
            />
          ) : null}
          <textarea
            value={details.note}
            onChange={(event) => onUpdateDetails({ note: event.target.value })}
            data-testid="customer-note"
            placeholder="Notas generales para todo el pedido..."
            rows={3}
            className="w-full resize-none rounded-md border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-600"
          />
        </div>

        <div className="mt-4 rounded-md bg-stone-50 p-3 text-xs leading-5 text-stone-700">
          {fulfillmentHelp[details.fulfillmentMode]}
        </div>

        {requirements.length > 0 ? (
          <ul data-testid="order-requirements" className="mt-3 grid gap-1 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-950">
            {requirements.map((requirement) => (
              <li key={requirement}>{requirement}</li>
            ))}
          </ul>
        ) : null}

        <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-4">
          <span className="text-sm font-bold text-stone-500">
            {hasUnknownPrices ? 'Total conocido' : 'Total aprox.'}
          </span>
          <span data-testid="cart-total" className="text-2xl font-black">{hasUnknownPrices && total === 0 ? 'Por confirmar' : formatCurrency(total)}</span>
        </div>

        {canSubmit ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            onClick={onWhatsAppClick}
            data-testid="whatsapp-link"
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 py-3 text-center text-sm font-black text-white shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-emerald-800 active:translate-y-0"
          >
            <Send size={18} aria-hidden="true" />
            {submitLabel}
          </a>
        ) : (
          <button
            type="button"
            disabled
            data-testid="whatsapp-disabled"
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-stone-200 px-3 py-3 text-center text-sm font-black text-stone-500 shadow-sm"
          >
            <Send size={18} aria-hidden="true" />
            {submitLabel}
          </button>
        )}
      </div>
    </aside>
  )
}

const paymentMethodIcons: Record<PaymentMethod, typeof Banknote> = {
  cash: Banknote,
  card_at_counter: CreditCard,
  card_at_table: CreditCard,
  bank_transfer: Landmark,
  wompi: Smartphone,
  didi_food: Smartphone,
}

function getMissingRequirements(
  details: CustomerDetails,
  cartLinesCount: number,
  total: number,
  hasUnknownPrices: boolean,
) {
  const missing: string[] = []

  if (cartLinesCount === 0) {
    missing.push('Agrega al menos un producto.')
  }

  if (details.fulfillmentMode === 'didi_food') {
    missing.push('DiDi Food esta pendiente de integracion oficial.')
    return missing
  }

  if (details.paymentMethod === 'wompi' && (hasUnknownPrices || total <= 0)) {
    missing.push('El pago Wompi necesita un total confirmado.')
  }

  if (details.fulfillmentMode === 'pickup') {
    if (!details.name.trim()) missing.push('Escribe el nombre de quien recoge.')
    if (!details.phone.trim()) missing.push('Escribe un telefono para confirmar.')
  }

  if (details.fulfillmentMode === 'local_delivery') {
    if (!details.name.trim()) missing.push('Escribe el nombre de quien recibe.')
    if (!details.phone.trim()) missing.push('Escribe un telefono para confirmar.')
    if (!details.address.trim()) missing.push('Escribe la direccion del domicilio.')
  }

  if (details.fulfillmentMode === 'table' && !details.table.trim()) {
    missing.push('Escribe el numero de mesa.')
  }

  return missing
}
