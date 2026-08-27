import { useEffect, useState } from 'react'
import {
  Copy,
  ExternalLink,
  Link as LinkIcon,
  LockKeyhole,
  ReceiptText,
  RefreshCw,
  Wallet,
} from 'lucide-react'
import { makeBranchLinks } from '../../../lib/branchLinks'
import { formatCurrency } from '../../../lib/format'
import { paymentMethodLabels } from '../../order/payment'
import { useAdminOperations } from '../hooks/useAdminOperations'

export function CashPanel() {
  const operations = useAdminOperations()
  const data = operations.data
  const [branchId, setBranchId] = useState('')
  const [selectedCashSessionId, setSelectedCashSessionId] = useState('')
  const [cashSessionName, setCashSessionName] = useState('Caja principal')
  const [openingAmount, setOpeningAmount] = useState('')
  const [closingAmount, setClosingAmount] = useState('')
  const [openNotes, setOpenNotes] = useState('')
  const [closeNotes, setCloseNotes] = useState('')
  const [copiedTerminalLink, setCopiedTerminalLink] = useState(false)

  const branches = data?.branches ?? []
  const sales = data?.sales ?? []
  const cashSessions = data?.cashSessions ?? []
  const profile = data?.profile

  const lockedBranchId = profile?.canManageWarehouse ? null : profile?.primaryBranchId
  const openCashSessions = cashSessions.filter((session) => session.status === 'open')
  const branchOpenCashSessions = openCashSessions.filter((session) => session.branchId === branchId)
  const selectedCashSession =
    branchOpenCashSessions.find((session) => session.id === selectedCashSessionId) ?? branchOpenCashSessions[0] ?? null
  const selectedTerminalUrl =
    selectedCashSession?.accessToken && branchId
      ? makeBranchLinks(branchId).cashTerminalUrl(selectedCashSession.id, selectedCashSession.accessToken)
      : ''
  const branchSales = sales.filter((sale) => !branchId || sale.branchId === branchId)
  const selectedCashSalesTotal = selectedCashSession
    ? sales
        .filter(
          (sale) =>
            sale.cashSessionId === selectedCashSession.id &&
            sale.paymentMethod === 'cash' &&
            sale.paymentStatus === 'paid',
        )
        .reduce((sum, sale) => sum + sale.totalCop, 0)
    : 0
  const expectedCashCop = selectedCashSession ? selectedCashSession.openingCashCop + selectedCashSalesTotal : 0
  const branchSalesTotal = branchSales.reduce((sum, sale) => sum + sale.totalCop, 0)
  const canOperateBranch = Boolean(profile?.primaryBranchId || profile?.role === 'superadmin')
  const canOpenCashSession = canOperateBranch && Boolean(branchId)
  const canCloseCashSession =
    canOperateBranch && Boolean(selectedCashSession) && closingAmount.trim() !== '' && Number(closingAmount) >= 0

  useEffect(() => {
    if (!data) return
    const nextBranchId = lockedBranchId ?? data.branches[0]?.id ?? ''
    if (nextBranchId && branchId !== nextBranchId) setBranchId(nextBranchId)
  }, [branchId, data, lockedBranchId])

  useEffect(() => {
    if (branchOpenCashSessions.length === 0) {
      if (selectedCashSessionId) setSelectedCashSessionId('')
      return
    }

    if (!branchOpenCashSessions.some((session) => session.id === selectedCashSessionId)) {
      setSelectedCashSessionId(branchOpenCashSessions[0].id)
    }
  }, [branchOpenCashSessions, selectedCashSessionId])

  const getBranchName = (value: string) => branches.find((branch) => branch.id === value)?.name ?? value
  const getCashSessionName = (cashSessionId: string | null) => {
    if (!cashSessionId) return 'Sin caja asociada'
    return cashSessions.find((session) => session.id === cashSessionId)?.name ?? `Caja ${cashSessionId.slice(0, 8)}`
  }
  const getSessionTerminalUrl = (cashSessionId: string, accessToken: string | null) =>
    accessToken && branchId ? makeBranchLinks(branchId).cashTerminalUrl(cashSessionId, accessToken) : ''

  const handleOpenCashSession = async () => {
    if (!canOpenCashSession) return
    const sessionId = await operations.openCashSession({
      branchId,
      name: cashSessionName,
      openingCashCop: Number(openingAmount || 0),
      notes: openNotes,
    })
    if (typeof sessionId === 'string') setSelectedCashSessionId(sessionId)
    setCashSessionName('Caja principal')
    setOpeningAmount('')
    setOpenNotes('')
  }

  const handleCloseCashSession = () => {
    if (!canCloseCashSession || !selectedCashSession) return
    void operations.closeCashSession({
      cashSessionId: selectedCashSession.id,
      closingCashCop: Number(closingAmount || 0),
      notes: closeNotes,
    })
    setClosingAmount('')
    setCloseNotes('')
  }

  const copyTerminalLink = async () => {
    if (!selectedTerminalUrl) return
    try {
      await navigator.clipboard.writeText(selectedTerminalUrl)
      setCopiedTerminalLink(true)
      window.setTimeout(() => setCopiedTerminalLink(false), 1800)
    } catch {
      setCopiedTerminalLink(false)
    }
  }

  if (operations.isLoading) {
    return (
      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-bold text-stone-500">Cargando caja...</p>
      </section>
    )
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-md bg-emerald-100 text-emerald-700">
              <Wallet size={22} />
            </span>
            <div>
              <h2 className="text-lg font-black text-stone-950">Caja</h2>
              <p className="text-sm font-bold text-stone-500">Abre cajas, comparte terminales y supervisa ventas</p>
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

        <div className="mt-4 grid gap-3 rounded-lg border border-stone-200 p-3">
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,0.7fr)_minmax(0,1fr)]">
            <label className="grid gap-1 text-sm font-bold text-stone-700">
              Sede
              <select
                value={branchId}
                onChange={(event) => {
                  setBranchId(event.target.value)
                  setSelectedCashSessionId('')
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
              Caja activa
              <select
                value={selectedCashSession?.id ?? ''}
                onChange={(event) => setSelectedCashSessionId(event.target.value)}
                disabled={branchOpenCashSessions.length === 0}
                className="rounded-md border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-950 outline-none focus:border-red-500 disabled:bg-stone-100 disabled:text-stone-500"
              >
                {branchOpenCashSessions.length === 0 ? <option value="">Sin caja abierta</option> : null}
                {branchOpenCashSessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.name} - base {formatCurrency(session.openingCashCop)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedCashSession ? (
            <div className="grid gap-3 rounded-md bg-emerald-50 p-3 text-xs">
              <div className="grid gap-2 md:grid-cols-3">
                <div>
                  <p className="font-black uppercase text-emerald-700">Caja abierta</p>
                  <p className="mt-1 text-sm font-black text-emerald-950">{selectedCashSession.name}</p>
                </div>
                <div>
                  <p className="font-black uppercase text-emerald-700">Base</p>
                  <p className="mt-1 text-sm font-black text-emerald-950">
                    {formatCurrency(selectedCashSession.openingCashCop)}
                  </p>
                </div>
                <div>
                  <p className="font-black uppercase text-emerald-700">Efectivo esperado</p>
                  <p className="mt-1 text-sm font-black text-emerald-950">{formatCurrency(expectedCashCop)}</p>
                </div>
              </div>
              {selectedTerminalUrl ? (
                <div className="grid gap-2 rounded-md border border-emerald-200 bg-white p-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-xs font-black uppercase text-emerald-700">
                      <LinkIcon size={13} />
                      Terminal de caja
                    </p>
                    <p className="mt-1 truncate text-sm font-bold text-stone-600">{selectedTerminalUrl}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void copyTerminalLink()}
                      className="inline-flex min-h-10 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-black text-stone-800 transition-colors hover:bg-stone-100"
                    >
                      <Copy size={16} />
                      {copiedTerminalLink ? 'Copiado' : 'Copiar'}
                    </button>
                    <a
                      href={selectedTerminalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-10 items-center gap-2 rounded-md bg-stone-950 px-3 py-2 text-sm font-black text-white transition-colors hover:bg-stone-800"
                    >
                      <ExternalLink size={16} />
                      Abrir
                    </a>
                  </div>
                </div>
              ) : (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">
                  Esta caja aun no tiene token operativo. Actualiza la migracion local y vuelve a abrir la caja.
                </p>
              )}
            </div>
          ) : (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">
              Abre una caja para generar su terminal operativo.
            </p>
          )}
        </div>

        <section className="mt-4 grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-black text-stone-950">Cajas abiertas</h3>
            <span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-black text-stone-600">
              {branchOpenCashSessions.length} en esta sede
            </span>
          </div>

          {branchOpenCashSessions.length === 0 ? (
            <p className="rounded-md border border-dashed border-stone-300 bg-stone-50 px-3 py-6 text-center text-sm font-bold text-stone-500">
              No hay cajas abiertas para esta sede.
            </p>
          ) : (
            <div className="grid gap-2 lg:grid-cols-2">
              {branchOpenCashSessions.map((session) => {
                const terminalUrl = getSessionTerminalUrl(session.id, session.accessToken)
                const cashSales = sales
                  .filter(
                    (sale) =>
                      sale.cashSessionId === session.id &&
                      sale.paymentMethod === 'cash' &&
                      sale.paymentStatus === 'paid',
                  )
                  .reduce((sum, sale) => sum + sale.totalCop, 0)

                return (
                  <article
                    key={session.id}
                    className={`rounded-lg border p-3 ${
                      selectedCashSession?.id === session.id ? 'border-emerald-300 bg-emerald-50' : 'border-stone-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-stone-950">{session.name}</p>
                        <p className="mt-1 text-xs font-bold text-stone-500">
                          Base {formatCurrency(session.openingCashCop)} - Esperado{' '}
                          {formatCurrency(session.openingCashCop + cashSales)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedCashSessionId(session.id)}
                        className="rounded-md border border-stone-300 bg-white px-3 py-2 text-xs font-black text-stone-800 transition hover:bg-stone-100"
                      >
                        Seleccionar
                      </button>
                    </div>
                    {terminalUrl ? (
                      <a
                        href={terminalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-stone-950 px-3 py-2 text-sm font-black text-white transition hover:bg-stone-800"
                      >
                        <ExternalLink size={16} />
                        Abrir terminal
                      </a>
                    ) : (
                      <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                        Token operativo pendiente.
                      </p>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </section>

      <aside className="grid h-fit gap-4">
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-md bg-sky-100 text-sky-700">
              <Wallet size={22} />
            </span>
            <div>
              <h2 className="text-lg font-black text-stone-950">Apertura y cierre</h2>
              <p className="text-sm font-bold text-stone-500">Una sede puede manejar varias cajas</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm font-bold text-stone-700">
              Nombre de caja
              <input
                value={cashSessionName}
                onChange={(event) => setCashSessionName(event.target.value)}
                placeholder="Caja principal"
                className="rounded-md border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-950 outline-none focus:border-red-500"
              />
            </label>
            <label className="grid gap-1 text-sm font-bold text-stone-700">
              Base inicial
              <input
                type="number"
                min="0"
                value={openingAmount}
                onChange={(event) => setOpeningAmount(event.target.value)}
                placeholder="0"
                className="rounded-md border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-950 outline-none focus:border-red-500"
              />
            </label>
            <label className="grid gap-1 text-sm font-bold text-stone-700">
              Nota de apertura
              <input
                value={openNotes}
                onChange={(event) => setOpenNotes(event.target.value)}
                placeholder="Opcional"
                className="rounded-md border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-950 outline-none focus:border-red-500"
              />
            </label>
            <button
              type="button"
              onClick={() => void handleOpenCashSession()}
              disabled={!canOpenCashSession || operations.isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              <Wallet size={16} />
              Abrir caja
            </button>
          </div>

          {selectedCashSession ? (
            <div className="mt-5 grid gap-3 border-t border-stone-200 pt-4">
              <p className="text-sm font-black text-stone-950">Cerrar {selectedCashSession.name}</p>
              <label className="grid gap-1 text-sm font-bold text-stone-700">
                Conteo real
                <input
                  type="number"
                  min="0"
                  value={closingAmount}
                  onChange={(event) => setClosingAmount(event.target.value)}
                  placeholder={String(expectedCashCop)}
                  className="rounded-md border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-950 outline-none focus:border-red-500"
                />
              </label>
              <label className="grid gap-1 text-sm font-bold text-stone-700">
                Nota de cierre
                <input
                  value={closeNotes}
                  onChange={(event) => setCloseNotes(event.target.value)}
                  placeholder="Opcional"
                  className="rounded-md border border-stone-300 bg-white px-3 py-2 text-base font-semibold text-stone-950 outline-none focus:border-red-500"
                />
              </label>
              <button
                type="button"
                onClick={handleCloseCashSession}
                disabled={!canCloseCashSession || operations.isSaving}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-stone-900 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-400"
              >
                <LockKeyhole size={16} />
                Cerrar caja
              </button>
            </div>
          ) : null}
        </section>

        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-stone-500">
            <Wallet size={14} />
            Resumen
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md bg-stone-50 p-3">
              <p className="font-bold text-stone-500">Cajas abiertas</p>
              <p className="text-base font-black text-stone-950">{openCashSessions.length}</p>
            </div>
            <div className="rounded-md bg-stone-50 p-3">
              <p className="font-bold text-stone-500">Ventas sede</p>
              <p className="text-base font-black text-stone-950">{formatCurrency(branchSalesTotal)}</p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-md bg-emerald-100 text-emerald-700">
              <ReceiptText size={22} />
            </span>
            <div>
              <h2 className="text-lg font-black text-stone-950">Ventas recientes</h2>
              <p className="text-sm font-bold text-stone-500">Comprobantes internos y pago</p>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {branchSales.length === 0 ? (
              <p className="rounded-md bg-stone-100 px-3 py-2 text-sm font-bold text-stone-600">
                Aun no hay ventas registradas.
              </p>
            ) : (
              branchSales.slice(0, 8).map((sale) => (
                <div key={sale.id} className="rounded-md border border-stone-200 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-stone-950">{sale.receiptNumber}</p>
                    <p className="text-sm font-black text-stone-950">{formatCurrency(sale.totalCop)}</p>
                  </div>
                  <p className="mt-1 text-xs font-bold text-stone-500">
                    {getBranchName(sale.branchId)} - {sale.itemNames.join(', ') || 'Venta registrada'}
                  </p>
                  <p className="text-xs font-black text-stone-600">Caja: {getCashSessionName(sale.cashSessionId)}</p>
                  <p className="text-xs font-bold text-stone-500">
                    {paymentMethodLabels[sale.paymentMethod] ?? sale.paymentMethod} -{' '}
                    {sale.paymentStatus === 'paid' ? 'Pagado' : 'Pendiente'}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </aside>

      {operations.status ? (
        <p
          className={`rounded-lg border px-4 py-3 text-sm font-bold xl:col-span-2 ${
            operations.status.includes('correctamente') ||
            operations.status.includes('despachada') ||
            operations.status.includes('recibido') ||
            operations.status.includes('descontado') ||
            operations.status.includes('abierta') ||
            operations.status.includes('cerrada')
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
