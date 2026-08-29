import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common'
import { SupabaseRpcService } from '../supabase/supabase-rpc.service.js'
import { CashTransactionService } from './cash-transaction.service.js'
import {
  SALE_PAYMENT_METHODS,
  type CashSaleResult,
  type CreateAdminSaleInput,
  type CreateCashSessionSaleInput,
  type SaleCartItemInput,
  type SalePaymentMethod,
} from './cash.types.js'

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function parseText(value: unknown, field: string) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new BadRequestException(`${field} is required.`)
  }

  return value.trim()
}

function parseOptionalText(value: unknown) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : ''
}

function parsePaymentMethod(value: unknown): SalePaymentMethod {
  if (typeof value === 'string' && SALE_PAYMENT_METHODS.includes(value as SalePaymentMethod)) {
    return value as SalePaymentMethod
  }

  throw new BadRequestException('Unsupported payment method.')
}

function parseItems(value: unknown): SaleCartItemInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new BadRequestException('Add at least one product to the sale.')
  }

  return value.map((entry) => {
    const item = asRecord(entry)
    const productId = parseText(item.productId, 'productId')
    const quantity = Number(item.quantity)

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestException('Sale item quantity must be a positive integer.')
    }

    return { productId, quantity }
  })
}

function mapSaleResult(value: unknown): CashSaleResult {
  const row = asRecord(value)

  return {
    saleId: String(row.saleId ?? ''),
    orderId: String(row.orderId ?? ''),
    receiptNumber: String(row.receiptNumber ?? ''),
    trackingToken: String(row.trackingToken ?? ''),
    totalCop: Number(row.totalCop ?? 0),
    paymentStatus: String(row.paymentStatus ?? 'paid'),
    cashSessionId: row.cashSessionId == null ? null : String(row.cashSessionId),
  }
}

@Injectable()
export class CashService {
  constructor(
    private readonly rpc: SupabaseRpcService,
    private readonly transactions: CashTransactionService,
  ) {}

  parseAdminSaleInput(value: unknown): CreateAdminSaleInput {
    const body = asRecord(value)

    return {
      branchId: parseText(body.branchId, 'branchId'),
      items: parseItems(body.items),
      paymentMethod: parsePaymentMethod(body.paymentMethod),
      paymentReference: parseOptionalText(body.paymentReference),
      cashSessionId: body.cashSessionId == null ? null : parseOptionalText(body.cashSessionId),
    }
  }

  parseCashSessionSaleInput(value: unknown): CreateCashSessionSaleInput {
    const body = asRecord(value)

    return {
      cashSessionId: parseText(body.cashSessionId, 'cashSessionId'),
      accessToken: parseText(body.accessToken, 'accessToken'),
      items: parseItems(body.items),
      paymentMethod: parsePaymentMethod(body.paymentMethod),
      paymentReference: parseOptionalText(body.paymentReference),
    }
  }

  async createAdminSale(input: CreateAdminSaleInput, authorization?: string): Promise<CashSaleResult> {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Admin sale requires a Supabase bearer token.')
    }

    return mapSaleResult(await this.rpc.call('create_sale', {
      p_branch_id: input.branchId,
      p_items: input.items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
      p_payment_method: input.paymentMethod,
      p_payment_reference: input.paymentReference,
      p_cash_session_id: input.cashSessionId ?? null,
    }, authorization))
  }

  async createCashSessionSale(input: CreateCashSessionSaleInput): Promise<CashSaleResult> {
    return this.transactions.createCashSessionSale(input)
  }
}
