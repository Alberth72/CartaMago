import { Printer, ReceiptText } from 'lucide-react'
import { formatCurrency } from '../../lib/format'
import type { ReceiptData, ReceiptLine } from './receiptTypes'

type ReceiptCardProps = {
  receipt: ReceiptData
  onPrint?: () => void
  compact?: boolean
}

export function ReceiptCard({ receipt, onPrint, compact = false }: ReceiptCardProps) {
  return (
    <section
      data-testid="receipt-card"
      className={`receipt-print-area rounded-lg border border-stone-200 bg-white text-stone-950 shadow-sm ${
        compact ? 'p-4' : 'p-5'
      }`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-dashed border-stone-300 pb-3">
        <div>
          <p className="text-xs font-black uppercase tracking-normal text-stone-500">Recibo interno</p>
          <h2 className="mt-1 text-xl font-black tracking-normal">{receipt.businessName}</h2>
          <p className="text-sm font-bold text-stone-600">{receipt.branchName}</p>
          {receipt.cashSessionName ? (
            <p className="text-xs font-bold text-stone-500">{receipt.cashSessionName}</p>
          ) : null}
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-stone-950 text-white">
          <ReceiptText size={19} aria-hidden="true" />
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <ReceiptMeta label="Ticket" value={receipt.receiptNumber} strong />
        <ReceiptMeta label="Fecha" value={formatReceiptDate(receipt.issuedAt)} />
        <ReceiptMeta label="Canal" value={receipt.channelLabel} />
        <ReceiptMeta label="Entrega" value={receipt.fulfillmentLabel} />
        <ReceiptMeta label="Pago" value={receipt.paymentLabel} />
        <ReceiptMeta label="Estado pago" value={receipt.paymentStatusLabel} />
        {receipt.customerName ? <ReceiptMeta label="Cliente" value={receipt.customerName} /> : null}
        {receipt.tableNumber ? <ReceiptMeta label="Mesa" value={receipt.tableNumber} /> : null}
      </div>

      <div className="mt-4 border-y border-dashed border-stone-300 py-2">
        <div className="grid grid-cols-[1fr_42px_76px] gap-2 text-[11px] font-black uppercase text-stone-500">
          <span>Producto</span>
          <span className="text-right">Cant.</span>
          <span className="text-right">Total</span>
        </div>
        <ul className="mt-1 divide-y divide-stone-100">
          {receipt.items.map((item, index) => (
            <ReceiptLineItem key={item.id ?? `${item.productName}-${index}`} item={item} />
          ))}
        </ul>
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase text-stone-400">Pedido</p>
          <p className="mt-1 max-w-[170px] truncate text-xs font-black text-stone-600">{receipt.orderId}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase text-stone-500">Total</p>
          <p className="mt-1 text-2xl font-black">{formatCurrency(receipt.totalCop)}</p>
        </div>
      </div>

      {receipt.footer ? (
        <p className="mt-4 border-t border-dashed border-stone-300 pt-3 text-center text-xs font-bold leading-5 text-stone-500">
          {receipt.footer}
        </p>
      ) : null}

      {onPrint ? (
        <button
          type="button"
          onClick={onPrint}
          data-testid="print-receipt"
          className="no-print mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-stone-950 px-3 py-2 text-sm font-black text-white transition hover:bg-stone-800"
        >
          <Printer size={16} aria-hidden="true" />
          Imprimir recibo
        </button>
      ) : null}
    </section>
  )
}

type ReceiptMetaProps = {
  label: string
  value: string
  strong?: boolean
}

function ReceiptMeta({ label, value, strong = false }: ReceiptMetaProps) {
  return (
    <div className="min-w-0 rounded-md bg-stone-50 px-2 py-2">
      <p className="text-[10px] font-black uppercase text-stone-400">{label}</p>
      <p className={`mt-0.5 truncate text-xs ${strong ? 'font-black text-stone-950' : 'font-bold text-stone-700'}`}>
        {value}
      </p>
    </div>
  )
}

function ReceiptLineItem({ item }: { item: ReceiptLine }) {
  const lineTotal = item.lineTotalCop ?? (item.unitPriceCop == null ? null : item.unitPriceCop * item.quantity)

  return (
    <li className="grid grid-cols-[1fr_42px_76px] gap-2 py-2 text-xs">
      <div className="min-w-0">
        <p className="font-black text-stone-900">{item.productName}</p>
        {item.unitPriceCop != null ? (
          <p className="mt-0.5 text-[11px] font-bold text-stone-500">{formatCurrency(item.unitPriceCop)} c/u</p>
        ) : null}
        {item.lineNote ? <p className="mt-0.5 text-[11px] font-bold text-stone-500">{item.lineNote}</p> : null}
      </div>
      <p className="text-right font-black text-stone-700">{item.quantity}</p>
      <p className="text-right font-black text-stone-900">{lineTotal == null ? '--' : formatCurrency(lineTotal)}</p>
    </li>
  )
}

function formatReceiptDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}
