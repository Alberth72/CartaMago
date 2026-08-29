import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseApiConfig } from '../supabase/supabase.config.js'
import {
  ORDER_STATUSES,
  type OrderStatus,
  type UpdateOrderStatusInput,
  type WhatsAppNotificationResult,
} from './orders.types.js'

type OrderRow = {
  id: string
  branch_id: string
  tracking_token: string | null
  status: OrderStatus
  customer_name: string | null
  customer_phone: string | null
  fulfillment_mode: string | null
  total_cop: number | null
}

type BranchRow = {
  id: string
  name: string | null
  short_name: string | null
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function parseText(value: unknown, field: string) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new BadRequestException(`${field} is required.`)
  }

  return value.trim()
}

function parseOrderStatus(value: unknown): OrderStatus {
  if (typeof value === 'string' && ORDER_STATUSES.includes(value as OrderStatus)) {
    return value as OrderStatus
  }

  throw new BadRequestException('Unsupported order status.')
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`
}

function makeReceiptNumber(orderId: string) {
  return `PED-${orderId.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10)}`
}

function formatCop(value: number) {
  return `$${new Intl.NumberFormat('es-CO').format(value)}`
}

function normalizeWhatsAppPhone(value: string) {
  const digits = value.replace(/\D/g, '')
  if (!digits) return null
  if (digits.length === 10) return `${process.env.WHATSAPP_DEFAULT_COUNTRY_CODE ?? '57'}${digits}`
  if (digits.length >= 11 && digits.length <= 15) return digits
  return null
}

function formatStatus(status: OrderStatus, fulfillmentMode: string | null) {
  if (status === 'confirmed') return 'confirmado'
  if (status === 'preparing') return 'en preparacion'
  if (status === 'ready' && (fulfillmentMode === 'local_delivery' || fulfillmentMode === 'delivery')) {
    return 'listo para enviar'
  }
  if (status === 'ready') return 'listo'
  if (status === 'delivered') return 'entregado'
  if (status === 'cancelled') return 'cancelado'
  return 'recibido'
}

function getTemplateName(status: OrderStatus, fulfillmentMode: string | null) {
  if (status === 'ready' && (fulfillmentMode === 'local_delivery' || fulfillmentMode === 'delivery')) {
    return process.env.WHATSAPP_STATUS_TEMPLATE_READY_DELIVERY ??
      process.env.WHATSAPP_STATUS_TEMPLATE_READY ??
      'pedido_listo'
  }

  const envKey = `WHATSAPP_STATUS_TEMPLATE_${status.toUpperCase()}`
  return process.env[envKey] ?? {
    pending: '',
    confirmed: 'pedido_confirmado',
    preparing: 'pedido_en_preparacion',
    ready: 'pedido_listo',
    delivered: 'pedido_entregado',
    cancelled: 'pedido_cancelado',
  }[status]
}

function makeTrackingUrl(branchId: string, trackingToken: string | null) {
  const origin = (process.env.PUBLIC_SITE_URL ?? process.env.SITE_URL ?? '').replace(/\/+$/, '')
  const token = trackingToken || ''
  const path = `/s/${encodeURIComponent(branchId)}/tracking/t/${encodeURIComponent(token)}`
  return origin ? `${origin}${path}` : path
}

function createUserClient(authorization: string) {
  const config = getSupabaseApiConfig()
  if (!config.url || !config.anonKey) {
    throw new BadRequestException('Supabase API is not configured for the NestJS API.')
  }

  return createClient(config.url, config.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authorization } },
  })
}

function createServiceClient() {
  const config = getSupabaseApiConfig()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!config.url || !serviceRoleKey) return null

  return createClient(config.url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

@Injectable()
export class OrdersService {
  parseUpdateStatusInput(value: unknown): UpdateOrderStatusInput {
    const body = asRecord(value)

    return {
      orderId: parseText(body.orderId, 'orderId'),
      status: parseOrderStatus(body.status),
    }
  }

  async updateStatus(input: UpdateOrderStatusInput, authorization?: string) {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Order status update requires a Supabase bearer token.')
    }

    const userClient = createUserClient(authorization)
    const existingOrder = await this.fetchOrder(userClient, input.orderId)

    if (existingOrder.status !== input.status) {
      const { error: updateError } = await userClient
        .from('orders')
        .update({ status: input.status })
        .eq('id', input.orderId)

      if (updateError) throw new BadRequestException(updateError.message)
    }

    const order = { ...existingOrder, status: input.status }
    const branch = await this.fetchBranch(userClient, order.branch_id)
    const whatsappNotification = await this.sendStatusNotification(order, branch)

    return {
      ok: true,
      orderId: order.id,
      status: order.status,
      whatsappNotification,
    }
  }

  private async fetchOrder(client: SupabaseClient, orderId: string): Promise<OrderRow> {
    const { data, error } = await client
      .from('orders')
      .select('id,branch_id,tracking_token,status,customer_name,customer_phone,fulfillment_mode,total_cop')
      .eq('id', orderId)
      .maybeSingle()

    if (error) throw new BadRequestException(error.message)
    if (!data) throw new NotFoundException('Order not found.')

    return data as OrderRow
  }

  private async fetchBranch(client: SupabaseClient, branchId: string): Promise<BranchRow> {
    const { data, error } = await client
      .from('branches')
      .select('id,name,short_name')
      .eq('id', branchId)
      .maybeSingle()

    if (error) throw new BadRequestException(error.message)
    if (!data) return { id: branchId, name: branchId, short_name: null }

    return data as BranchRow
  }

  private async sendStatusNotification(order: OrderRow, branch: BranchRow): Promise<WhatsAppNotificationResult> {
    const templateName = getTemplateName(order.status, order.fulfillment_mode)
    const destinationOverride = process.env.WHATSAPP_CONFIRMATION_TO_OVERRIDE?.trim()
    const destinationPhone = normalizeWhatsAppPhone(destinationOverride || order.customer_phone || '')
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
    const graphVersion = process.env.WHATSAPP_GRAPH_VERSION ?? 'v23.0'
    const languageCode = process.env.WHATSAPP_STATUS_TEMPLATE_LANGUAGE ?? process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? 'es_CO'
    const baseResult = { templateName, destinationPhone: destinationPhone ?? undefined }

    if (!templateName) {
      const result = {
        ...baseResult,
        status: 'skipped',
        errorCode: 'status_template_not_configured',
        errorMessage: 'No WhatsApp template is configured for this status.',
      } satisfies WhatsAppNotificationResult
      await this.insertNotification(order, result)
      return result
    }

    if (!destinationPhone) {
      const result = {
        ...baseResult,
        status: 'skipped',
        errorCode: 'missing_customer_phone',
        errorMessage: 'Customer phone is required for WhatsApp status notification.',
      } satisfies WhatsAppNotificationResult
      await this.insertNotification(order, result)
      return result
    }

    if (!accessToken || !phoneNumberId) {
      const result = {
        ...baseResult,
        status: 'skipped',
        errorCode: 'whatsapp_not_configured',
        errorMessage: 'WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID are required.',
      } satisfies WhatsAppNotificationResult
      await this.insertNotification(order, result)
      return result
    }

    const branchName = branch.short_name ?? branch.name ?? branch.id
    const messagePayload = {
      messaging_product: 'whatsapp',
      to: destinationPhone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: order.customer_name || 'Cliente' },
              { type: 'text', text: makeReceiptNumber(order.id) },
              { type: 'text', text: formatStatus(order.status, order.fulfillment_mode) },
              { type: 'text', text: branchName },
              { type: 'text', text: makeTrackingUrl(order.branch_id, order.tracking_token) },
              { type: 'text', text: formatCop(Number(order.total_cop ?? 0)) },
            ],
          },
        ],
      },
    }

    try {
      const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
      })
      const responseJson = await response.json().catch(() => ({})) as {
        messages?: Array<{ id?: string }>
        error?: { code?: number | string; message?: string }
      }

      if (!response.ok) {
        const result = {
          ...baseResult,
          status: 'failed',
          errorCode: responseJson.error?.code == null ? String(response.status) : String(responseJson.error.code),
          errorMessage: responseJson.error?.message ?? response.statusText,
        } satisfies WhatsAppNotificationResult
        await this.insertNotification(order, result, messagePayload, responseJson)
        return result
      }

      const result = {
        ...baseResult,
        status: 'sent',
        providerMessageId: responseJson.messages?.[0]?.id,
      } satisfies WhatsAppNotificationResult
      await this.insertNotification(order, result, messagePayload, responseJson)
      return result
    } catch (error) {
      const result = {
        ...baseResult,
        status: 'failed',
        errorCode: 'request_failed',
        errorMessage: error instanceof Error ? error.message : 'WhatsApp request failed.',
      } satisfies WhatsAppNotificationResult
      await this.insertNotification(order, result, messagePayload)
      return result
    }
  }

  private async insertNotification(
    order: OrderRow,
    result: WhatsAppNotificationResult,
    payload: Record<string, unknown> = {},
    response: Record<string, unknown> = {},
  ) {
    const serviceClient = createServiceClient()
    if (!serviceClient) return

    const { error } = await serviceClient.from('order_notifications').insert({
      id: makeId('ntf'),
      order_id: order.id,
      branch_id: order.branch_id,
      channel: 'whatsapp',
      destination_phone: result.destinationPhone ?? '',
      template_name: result.templateName ?? null,
      status: result.status,
      provider_message_id: result.providerMessageId ?? null,
      error_code: result.errorCode ?? null,
      error_message: result.errorMessage ?? null,
      payload_json: payload,
      response_json: response,
      sent_at: result.status === 'sent' ? new Date().toISOString() : null,
    })

    if (error) {
      console.error('Failed to persist order status notification', error)
    }
  }
}
