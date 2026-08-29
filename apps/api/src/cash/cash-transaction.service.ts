import { randomUUID } from 'node:crypto'
import { BadRequestException, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common'
import type { Pool as PgPool, PoolClient } from 'pg'
import { POSTGRES_POOL } from '../database/database.module.js'
import type { CashSaleResult, CreateCashSessionSaleInput, SaleCartItemInput, SalePaymentMethod } from './cash.types.js'

type SaleLine = {
  productId: string
  productName: string
  quantity: number
  unitPriceCop: number
  lineTotalCop: number
  sortOrder: number
}

type PaymentState = {
  provider: 'manual' | 'wompi' | 'didi_food'
  status: 'pending' | 'paid'
}

function makeTextId(prefix: string) {
  return `${prefix}_${randomUUID().replace(/-/g, '')}`
}

function getPaymentState(paymentMethod: SalePaymentMethod): PaymentState {
  if (paymentMethod === 'wompi') return { provider: 'wompi', status: 'pending' }
  if (paymentMethod === 'didi_food') return { provider: 'didi_food', status: 'paid' }
  return { provider: 'manual', status: 'paid' }
}

@Injectable()
export class CashTransactionService {
  constructor(@Inject(POSTGRES_POOL) private readonly pool: PgPool | null) {}

  async createCashSessionSale(input: CreateCashSessionSaleInput): Promise<CashSaleResult> {
    if (!this.pool) {
      throw new ServiceUnavailableException('Postgres is not configured for Nest-owned cash transactions.')
    }

    const client = await this.pool.connect()

    try {
      await client.query('begin')

      const session = await client.query<{ id: string; branch_id: string }>(
        `
          select id, branch_id
          from public.cash_sessions
          where id = $1
            and access_token = $2
            and status = 'open'
            and token_revoked_at is null
          for update
        `,
        [input.cashSessionId, input.accessToken],
      )

      if (session.rowCount !== 1) {
        throw new BadRequestException('Caja no encontrada o enlace revocado.')
      }

      const result = await this.createSale(client, {
        branchId: session.rows[0].branch_id,
        cashSessionId: session.rows[0].id,
        createdBy: `cash_terminal:${session.rows[0].id}`,
        source: 'cash_terminal',
        customerName: 'Caja',
        items: input.items,
        paymentMethod: input.paymentMethod,
        paymentReference: input.paymentReference,
      })

      await client.query('commit')
      return result
    } catch (error) {
      await client.query('rollback').catch(() => undefined)
      throw error
    } finally {
      client.release()
    }
  }

  private async createSale(
    client: PoolClient,
    input: {
      branchId: string
      cashSessionId: string
      createdBy: string
      source: 'cash_terminal'
      customerName: string
      items: SaleCartItemInput[]
      paymentMethod: SalePaymentMethod
      paymentReference: string
    },
  ): Promise<CashSaleResult> {
    const payment = getPaymentState(input.paymentMethod)
    const saleId = randomUUID()
    const paymentId = randomUUID()
    const receiptId = randomUUID()
    const orderId = makeTextId('ord')
    const trackingToken = makeTextId('tk')
    const lines = await this.resolveSaleLines(client, input.branchId, input.items, input.createdBy)
    const totalCop = lines.reduce((sum, line) => sum + line.lineTotalCop, 0)
    const totalItems = lines.reduce((sum, line) => sum + line.quantity, 0)
    const receiptNumber = await this.nextReceiptNumber(client, input.branchId)
    const externalPayload = {
      saleId,
      cashSessionId: input.cashSessionId,
      receiptNumber,
      source: input.source,
    }
    const receiptItems = lines.map((line) => ({
      productId: line.productId,
      productName: line.productName,
      quantity: line.quantity,
      unitPriceCop: line.unitPriceCop,
      lineTotalCop: line.lineTotalCop,
    }))
    const receiptPayload = {
      type: 'internal_receipt',
      dian: false,
      branchId: input.branchId,
      saleId,
      orderId,
      receiptNumber,
      totalCop,
      paymentMethod: input.paymentMethod,
      paymentStatus: payment.status,
      items: receiptItems,
    }
    const paymentReference = input.paymentReference.trim()

    await client.query(
      `
        insert into public.orders (
          id, branch_id, tracking_token, status, order_channel, delivery_provider,
          payment_status, payment_method, payment_provider, external_provider,
          external_order_id, external_status, external_payload, customer_name,
          customer_note, fulfillment_mode, delivery_address, table_number,
          total_items, total_cop, whatsapp_message, whatsapp_link
        ) values (
          $1, $2, $3, 'confirmed', $4, 'none',
          $5, $6, $7, $8,
          $9, 'created_from_sale', $10::jsonb, $11,
          $12, 'pickup', '', '',
          $13, $14, '', ''
        )
      `,
      [
        orderId,
        input.branchId,
        trackingToken,
        input.source,
        payment.status,
        input.paymentMethod,
        payment.provider,
        input.source,
        receiptNumber,
        JSON.stringify(externalPayload),
        input.customerName,
        paymentReference || 'Pedido generado desde caja',
        totalItems,
        totalCop,
      ],
    )

    for (const line of lines) {
      await client.query(
        `
          insert into public.order_items (
            id, order_id, product_id, product_name, quantity, unit_price_cop, line_note, sort_order
          ) values ($1, $2, $3, $4, $5, $6, '', $7)
        `,
        [randomUUID(), orderId, line.productId, line.productName, line.quantity, line.unitPriceCop, line.sortOrder],
      )
    }

    await client.query(
      `
        insert into public.sales (
          id, branch_id, cash_session_id, order_id, cashier_user_id, source, payment_status,
          subtotal_cop, total_cop, receipt_number, created_by
        ) values ($1, $2, $3, $4, null, $5, $6, $7, $7, $8, $9)
      `,
      [saleId, input.branchId, input.cashSessionId, orderId, input.source, payment.status, totalCop, receiptNumber, input.createdBy],
    )

    for (const line of lines) {
      await client.query(
        `
          insert into public.sale_items (
            id, sale_id, product_id, product_name, quantity, unit_price_cop, line_total_cop, sort_order
          ) values ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [randomUUID(), saleId, line.productId, line.productName, line.quantity, line.unitPriceCop, line.lineTotalCop, line.sortOrder],
      )
    }

    await client.query(
      `
        insert into public.sale_payments (
          id, sale_id, payment_method, payment_provider, payment_status, amount_cop, reference, paid_at
        ) values ($1, $2, $3, $4, $5, $6, nullif($7, ''), case when $5 = 'paid' then now() else null end)
      `,
      [paymentId, saleId, input.paymentMethod, payment.provider, payment.status, totalCop, paymentReference],
    )

    await client.query(
      `
        insert into public.sale_receipts (
          id, sale_id, branch_id, receipt_number, total_cop, payload
        ) values ($1, $2, $3, $4, $5, $6::jsonb)
      `,
      [receiptId, saleId, input.branchId, receiptNumber, totalCop, JSON.stringify(receiptPayload)],
    )

    return {
      saleId,
      orderId,
      receiptNumber,
      trackingToken,
      totalCop,
      paymentStatus: payment.status,
      cashSessionId: input.cashSessionId,
    }
  }

  private async resolveSaleLines(
    client: PoolClient,
    branchId: string,
    items: SaleCartItemInput[],
    createdBy: string,
  ): Promise<SaleLine[]> {
    const lines: SaleLine[] = []
    let sortOrder = 0

    for (const item of items) {
      sortOrder += 10

      const product = await client.query<{ id: string; name: string; price_cop: number | null }>(
        `
          select id, name, price_cop
          from public.products
          where id = $1
            and branch_id = $2
            and available
          limit 1
        `,
        [item.productId, branchId],
      )

      if (product.rowCount !== 1) {
        throw new BadRequestException('Producto no disponible para la sede.')
      }

      const priceCop = product.rows[0].price_cop
      if (priceCop == null) {
        throw new BadRequestException('El producto no tiene precio definido.')
      }

      const hasFormula = await client.query(
        `
          select 1
          from public.formulas
          where branch_id = $1
            and product_id = $2
            and active
          limit 1
        `,
        [branchId, product.rows[0].id],
      )

      if (hasFormula.rowCount === 1) {
        await client.query(
          `select public.decrement_product_stock_for_sale($1, $2, $3, '{}'::text[], $4)`,
          [branchId, product.rows[0].id, item.quantity, createdBy],
        )
      }

      lines.push({
        productId: product.rows[0].id,
        productName: product.rows[0].name,
        quantity: item.quantity,
        unitPriceCop: priceCop,
        lineTotalCop: Math.round(priceCop * item.quantity),
        sortOrder,
      })
    }

    return lines
  }

  private async nextReceiptNumber(client: PoolClient, branchId: string) {
    const result = await client.query<{ receipt_number: string }>(
      'select public.next_internal_receipt_number($1) as receipt_number',
      [branchId],
    )

    return result.rows[0].receipt_number
  }
}
