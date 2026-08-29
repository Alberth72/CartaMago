import { CheckCircle2, MessageCircle, PackagePlus, ReceiptText, RefreshCcw, Route, TriangleAlert } from 'lucide-react'
import { printReceipt } from '../../receipt/printReceipt'
import { ReceiptCard } from '../../receipt/ReceiptCard'
import type { ReceiptData } from '../../receipt/receiptTypes'

type OrderConfirmationProps = {
  receipt: ReceiptData
  saved: boolean
  saveStatus: 'idle' | 'saving' | 'saved' | 'failed'
  whatsappUrl: string
  whatsappNotification?: {
    status: 'skipped' | 'sent' | 'failed'
    destinationPhone?: string
    errorMessage?: string
  }
  trackingUrl?: string | null
  onStartNewOrder: () => void
}

export function OrderConfirmation({
  receipt,
  saved,
  saveStatus,
  whatsappUrl,
  whatsappNotification,
  trackingUrl,
  onStartNewOrder,
}: OrderConfirmationProps) {
  const notification = getNotificationState(whatsappNotification)
  const title = getTitle(saveStatus, saved)
  const description = getDescription(saveStatus, saved, receipt.businessName)

  return (
    <section
      data-testid="order-confirmation"
      aria-live="polite"
      className="overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-xl shadow-emerald-900/10"
    >
      <div className="flex items-start gap-3 border-b border-emerald-100 bg-emerald-50 px-5 py-4">
        <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-700" size={22} aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="text-lg font-black text-emerald-900">{title}</h2>
          <p className="text-sm leading-5 text-emerald-800">{description}</p>
        </div>
      </div>

      <div className="p-4">
        <ReceiptCard receipt={receipt} onPrint={printReceipt} compact />

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <a
            href={trackingUrl ?? undefined}
            target="_blank"
            rel="noreferrer"
            data-testid="confirmation-tracking-link"
            className={
              trackingUrl
                ? 'inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-stone-950 px-3 py-2 text-sm font-black text-white transition hover:bg-stone-800'
                : 'pointer-events-none inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-stone-200 px-3 py-2 text-sm font-black text-stone-500'
            }
          >
            <Route size={16} aria-hidden="true" />
            Ver estado del pedido
          </a>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            data-testid="confirmation-whatsapp-link"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-emerald-700 px-3 py-2 text-sm font-black text-emerald-800 transition hover:bg-emerald-50"
          >
            <MessageCircle size={16} aria-hidden="true" />
            Enviar manualmente
          </a>
        </div>

        <button
          type="button"
          onClick={onStartNewOrder}
          data-testid="start-new-order"
          className="mt-3 inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-md border border-stone-200 px-3 py-2 text-sm font-black text-stone-700 transition hover:bg-stone-50"
        >
          <PackagePlus size={16} aria-hidden="true" />
          Hacer otro pedido
        </button>

        {saveStatus === 'saving' ? (
          <p
            data-testid="confirmation-saving"
            className="mt-3 flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold leading-5 text-sky-900"
          >
            <RefreshCcw className="mt-0.5 shrink-0" size={14} aria-hidden="true" />
            Estamos guardando el pedido y preparando el aviso automatico por WhatsApp.
          </p>
        ) : !saved ? (
          <p
            data-testid="confirmation-not-saved"
            className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-900"
          >
            <TriangleAlert className="mt-0.5 shrink-0" size={15} aria-hidden="true" />
            No pudimos guardar el ticket ni enviar la confirmacion automatica en este momento.
            Usa el envio manual por WhatsApp o muestra este recibo al local.
          </p>
        ) : (
          <p className={`mt-3 flex items-start gap-2 rounded-md border px-3 py-2 text-xs font-bold leading-5 ${notification.className}`}>
            {notification.kind === 'sent' ? (
              <ReceiptText className="mt-0.5 shrink-0" size={14} aria-hidden="true" />
            ) : (
              <RefreshCcw className="mt-0.5 shrink-0" size={14} aria-hidden="true" />
            )}
            {notification.copy}
          </p>
        )}
      </div>
    </section>
  )
}

function getTitle(saveStatus: OrderConfirmationProps['saveStatus'], saved: boolean) {
  if (saveStatus === 'saving') return 'Registrando pedido'
  if (saved) return 'Pedido recibido'
  if (saveStatus === 'failed') return 'Pedido pendiente de envio'
  return 'Pedido preparado'
}

function getDescription(saveStatus: OrderConfirmationProps['saveStatus'], saved: boolean, businessName: string) {
  if (saveStatus === 'saving') {
    return `Estamos guardando tu pedido en ${businessName}. Si todo esta listo, recibiras la confirmacion automatica por WhatsApp.`
  }

  if (saved) {
    return `Ya recibimos tu pedido en ${businessName}. Intentaremos enviarte un aviso por WhatsApp y el restaurante confirmara disponibilidad, tiempo y pago.`
  }

  return `No pudimos confirmar el pedido automaticamente con ${businessName}. Conserva este ticket y usa el envio manual si necesitas avisar al restaurante.`
}

function getNotificationState(notification: OrderConfirmationProps['whatsappNotification']) {
  if (notification?.status === 'sent') {
    return {
      kind: 'sent',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-900',
      copy: `Pedido registrado. Enviamos el aviso automatico al WhatsApp ${notification.destinationPhone ?? 'del cliente'}.`,
    }
  }

  if (notification?.status === 'failed') {
    return {
      kind: 'failed',
      className: 'border-amber-200 bg-amber-50 text-amber-900',
      copy: 'Pedido registrado. No pudimos enviar el aviso automatico por WhatsApp; el enlace manual queda disponible.',
    }
  }

  if (notification?.status === 'skipped') {
    return {
      kind: 'skipped',
      className: 'border-sky-200 bg-sky-50 text-sky-900',
      copy: 'Pedido registrado. El aviso automatico por WhatsApp todavia no esta configurado; el enlace manual queda disponible.',
    }
  }

  return {
    kind: 'pending',
    className: 'border-stone-200 bg-stone-50 text-stone-700',
    copy: 'Pedido registrado con tu ticket. Estamos revisando el estado del aviso por WhatsApp.',
  }
}
