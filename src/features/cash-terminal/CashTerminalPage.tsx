import { useCallback, useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Landmark,
  LockKeyhole,
  Minus,
  Package,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  ShoppingCart,
  Smartphone,
  Trash2,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { Link, useParams } from 'react-router'
import { makeBranchLinks } from '../../lib/branchLinks'
import { formatCurrency } from '../../lib/format'
import { notifyStockChanged } from '../../lib/stockSync'
import { paymentMethodLabels } from '../order/payment'
import type { SalePaymentMethod } from '../admin/operationsTypes'
import { ReceiptCard } from '../receipt/ReceiptCard'
import { printReceipt } from '../receipt/printReceipt'
import { saveReceiptTrackingFallback } from '../receipt/receiptFallbackStorage'
import type { ReceiptData } from '../receipt/receiptTypes'
import {
  createCashTerminalSale,
  fetchCashTerminal,
  type CashTerminalData,
  type CashTerminalProduct,
  type CashTerminalSaleResult,
} from './cashTerminalRepository'

const salePaymentMethods: SalePaymentMethod[] = ['cash', 'card_at_counter', 'bank_transfer', 'wompi']
const emptyProducts: CashTerminalProduct[] = []
const allCategoriesId = 'all'

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

function getCategoryLabel(categoryId: string | null) {
  if (!categoryId) return 'Sin categoria'

  return categoryId
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

function getProductInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

function getPaymentIcon(method: SalePaymentMethod): LucideIcon {
  if (method === 'cash') return Banknote
  if (method === 'bank_transfer') return Landmark
  if (method === 'wompi') return Smartphone
  return CreditCard
}

export function CashTerminalPage() {
  const { branchId = '', cashSessionId = '', accessToken = '' } = useParams()
  const [data, setData] = useState<CashTerminalData | null>(null)
  const [cart, setCart] = useState<CartLine[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState(allCategoriesId)
  const [searchTerm, setSearchTerm] = useState('')
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
  const categoryTabs = useMemo(() => {
    const counts = new Map<string, number>()
    for (const product of products) {
      const categoryId = product.categoryId ?? 'uncategorized'
      counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1)
    }

    return [
      { id: allCategoriesId, label: 'Todos', count: products.length },
      ...Array.from(counts.entries()).map(([id, count]) => ({
        id,
        label: getCategoryLabel(id === 'uncategorized' ? null : id),
        count,
      })),
    ]
  }, [products])
  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return products.filter((product) => {
      const categoryId = product.categoryId ?? 'uncategorized'
      const categoryMatches = selectedCategoryId === allCategoriesId || selectedCategoryId === categoryId
      const queryMatches = !query || product.name.toLowerCase().includes(query)

      return categoryMatches && queryMatches
    })
  }, [products, searchTerm, selectedCategoryId])
  const cartTotal = cartLines.reduce((sum, line) => sum + line.lineTotal, 0)
  const cartItemCount = cartLines.reduce((sum, line) => sum + line.quantity, 0)
  const canCharge = Boolean(data) && cartLines.length > 0 && !isSaving
  const branchLinks = useMemo(() => makeBranchLinks(branchId || data?.branch.id || ''), [branchId, data?.branch.id])
  const selectedCategoryLabel =
    categoryTabs.find((category) => category.id === selectedCategoryId)?.label ?? 'Todos'

  function getCartQuantity(productId: string) {
    return cart.find((line) => line.productId === productId)?.quantity ?? 0
  }

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
      notifyStockChanged({ branchId: data.branch.id, source: 'cash-terminal-sale' })
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
    <main className="min-h-screen bg-[#f7efe3] text-stone-950">
      <Helmet>
        <title>{data ? `${data.cashSession.name} | Caja CartaMago` : 'Caja | CartaMago'}</title>
      </Helmet>

      <header className="border-b border-amber-200/15 bg-[#251711] text-white shadow-xl shadow-red-950/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-amber-300 text-red-950 shadow-lg shadow-amber-950/20">
              <Wallet size={22} />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-amber-100">{data?.branch.name ?? 'Terminal de caja'}</p>
              <h1 className="text-2xl font-black tracking-normal">{data?.cashSession.name ?? 'Caja rapida'}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadTerminal()}
              className="grid size-10 place-items-center rounded-lg border border-white/10 bg-white/10 text-white transition hover:bg-white/15 active:scale-95"
              aria-label="Actualizar caja"
            >
              <RefreshCw size={17} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <Link
              to="/admin"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm font-black transition hover:bg-white/15 active:scale-95"
            >
              <LockKeyhole size={16} />
              Admin
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 xl:grid-cols-[minmax(0,1fr)_410px]">
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
          <section className="grid min-h-[55vh] place-items-center rounded-xl border border-amber-200 bg-white p-6 shadow-xl shadow-amber-900/10 xl:col-span-2">
            <div className="grid justify-items-center gap-3">
              <span className="grid size-14 place-items-center rounded-lg bg-red-900 text-white">
                <RefreshCw size={24} className="animate-spin" />
              </span>
              <p className="text-sm font-black text-stone-600">Cargando caja...</p>
            </div>
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
            <section className="min-w-0 rounded-xl border border-amber-200 bg-white p-3 shadow-xl shadow-amber-900/10 sm:p-4">
              <div className="mb-4 grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Estado</p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-black text-emerald-950">
                    <CheckCircle2 size={16} />
                    Abierta
                  </p>
                </div>
                <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2">
                  <p className="text-xs font-black uppercase tracking-wide text-sky-700">Base</p>
                  <p className="mt-1 text-sm font-black text-sky-950">{formatCurrency(data.cashSession.openingCashCop)}</p>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                  <p className="text-xs font-black uppercase tracking-wide text-red-800">Carrito</p>
                  <p className="mt-1 text-sm font-black text-red-950">{cartItemCount} unidades</p>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="grid size-10 place-items-center rounded-lg bg-red-900 text-white">
                      <Package size={20} />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-xl font-black tracking-normal text-stone-950">Productos</h2>
                      <p className="truncate text-sm font-bold text-stone-500">
                        {selectedCategoryLabel} - {filteredProducts.length} visibles
                      </p>
                    </div>
                  </div>
                </div>
                <label className="relative block min-w-0">
                  <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar producto"
                    className="h-11 w-full rounded-lg border border-stone-200 bg-stone-50 pl-10 pr-3 text-sm font-bold text-stone-950 outline-none transition focus:border-red-800 focus:bg-white focus:ring-2 focus:ring-red-900/10"
                  />
                </label>
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {categoryTabs.map((category) => {
                  const selected = category.id === selectedCategoryId

                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(category.id)}
                      className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-black transition active:scale-95 ${
                        selected
                          ? 'border-red-900 bg-red-900 text-white shadow-lg shadow-red-900/20'
                          : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-amber-300 hover:bg-amber-50'
                      }`}
                    >
                      <span>{category.label}</span>
                      <span className={`rounded-md px-1.5 py-0.5 text-xs ${selected ? 'bg-white/15 text-white' : 'bg-white text-stone-500'}`}>
                        {category.count}
                      </span>
                    </button>
                  )
                })}
              </div>

              {filteredProducts.length === 0 ? (
                <div className="mt-4 rounded-lg border border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-center">
                  <p className="text-sm font-black text-stone-600">No hay productos con ese filtro.</p>
                </div>
              ) : (
                <div className="mt-4 grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {filteredProducts.map((product, index) => {
                    const quantity = getCartQuantity(product.id)
                    const disabled = product.priceCop == null
                    const tone =
                      index % 4 === 0
                        ? 'bg-amber-100 text-amber-950'
                        : index % 4 === 1
                          ? 'bg-red-100 text-red-950'
                          : index % 4 === 2
                            ? 'bg-emerald-100 text-emerald-950'
                            : 'bg-sky-100 text-sky-950'

                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => addProduct(product.id)}
                        disabled={disabled}
                        className={`group relative min-h-[150px] overflow-hidden rounded-lg border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400 ${
                          quantity > 0
                            ? 'border-red-800 bg-red-50 ring-2 ring-red-900/10'
                            : 'border-stone-200 bg-white hover:border-amber-300 hover:bg-amber-50/50'
                        }`}
                      >
                        <span className={`grid size-12 place-items-center rounded-lg text-base font-black ${tone}`}>
                          {getProductInitials(product.name)}
                        </span>
                        {quantity > 0 ? (
                          <span className="absolute right-3 top-3 grid size-8 place-items-center rounded-lg bg-red-900 text-sm font-black text-white shadow-md shadow-red-900/20">
                            {quantity}
                          </span>
                        ) : null}
                        <span className="mt-3 line-clamp-2 block min-h-10 text-sm font-black leading-5 text-stone-950">
                          {product.name}
                        </span>
                        <span className="mt-2 block text-lg font-black text-red-900">
                          {disabled ? 'Precio pendiente' : formatCurrency(product.priceCop ?? 0)}
                        </span>
                        <span className="mt-3 inline-flex min-h-8 items-center gap-1.5 rounded-md bg-stone-950 px-2.5 py-1 text-xs font-black text-white opacity-90 transition group-hover:bg-red-900">
                          <Plus size={14} />
                          Agregar
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>

            <aside className="grid h-fit gap-4 xl:sticky xl:top-4">
              <section className="overflow-hidden rounded-xl border border-red-900 bg-white shadow-2xl shadow-red-950/15">
                <div className="bg-red-900 px-4 py-3 text-white">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="grid size-10 place-items-center rounded-lg bg-white/10 text-white">
                        <ShoppingCart size={21} />
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-lg font-black tracking-normal">Venta actual</h2>
                        <p className="text-xs font-bold text-red-100">{cartItemCount} unidades en caja</p>
                      </div>
                    </div>
                    <span className="grid size-10 place-items-center rounded-lg bg-amber-300 text-red-950">
                      <ReceiptText size={20} />
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 flex-1 rounded-full bg-red-900" />
                    <span className="h-1.5 w-10 rounded-full bg-amber-300" />
                    <span className="h-1.5 w-6 rounded-full bg-emerald-500" />
                  </div>

                  <div className="mt-4 grid max-h-[42vh] gap-2 overflow-y-auto pr-1">
                    {cartLines.length === 0 ? (
                      <div className="grid min-h-36 place-items-center rounded-lg border border-dashed border-stone-300 bg-stone-50 px-4 text-center">
                        <div>
                          <p className="text-sm font-black text-stone-700">Toca productos para iniciar.</p>
                          <p className="mt-1 text-xs font-bold text-stone-500">El total y el cobro aparecen aqui.</p>
                        </div>
                      </div>
                    ) : (
                      cartLines.map((line) => (
                        <div key={line.productId} className="rounded-lg border border-stone-200 bg-stone-50 p-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-black text-stone-950">{line.product?.name}</p>
                              <p className="text-xs font-bold text-stone-500">
                                {line.quantity} x {formatCurrency(line.product?.priceCop ?? 0)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => updateQuantity(line.productId, 0)}
                              className="grid size-8 shrink-0 place-items-center rounded-md border border-stone-200 bg-white text-stone-600 hover:bg-stone-100 active:scale-95"
                              aria-label={`Quitar ${line.product?.name ?? 'producto'}`}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="text-sm font-black text-red-900">{formatCurrency(line.lineTotal)}</span>
                            <span className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => updateQuantity(line.productId, line.quantity - 1)}
                                className="grid size-9 place-items-center rounded-md bg-white text-stone-800 shadow-sm hover:bg-stone-200 active:scale-95"
                                aria-label={`Restar ${line.product?.name ?? 'producto'}`}
                              >
                                <Minus size={16} />
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={line.quantity}
                                onChange={(event) => updateQuantity(line.productId, Number(event.target.value || 0))}
                                className="h-9 w-16 rounded-md border border-stone-300 bg-white text-center text-sm font-black text-stone-950 outline-none focus:border-red-500"
                                aria-label={`Cantidad ${line.product?.name ?? 'producto'}`}
                              />
                              <button
                                type="button"
                                onClick={() => updateQuantity(line.productId, line.quantity + 1)}
                                className="grid size-9 place-items-center rounded-md bg-red-900 text-white shadow-sm hover:bg-red-800 active:scale-95"
                                aria-label={`Sumar ${line.product?.name ?? 'producto'}`}
                              >
                                <Plus size={16} />
                              </button>
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3">
                    <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Total a cobrar</p>
                    <p className="mt-1 text-3xl font-black tracking-normal text-emerald-950">{formatCurrency(cartTotal)}</p>
                  </div>

                  <div className="mt-3 grid gap-2">
                    <p className="text-sm font-black text-stone-700">Metodo de pago</p>
                    <div className="grid grid-cols-2 gap-2">
                      {salePaymentMethods.map((method) => {
                        const PaymentIcon = getPaymentIcon(method)
                        const selected = paymentMethod === method

                        return (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setPaymentMethod(method)}
                            aria-pressed={selected}
                            className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-black transition active:scale-95 ${
                              selected
                                ? 'border-red-900 bg-red-50 text-red-950 ring-2 ring-red-900/10'
                                : 'border-stone-200 bg-white text-stone-700 hover:border-amber-300 hover:bg-amber-50'
                            }`}
                          >
                            <PaymentIcon size={16} className="shrink-0" />
                            <span className="min-w-0 truncate">{paymentMethodLabels[method] ?? method}</span>
                          </button>
                        )
                      })}
                    </div>
                    <select
                      value={paymentMethod}
                      onChange={(event) => setPaymentMethod(event.target.value as SalePaymentMethod)}
                      className="sr-only"
                      aria-label="Metodo de pago"
                    >
                      {salePaymentMethods.map((method) => (
                        <option key={method} value={method}>
                          {paymentMethodLabels[method] ?? method}
                        </option>
                      ))}
                    </select>
                  </div>

                  <label className="mt-3 grid gap-1 text-sm font-bold text-stone-700">
                    Referencia
                    <input
                      value={paymentReference}
                      onChange={(event) => setPaymentReference(event.target.value)}
                      placeholder="Opcional"
                      className="h-11 rounded-lg border border-stone-300 bg-white px-3 text-base font-semibold text-stone-950 outline-none focus:border-red-500"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => void chargeSale()}
                    disabled={!canCharge}
                    className="mt-3 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-lg bg-red-900 px-4 py-3 text-base font-black text-white shadow-lg shadow-red-900/20 transition hover:bg-red-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-stone-400 disabled:shadow-none"
                  >
                    <CreditCard size={16} />
                    {isSaving ? 'Cobrando...' : 'Cobrar venta'}
                  </button>
                </div>
              </section>

              {lastReceipt ? (
                <section className="grid gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 shadow-lg shadow-emerald-900/10">
                  <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-emerald-700">
                    <CheckCircle2 size={15} />
                    Ultimo comprobante
                  </p>
                  <ReceiptCard receipt={lastReceipt} onPrint={printReceipt} compact />
                  <a
                    href={lastReceipt.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    data-testid="cash-ticket-link"
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-black text-sky-800 transition hover:bg-sky-50"
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
