import { isE2EAdminMockEnabled } from '../../lib/runtimeFlags'
import { postApiJson, shouldFallbackToSupabase } from '../../services/apiClient'
import { getSeedMenuData, getSupabaseClient } from '../../services/menuRepository'
import type { SalePaymentMethod } from '../admin/operationsTypes'

export type CashTerminalProduct = {
  id: string
  branchId: string
  categoryId: string | null
  name: string
  priceCop: number | null
}

export type CashTerminalSession = {
  id: string
  branchId: string
  name: string
  openingCashCop: number
  openedAt: string
}

export type CashTerminalBranch = {
  id: string
  name: string
}

export type CashTerminalData = {
  cashSession: CashTerminalSession
  branch: CashTerminalBranch
  products: CashTerminalProduct[]
}

export type CashTerminalSaleResult = {
  saleId: string
  orderId: string
  receiptNumber: string
  trackingToken: string
  totalCop: number
  paymentStatus: string
  cashSessionId: string
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function mapProduct(value: unknown): CashTerminalProduct {
  const row = asRecord(value)

  return {
    id: String(row.id),
    branchId: String(row.branchId ?? row.branch_id ?? ''),
    categoryId: typeof row.categoryId === 'string' ? row.categoryId : typeof row.category_id === 'string' ? row.category_id : null,
    name: String(row.name ?? 'Producto'),
    priceCop: row.priceCop == null && row.price_cop == null ? null : Number(row.priceCop ?? row.price_cop),
  }
}

function mapTerminalData(value: unknown): CashTerminalData {
  const row = asRecord(value)
  const session = asRecord(row.cashSession)
  const branch = asRecord(row.branch)
  const products = Array.isArray(row.products) ? row.products : []

  return {
    cashSession: {
      id: String(session.id),
      branchId: String(session.branchId ?? ''),
      name: String(session.name ?? 'Caja'),
      openingCashCop: Number(session.openingCashCop ?? 0),
      openedAt: String(session.openedAt ?? new Date().toISOString()),
    },
    branch: {
      id: String(branch.id ?? ''),
      name: String(branch.name ?? 'Sede'),
    },
    products: products.map(mapProduct),
  }
}

function mapSaleResult(value: unknown): CashTerminalSaleResult {
  const row = asRecord(value)

  return {
    saleId: String(row.saleId ?? ''),
    orderId: String(row.orderId ?? ''),
    receiptNumber: String(row.receiptNumber ?? ''),
    trackingToken: String(row.trackingToken ?? ''),
    totalCop: Number(row.totalCop ?? 0),
    paymentStatus: String(row.paymentStatus ?? 'paid'),
    cashSessionId: String(row.cashSessionId ?? ''),
  }
}

export async function fetchCashTerminal(
  branchId: string,
  cashSessionId: string,
  accessToken: string,
): Promise<CashTerminalData> {
  if (isE2EAdminMockEnabled()) {
    const menu = getSeedMenuData(branchId)
    return {
      cashSession: {
        id: cashSessionId,
        branchId: menu.branchId,
        name: cashSessionId === 'cash_demo_001' ? 'Caja principal' : 'Caja operativa',
        openingCashCop: 100000,
        openedAt: new Date().toISOString(),
      },
      branch: {
        id: menu.branchId,
        name: menu.restaurant.shortName ?? menu.restaurant.name,
      },
      products: menu.menuItems.map((product) => ({
        id: product.id,
        branchId: menu.branchId,
        categoryId: product.categoryId,
        name: product.name,
        priceCop: product.price,
      })),
    }
  }

  const { data, error } = await getSupabaseClient().rpc('get_cash_session_terminal', {
    p_cash_session_id: cashSessionId,
    p_access_token: accessToken,
  })

  if (error) throw new Error(error.message)
  return mapTerminalData(data)
}

export async function createCashTerminalSale(input: {
  cashSessionId: string
  accessToken: string
  items: Array<{ productId: string; quantity: number }>
  paymentMethod: SalePaymentMethod
  paymentReference: string
}): Promise<CashTerminalSaleResult> {
  if (isE2EAdminMockEnabled()) {
    return {
      saleId: `sale_${Date.now()}`,
      orderId: `ord_${Date.now()}`,
      receiptNumber: `MOCK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      trackingToken: `tk_mock_${Date.now()}`,
      totalCop: 0,
      paymentStatus: input.paymentMethod === 'wompi' ? 'pending' : 'paid',
      cashSessionId: input.cashSessionId,
    }
  }

  try {
    return await postApiJson<CashTerminalSaleResult>('cash/session-sales', {
      cashSessionId: input.cashSessionId,
      accessToken: input.accessToken,
      items: input.items,
      paymentMethod: input.paymentMethod,
      paymentReference: input.paymentReference,
    })
  } catch (error) {
    if (!shouldFallbackToSupabase(error)) throw error
  }

  const { data, error } = await getSupabaseClient().rpc('create_cash_session_sale', {
    p_cash_session_id: input.cashSessionId,
    p_access_token: input.accessToken,
    p_items: input.items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
    p_payment_method: input.paymentMethod,
    p_payment_reference: input.paymentReference,
  })

  if (error) throw new Error(error.message)
  return mapSaleResult(data)
}
