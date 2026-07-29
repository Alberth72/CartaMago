import { ShoppingBag } from 'lucide-react'
import { formatCurrency } from '../../../lib/format'

type CartSummaryProps = {
  cartLinesCount: number
  total: number
  hasUnknownPrices: boolean
  onReviewOrder: () => void
}

export function CartSummary({ cartLinesCount, total, hasUnknownPrices, onReviewOrder }: CartSummaryProps) {
  if (cartLinesCount === 0) return null

  return (
    <div data-testid="cart-summary" className="fixed inset-x-0 bottom-0 z-20 border-t border-amber-100 bg-white/95 p-3 shadow-lg backdrop-blur lg:hidden">
      <button
        type="button"
        onClick={onReviewOrder}
        className="mx-auto flex h-12 max-w-xl items-center justify-between rounded-md px-4 text-sm font-black bg-red-900 text-white"
      >
        <span className="inline-flex items-center gap-2">
          <ShoppingBag size={18} aria-hidden="true" />
          Revisar pedido
        </span>
        <span>{hasUnknownPrices && total === 0 ? 'Por confirmar' : formatCurrency(total)}</span>
      </button>
      <p className="mx-auto mt-1 max-w-xl text-center text-[11px] font-bold text-stone-600">
        Elige recoger, domicilio local, DiDiFood o mesa antes de enviar.
      </p>
    </div>
  )
}
