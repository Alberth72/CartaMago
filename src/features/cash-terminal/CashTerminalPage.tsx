import { useCallback, useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { CreditCard, ExternalLink, LockKeyhole, Minus, Plus, RefreshCw, ShoppingCart, Trash2, Wallet } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { makeBranchLinks } from '../../lib/branchLinks'
import { formatCurrency } from '../../lib/format'
import { ReceiptCard } from '../receipt/ReceiptCard'
import { printReceipt } from '../receipt/printReceipt'
import { saveReceiptTrackingFallback } from '../receipt/receiptFallbackStorage'
import type { ReceiptData } from '../receipt/receiptTypes'
import { paymentMethodLabels } from '../order/payment'
import type { SalePaymentMethod } from '../admin/operationsTypes'
import {
  createCashTerminalSale,
  fetchCashTerminal,
  type CashTerminalData,
  type CashTerminalProduct,
  type CashTerminalSaleResult,
} from './cashTerminalRepository'

const salePaymentMethods: SalePaymentMethod[] = ['cash', 'card_at_counter', 'bank_transfer', 'wompi']
const emptyProducts: CashTerminalProduct[] = []

type CartLine = {
  productId: string
  quantity: number
}

type LastSaleReceipt = ReceiptData & {
  trackingUrl: string
}

function getProductPrice(product?: CashTerminalProduct) {
  return product?.priceCop ?? 0
}

export function CashTerminalPage() {
  const { branchId = '', cashSessionId = '', accessToken = '' } = useParams()
  const [data, setData] = useState<CashTerminalData | null>(null)
  const [cart, setCart] = useState<CartLine[]>([])
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>('cash')
  const [paymentReference, setPaymentReference] = useState('')
  const [lastSale, setLastSale] = useState<CashTerminalSaleResult | null>(null)
  const [lastReceipt, setLastReceipt] = useState<LastSaleReceipt | null>(null)
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const products = data?.products ?? emptyProducts
  const cartLines = useMemo(
    () =>
      cart
        .map((line) => {
          const product = products.find((entry) => entry.id === line.productId)
          return {
            ...line,
            product,
            lineTotal: getProductPrice(product) * line.quantity,
          }
        })
        .filter((line) => Boolean(line.product)),
    [cart, products],
  )
  const cartTotal = cartLines.reduce((sum, line) => sum + line.lineTotal, 0)
  const canCharge = Boolean(data) && cartLines.length > 0 && !isSaving
  const branchLinks = useMemo(() => makeBranchLinks(branchId || data?.branch.id || ''), [branchId, data?.branch.id])

  const loadTerminal = useCallback(async () => {
    if (!branchId || !cashSessionId || !accessToken) {
      setStatus('Enlace de caja incompleto.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setStatus('')
    try {
      setData(await fetchCashTerminal(branchId, cashSessionId, accessToken))
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo abrir la caja.')
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, branchId, cashSessionId])

  useEffect(() => {
    void loadTerminal()
  }, [loadTerminal])

  const addProduct = (productId: string) => {
    setLastSale(null)
    setLastReceipt(null)
    setCart((current) => {
      const existing = current.find((line) => line.productId === productId)
      if (existing) {
        return current.map((line) => (line.productId === productId ? { ...line, quantity: line.quantity + 1 } : line))
      }
      return [...current, { productId, quantity: 1 }]
    })
  }

  const updateQuantity = (productId: string, quantity: number) => {
    setLastSale(null)
    setLastReceipt(null)
    setCart((current) =>
      current
        .map((line) => (line.productId === productId ? { ...line, quantity } : line))
        .filter((line) => line.quantity > 0),
    )
  }

  const chargeSale = async () => {
    if (!canCharge || !data) return
    setIsSaving(true)
    setStatus('')

    try {
      const receiptLines = cartLines.map((line) => ({
        id: line.productId,
        productName: line.product?.name ?? 'Producto',
        quantity: line.quantity,
        unitPriceCop: line.product?.priceCop ?? null,
        lineTotalCop: line.lineTotal,
      }))
      const result = await createCashTerminalSale({
        cashSessionId: data.cashSession.id,
        accessToken,
        items: cartLines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
        paymentMethod,
        paymentReference,
      })
      const nextReceipt: LastSaleReceipt = {
        receiptNumber: result.receiptNumber,
        orderId: result.orderId,
        saleId: result.saleId,
        trackingToken: result.trackingToken,
        trackingUrl: branchLinks.trackingUrl(result.trackingToken),
        businessName: data.branch.name,
        branchName: data.branch.name,
        cashSessionName: data.cashSession.name,
        channelLabel: 'Caja',
        fulfillmentLabel: 'Mostrador',
        paymentLabel: paymentMethodLabels[paymentMethod] ?? paymentMethod,
        paymentStatusLabel: result.paymentStatus === 'paid' ? 'Pagado' : 'Pago pendiente',
        issuedAt: new Date().toISOString(),
        customerName: 'Cliente mostrador',
        items: receiptLines,
        totalCop: result.totalCop || cartTotal,
        footer: 'Gracias por tu compra. Recibo interno no fiscal.',
      }
      setLastSale({ ...result, totalCop: result.totalCop || cartTotal })
      setLastReceipt(nextReceipt)
      saveReceiptTrackingFallback(result.trackingToken, {
        receipt: nextReceipt,
        status: 'confirmed',
        fulfillmentMode: 'pickup',
        paymentMethod,
        paymentStatus: result.paymentStatus,
        orderChannel: 'cash_terminal',
        whatsappLink: '',
        createdAt: nextReceipt.issuedAt,
        updatedAt: nextReceipt.issuedAt,
      })
      setCart([])
      setPaymentReference('')
      setStatus('Venta registrada correctamente.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo registrar la venta.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#fff8ed] text-stone-950">
      <Helmet>
        <title>{data ? `${data.cashSession.name} | Caja CartaMago` : 'Caja | CartaMago'}</title>
      </Helmet>

      <header className="border-b border-red-950 bg-stone-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-amber-100 text-red-950">
              <Wallet size={22} />
            </span>
            <div>
              <p className="text-xs font-black uppercase text-amber-100">{data?.branch.name ?? 'Terminal de caja'}</p>
              <h1 className="text-2xl font-black tracking-normal">{data?.cashSession.name ?? 'Caja'}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadTerminal()}
              className="grid size-10 place-items-center rounded-lg border border-white/10 bg-white/10 text-white transition hover:bg-white/15"
              aria-label="Actualizar caja"
            >
              <RefreshCw size={17} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <Link
              to="/admin"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm font-black transition hover:bg-white/15"
            >
              <LockKeyhole size={16} />
              Admin
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        {status ? (
          <p
            className={`rounded-lg border px-4 py-3 text-sm font-bold xl:col-span-2 ${
              status.includes('correctamente') ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {status}
          </p>
        ) : null}

        {isLoading ? (
          <section className="grid min-h-[55vh] place-items-center rounded-lg border border-stone-200 bg-white p-6 shadow-sm xl:col-span-2">
            <p className="flex items-center gap-2 text-sm font-black text-stone-600">
              <RefreshCw size={20} className="animate-spin text-red-900" />
              Cargando caja...
            </p>
          </section>
        ) : !data ? (
          <section className="grid min-h-[55vh] place-items-center rounded-lg border border-stone-200 bg-white p-6 text-center shadow-sm xl:col-span-2">
            <div>
              <p className="text-lg font-black text-stone-950">Esta caja no esta disponible</p>
              <p className="mt-2 text-sm font-bold text-stone-500">Pide al administrador abrirla de nuevo o generar un enlace vigente.</p>
            </div>
          </section>
        ) : (
          <>
            <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
              <div className="mb-4 grid gap-2 rounded-lg border border-emerald-100 bg-emerald-50 p-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-black uppercase text-emerald-700">Estado</p>
                  <p className="mt-1 text-sm font-black text-emerald-950">Abierta</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-emerald-700">Base</p>
                  <p className="mt-1 text-sm font-black text-emerald-950">{formatCurrency(data.cashSession.openingCashCop)}</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-emerald-700">Productos</p>
                  <p className="mt-1 text-sm font-black text-emerald-950">{products.length}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-stone-950">Productos</h2>
                <span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-black text-stone-600">Venta rapida</span>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProduct(product.id)}
                    disabled={product.priceCop == null}
                    className="min-h-[96px] rounded-lg border border-stone-200 bg-white p-3 text-left transition hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
                  >
                    <span className="block text-sm font-black text-stone-950">{product.name}</span>
                    <span className="mt-2 block text-sm font-black text-red-900">
                      {product.priceCop == null ? 'Precio pendiente' : formatCurrency(product.priceCop)}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <aside className="grid h-fit gap-4">
              <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="grid size-10 place-items-center rounded-md bg-red-100 text-red-700">
                    <ShoppingCart size={21} />
                  </span>
                  <div>
                    <h2 className="text-lg font-black text-stone-950">Venta actual</h2>
                    <p className="text-sm font-bold text-stone-500">Carrito de esta caja</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2">
                  {cartLines.length === 0 ? (
                    <p className="rounded-md bg-stone-100 px-3 py-2 text-sm font-bold text-stone-600">
                      Toca productos para iniciar.
                    </p>
                  ) : (
                    cartLines.map((line) => (
                      <div key={line.productId} className="rounded-md border border-stone-200 p-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-black text-stone-950">{line.product?.name}</p>
                            <p className="text-xs font-bold text-stone-500">{formatCurrency(line.lineTotal)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateQuantity(line.productId, 0)}
                            className="grid size-8 place-items-center rounded-md border border-stone-200 text-stone-600 hover:bg-stone-100"
                            aria-label={`Quitar ${line.product?.name ?? 'producto'}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateQuantity(line.productId, line.quantity - 1)}
                            className="grid size-9 place-items-center rounded-md bg-stone-100 text-stone-800 hover:bg-stone-200"
                            aria-label={`Restar ${line.product?.name ?? 'producto'}`}
                          >
                            <Minus size={16} />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={(event) => updateQuantity(line.productId, Number(event.target.value || 0))}
                            className="h-9 w-20 rounded-md border border-stone-300 text-center text-sm font-black text-stone-950 outline-none focus:border-red-500"
                            aria-label={`Cantidad ${line.product?.name ?? 'producto'}`}
                          />
                          <button
                            type="button"
                            onClick={() => updateQuantity(line.productId, line.quantity + 1)}
                            className="grid size-9 place-items-center rounded-md bg-stone-100 text-stone-800 hover:bg-stone-200"
                            aria-label={`Sumar ${line.product?.name ?? 'producto'}`}
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-3 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2">
                  <p className="text-xs font-black uppercase text-emerald-700">Total</p>
                  <p className="mt-1 text-2xl font-black text-emerald-950">{formatCurrency(cartTotal)}</p>
                </div>

                <label className="mt-3 grid gap-1 text-sm font-bold text-stone-700">
                  Metodo de pago
                  <select
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value as SalePaymentMethod)}
                    className="rounded-md border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-950 outline-none focus:border-red-500"
                  >
                    {salePaymentMethods.map((method) => (
                      <option key={method} value={method}>
                        {paymentMethodLabels[method] ?? method}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="mt-3 grid gap-1 text-sm font-bold text-stone-700">
                  Referencia
                  <input
                    value={paymentReference}
                    onChange={(event) => setPaymentReference(event.target.value)}
                    placeholder="Opcional"
                    className="rounded-md border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-950 outline-none focus:border-red-500"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => void chargeSale()}
                  disabled={!canCharge}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-red-900 px-4 py-3 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-stone-400"
                >
                  <CreditCard size={16} />
                  Cobrar venta
                </button>
              </section>

              {lastReceipt ? (
                <section className="grid gap-3">
                  <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black uppercase text-emerald-700">
                    Ultimo comprobante
                  </p>
                  <ReceiptCard receipt={lastReceipt} onPrint={printReceipt} compact />
                  <a
                    href={lastReceipt.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    data-testid="cash-ticket-link"
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-black text-sky-800"
                  >
                    <ExternalLink size={16} aria-hidden="true" />
                    Ver ticket
                  </a>
                </section>
              ) : lastSale ? (
                <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                  <p className="text-xs font-black uppercase text-emerald-700">Ultimo comprobante</p>
                  <p className="mt-2 text-lg font-black text-emerald-950">{lastSale.receiptNumber}</p>
                  <p className="text-sm font-bold text-emerald-800">{formatCurrency(lastSale.totalCop)}</p>
                </section>
              ) : null}
            </aside>
          </>
        )}
      </div>
    </main>
  )
}
