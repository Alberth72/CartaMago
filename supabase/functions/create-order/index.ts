import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-idempotency-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type CreateOrderItem = {
  productId: string
  productName: string
  quantity: number
  unitPriceCop: number | null
  lineNote: string
}

type CreateOrderPayload = {
  branchId: string
  orderChannel?: string
  deliveryProvider?: string
  paymentStatus?: string
  paymentMethod?: string
  paymentProvider?: string
  externalProvider?: string
  externalOrderId?: string
  externalStatus?: string
  externalPayload?: Record<string, unknown>
  customerName: string
  customerPhone: string
  customerNote: string
  fulfillmentMode: string
  deliveryAddress: string
  tableNumber: string
  totalItems: number
  totalCop: number
  whatsappMessage: string
  whatsappLink: string
  orderStartedAt?: number
  website?: string
  captchaToken?: string
  items: CreateOrderItem[]
}

type WhatsAppNotificationResult = {
  status: 'skipped' | 'sent' | 'failed'
  destinationPhone?: string
  providerMessageId?: string
  errorCode?: string
  errorMessage?: string
}

type ProductRow = {
  id: string
  branch_id: string
  name: string
  price_cop: number | null
  available: boolean
}

type RestaurantRow = {
  id: string
  name?: string
  short_name?: string | null
  fulfillment_modes: string[] | null
}

const paymentMethodsByFulfillment: Record<string, string[]> = {
  pickup: ['cash', 'card_at_counter', 'bank_transfer', 'wompi'],
  local_delivery: ['cash', 'bank_transfer', 'wompi'],
  didi_food: ['didi_food'],
  table: ['cash', 'card_at_table', 'bank_transfer', 'wompi'],
}

const paymentProvidersByMethod: Record<string, string> = {
  cash: 'manual',
  card_at_counter: 'manual',
  card_at_table: 'manual',
  bank_transfer: 'manual',
  wompi: 'wompi',
  didi_food: 'didi_food',
}

const rateLimitWindowSeconds = Number(Deno.env.get('ORDER_RATE_LIMIT_WINDOW_SECONDS') ?? 300)
const rateLimitMaxRequests = Number(Deno.env.get('ORDER_RATE_LIMIT_MAX_REQUESTS') ?? 8)
const minimumOrderAgeMs = Number(Deno.env.get('ORDER_MINIMUM_AGE_MS') ?? 800)

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'content-type': 'application/json',
    },
  })
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

function formatFulfillmentMode(mode: string) {
  if (mode === 'pickup') return 'recoger en el local'
  if (mode === 'local_delivery') return 'domicilio local'
  if (mode === 'table') return 'mesa'
  if (mode === 'didi_food') return 'DiDiFood'
  return mode
}

function normalizeWhatsAppPhone(value: string) {
  const digits = value.replace(/\D/g, '')
  if (!digits) return null
  if (digits.length === 10) return `${Deno.env.get('WHATSAPP_DEFAULT_COUNTRY_CODE') ?? '57'}${digits}`
  if (digits.length >= 11 && digits.length <= 15) return digits
  return null
}

function makeTrackingUrl(request: Request, branchId: string, trackingToken: string) {
  const configuredOrigin = Deno.env.get('PUBLIC_SITE_URL') ?? Deno.env.get('SITE_URL')
  const requestOrigin = request.headers.get('origin')
  const origin = (configuredOrigin || requestOrigin || '').replace(/\/+$/, '')
  const path = `/s/${encodeURIComponent(branchId)}/tracking/t/${encodeURIComponent(trackingToken)}`
  return origin ? `${origin}${path}` : path
}

async function sha256(value: string) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function validatePayload(payload: Partial<CreateOrderPayload>) {
  if (!payload.branchId) return 'branchId is required'
  if (!payload.fulfillmentMode) return 'fulfillmentMode is required'
  if (!Array.isArray(payload.items) || payload.items.length === 0) return 'items are required'
  if ((payload.totalItems ?? 0) <= 0) return 'totalItems must be greater than zero'
  if ((payload.totalCop ?? 0) < 0) return 'totalCop cannot be negative'
  if ((payload.customerName ?? '').length > 120) return 'customerName is too long'
  if ((payload.customerPhone ?? '').length > 40) return 'customerPhone is too long'
  if ((payload.customerNote ?? '').length > 500) return 'customerNote is too long'
  if ((payload.deliveryAddress ?? '').length > 300) return 'deliveryAddress is too long'
  if ((payload.whatsappMessage ?? '').length > 4000) return 'whatsappMessage is too long'
  if ((payload.website ?? '').trim().length > 0) return 'invalid submission'
  if (payload.orderStartedAt && Date.now() - payload.orderStartedAt < minimumOrderAgeMs) {
    return 'submission is too fast'
  }
  if (payload.items.length > 50) return 'too many items'

  const normalizedFulfillmentMode = normalizeFulfillmentMode(payload.fulfillmentMode ?? '')
  const paymentMethod = payload.paymentMethod ?? 'cash'
  const allowedPaymentMethods = paymentMethodsByFulfillment[normalizedFulfillmentMode] ?? []
  if (!allowedPaymentMethods.includes(paymentMethod)) return 'paymentMethod is not enabled for fulfillmentMode'

  const expectedPaymentProvider = paymentProvidersByMethod[paymentMethod]
  if (payload.paymentProvider && payload.paymentProvider !== expectedPaymentProvider) {
    return 'paymentProvider does not match paymentMethod'
  }

  for (const item of payload.items) {
    if (!item.productId || !item.productName) return 'each item requires productId and productName'
    if (item.quantity <= 0 || item.quantity > 99) return 'item quantity is out of range'
  }

  return null
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-real-ip') ??
    forwardedFor ??
    'unknown'
  )
}

async function verifyCaptchaIfConfigured(token: string | undefined) {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY')
  if (!secret) return true
  if (!token) return false

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token }),
  })

  if (!response.ok) return false
  const result = await response.json() as { success?: boolean }
  return result.success === true
}

async function insertOrderNotification(
  supabase: ReturnType<typeof createClient>,
  input: {
    orderId: string
    branchId: string
    destinationPhone: string
    templateName?: string
    status: WhatsAppNotificationResult['status']
    providerMessageId?: string
    errorCode?: string
    errorMessage?: string
    payload?: Record<string, unknown>
    response?: Record<string, unknown>
  },
) {
  const { error } = await supabase.from('order_notifications').insert({
    id: makeId('ntf'),
    order_id: input.orderId,
    branch_id: input.branchId,
    channel: 'whatsapp',
    destination_phone: input.destinationPhone,
    template_name: input.templateName ?? null,
    status: input.status,
    provider_message_id: input.providerMessageId ?? null,
    error_code: input.errorCode ?? null,
    error_message: input.errorMessage ?? null,
    payload_json: input.payload ?? {},
    response_json: input.response ?? {},
    sent_at: input.status === 'sent' ? new Date().toISOString() : null,
  })

  if (error) {
    console.error('Failed to persist order notification', error)
  }
}

async function sendWhatsAppOrderConfirmation(
  supabase: ReturnType<typeof createClient>,
  request: Request,
  orderId: string,
  trackingToken: string,
  branchName: string,
  payload: CreateOrderPayload,
): Promise<WhatsAppNotificationResult> {
  const destinationOverride = Deno.env.get('WHATSAPP_CONFIRMATION_TO_OVERRIDE')?.trim()
  const destinationPhone = normalizeWhatsAppPhone(destinationOverride || payload.customerPhone)
  const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
  const templateName = Deno.env.get('WHATSAPP_TEMPLATE_NAME') ?? 'pedido_recibido'
  const languageCode = Deno.env.get('WHATSAPP_TEMPLATE_LANGUAGE') ?? 'es_CO'
  const graphVersion = Deno.env.get('WHATSAPP_GRAPH_VERSION') ?? 'v23.0'

  if (!destinationPhone) {
    const result: WhatsAppNotificationResult = {
      status: 'skipped',
      errorCode: 'missing_customer_phone',
      errorMessage: 'Customer phone is required for WhatsApp confirmation.',
    }
    await insertOrderNotification(supabase, {
      orderId,
      branchId: payload.branchId,
      destinationPhone: '',
      templateName,
      ...result,
    })
    return result
  }

  if (!accessToken || !phoneNumberId) {
    const result: WhatsAppNotificationResult = {
      status: 'skipped',
      destinationPhone,
      errorCode: 'whatsapp_not_configured',
      errorMessage: 'WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID are required.',
    }
    await insertOrderNotification(supabase, {
      orderId,
      branchId: payload.branchId,
      destinationPhone,
      templateName,
      ...result,
    })
    return result
  }

  const trackingUrl = makeTrackingUrl(request, payload.branchId, trackingToken)
  const receiptNumber = makeReceiptNumber(orderId)
  const templateComponents =
    templateName === 'hello_world'
      ? []
      : [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: payload.customerName || 'Cliente' },
              { type: 'text', text: receiptNumber },
              { type: 'text', text: branchName },
              { type: 'text', text: formatFulfillmentMode(payload.fulfillmentMode) },
              { type: 'text', text: formatCop(payload.totalCop) },
              { type: 'text', text: trackingUrl },
            ],
          },
        ]
  const messagePayload = {
    messaging_product: 'whatsapp',
    to: destinationPhone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(templateComponents.length > 0 ? { components: templateComponents } : {}),
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
      const result: WhatsAppNotificationResult = {
        status: 'failed',
        destinationPhone,
        errorCode: responseJson.error?.code == null ? String(response.status) : String(responseJson.error.code),
        errorMessage: responseJson.error?.message ?? response.statusText,
      }
      await insertOrderNotification(supabase, {
        orderId,
        branchId: payload.branchId,
        destinationPhone,
        templateName,
        payload: messagePayload,
        response: responseJson as Record<string, unknown>,
        ...result,
      })
      return result
    }

    const providerMessageId = responseJson.messages?.[0]?.id
    const result: WhatsAppNotificationResult = {
      status: 'sent',
      destinationPhone,
      providerMessageId,
    }
    await insertOrderNotification(supabase, {
      orderId,
      branchId: payload.branchId,
      destinationPhone,
      templateName,
      payload: messagePayload,
      response: responseJson as Record<string, unknown>,
      ...result,
    })
    return result
  } catch (error) {
    const result: WhatsAppNotificationResult = {
      status: 'failed',
      destinationPhone,
      errorCode: 'request_failed',
      errorMessage: error instanceof Error ? error.message : 'WhatsApp request failed.',
    }
    await insertOrderNotification(supabase, {
      orderId,
      branchId: payload.branchId,
      destinationPhone,
      templateName,
      payload: messagePayload,
      ...result,
    })
    return result
  }
}

async function enforceRateLimit(
  supabase: ReturnType<typeof createClient>,
  branchId: string,
  clientIp: string,
) {
  const now = new Date()
  const windowStartedAtMs = Math.floor(now.getTime() / (rateLimitWindowSeconds * 1000)) * rateLimitWindowSeconds * 1000
  const windowStartedAt = new Date(windowStartedAtMs)
  const expiresAt = new Date(windowStartedAtMs + rateLimitWindowSeconds * 1000)
  const limitHash = await sha256(`${branchId}:${clientIp}:${windowStartedAt.toISOString()}`)
  const id = `orl_${limitHash.slice(0, 32)}`

  const { data: existing, error: selectError } = await supabase
    .from('order_rate_limits')
    .select('request_count')
    .eq('id', id)
    .maybeSingle()

  if (selectError) {
    throw new Error(selectError.message)
  }

  if (existing) {
    const nextCount = Number(existing.request_count ?? 0) + 1
    if (nextCount > rateLimitMaxRequests) {
      return false
    }

    const { error: updateError } = await supabase
      .from('order_rate_limits')
      .update({ request_count: nextCount })
      .eq('id', id)

    if (updateError) {
      throw new Error(updateError.message)
    }

    return true
  }

  const { error: insertError } = await supabase.from('order_rate_limits').insert({
    id,
    branch_id: branchId,
    limit_key: limitHash,
    window_started_at: windowStartedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    request_count: 1,
  })

  if (insertError) {
    throw new Error(insertError.message)
  }

  return true
}

function normalizeFulfillmentMode(mode: string) {
  return mode === 'delivery' ? 'local_delivery' : mode
}

async function applyOrderStockDeductions(
  supabase: ReturnType<typeof createClient>,
  branchId: string,
  items: Array<{ product_id: string; quantity: number }>,
) {
  for (const item of items) {
    const { data: formula, error: formulaError } = await supabase
      .from('formulas')
      .select('id')
      .eq('branch_id', branchId)
      .eq('product_id', item.product_id)
      .eq('active', true)
      .limit(1)
      .maybeSingle()

    if (formulaError) {
      throw new Error(formulaError.message)
    }

    if (!formula) {
      continue
    }

    const { error: stockError } = await supabase.rpc('decrement_product_stock_for_sale', {
      p_branch_id: branchId,
      p_product_id: item.product_id,
      p_quantity: item.quantity,
      p_option_ids: [],
      p_created_by: 'public_order',
    })

    if (stockError) {
      throw new Error(stockError.message)
    }
  }
}

async function validateMenuAndPricing(
  supabase: ReturnType<typeof createClient>,
  payload: CreateOrderPayload,
) {
  const { data: restaurant, error: restaurantError } = await supabase
    .from('branches')
    .select('id, name, short_name, fulfillment_modes')
    .eq('id', payload.branchId)
    .maybeSingle()

  if (restaurantError) throw new Error(restaurantError.message)
  if (!restaurant) return { error: 'restaurant_not_found' }

  const fulfillmentModes = ((restaurant as RestaurantRow).fulfillment_modes ?? [])
    .map(normalizeFulfillmentMode)
  if (fulfillmentModes.length > 0 && !fulfillmentModes.includes(payload.fulfillmentMode)) {
    return { error: 'fulfillment_mode_unavailable' }
  }

  const productIds = Array.from(new Set(payload.items.map((item) => item.productId)))
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, branch_id, name, price_cop, available')
    .eq('branch_id', payload.branchId)
    .in('id', productIds)

  if (productsError) throw new Error(productsError.message)

  const productsById = new Map((products as ProductRow[] | null ?? []).map((product) => [product.id, product]))
  let totalItems = 0
  let totalCop = 0

  for (const item of payload.items) {
    const product = productsById.get(item.productId)
    if (!product) return { error: 'product_not_found' }
    if (!product.available) return { error: 'product_unavailable' }
    if (product.price_cop == null) return { error: 'product_price_unavailable' }
    if (item.unitPriceCop !== product.price_cop) return { error: 'price_mismatch' }
    if (item.productName.trim() !== product.name.trim()) return { error: 'product_name_mismatch' }

    totalItems += item.quantity
    totalCop += product.price_cop * item.quantity
  }

  if (totalItems !== payload.totalItems) return { error: 'total_items_mismatch' }
  if (totalCop !== payload.totalCop) return { error: 'total_cop_mismatch' }

  return {
    branchName: (restaurant as RestaurantRow).short_name ?? (restaurant as RestaurantRow).name ?? payload.branchId,
    items: payload.items.map((item, index) => {
      const product = productsById.get(item.productId)
      return {
        id: makeId('itm'),
        order_id: '',
        product_id: item.productId,
        product_name: product?.name ?? item.productName,
        quantity: item.quantity,
        unit_price_cop: product?.price_cop ?? item.unitPriceCop,
        line_note: item.lineNote,
        sort_order: (index + 1) * 10,
      }
    }),
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'server_not_configured' }, 500)
  }

  let payload: CreateOrderPayload

  try {
    payload = await request.json()
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400)
  }

  const validationError = validatePayload(payload)
  if (validationError) {
    return jsonResponse({ error: 'validation_error', message: validationError }, 400)
  }

  const captchaOk = await verifyCaptchaIfConfigured(payload.captchaToken)
  if (!captchaOk) {
    return jsonResponse({ error: 'captcha_required' }, 403)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const idempotencyKey = request.headers.get('x-idempotency-key') ?? makeId('idem')
  const requestHash = await sha256(JSON.stringify(payload))

  const { data: existingKey, error: existingError } = await supabase
    .from('order_idempotency_keys')
    .select('order_id, request_hash, response_json')
    .eq('branch_id', payload.branchId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()

  if (existingError) {
    return jsonResponse({ error: 'idempotency_lookup_failed', message: existingError.message }, 500)
  }

  if (existingKey) {
    if (existingKey.request_hash !== requestHash) {
      return jsonResponse({ error: 'idempotency_conflict' }, 409)
    }

    return jsonResponse(existingKey.response_json)
  }

  try {
    const allowed = await enforceRateLimit(supabase, payload.branchId, getClientIp(request))
    if (!allowed) {
      return jsonResponse({ error: 'rate_limited' }, 429)
    }
  } catch (error) {
    console.error('Rate limit check failed', error)
    return jsonResponse({ error: 'rate_limit_failed' }, 500)
  }

  let validatedOrder: Awaited<ReturnType<typeof validateMenuAndPricing>>
  try {
    validatedOrder = await validateMenuAndPricing(supabase, payload)
  } catch (error) {
    console.error('Menu validation failed', error)
    return jsonResponse({ error: 'menu_validation_failed' }, 500)
  }

  if ('error' in validatedOrder) {
    return jsonResponse({ error: validatedOrder.error }, 409)
  }

  const orderId = makeId('ord')
  const trackingToken = makeId('tk')
  const order = {
    id: orderId,
    branch_id: payload.branchId,
    tracking_token: trackingToken,
    status: 'pending',
    order_channel: payload.orderChannel ?? 'cartamago',
    delivery_provider: payload.deliveryProvider ?? 'none',
    payment_status: payload.paymentStatus ?? 'not_required',
    payment_method: payload.paymentMethod ?? 'cash',
    payment_provider: payload.paymentProvider ?? paymentProvidersByMethod[payload.paymentMethod ?? 'cash'] ?? 'manual',
    external_provider: payload.externalProvider ?? null,
    external_order_id: payload.externalOrderId ?? null,
    external_status: payload.externalStatus ?? null,
    external_payload: payload.externalPayload ?? {},
    customer_name: payload.customerName,
    customer_phone: payload.customerPhone,
    customer_note: payload.customerNote,
    fulfillment_mode: payload.fulfillmentMode,
    delivery_address: payload.deliveryAddress,
    table_number: payload.tableNumber,
    total_items: payload.totalItems,
    total_cop: payload.totalCop,
    whatsapp_message: payload.whatsappMessage,
    whatsapp_link: payload.whatsappLink,
  }

  const { error: orderError } = await supabase.from('orders').insert(order)
  if (orderError) {
    return jsonResponse({ error: 'order_insert_failed', message: orderError.message }, 500)
  }

  const items = validatedOrder.items.map((item) => ({
    ...item,
    order_id: orderId,
  }))

  const { error: itemsError } = await supabase.from('order_items').insert(items)
  if (itemsError) {
    return jsonResponse({ error: 'order_items_insert_failed', message: itemsError.message }, 500)
  }

  try {
    await applyOrderStockDeductions(supabase, payload.branchId, items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
    })))
  } catch (error) {
    console.error('Stock deduction failed for public order', error)

    await supabase.from('order_items').delete().eq('order_id', orderId)
    await supabase.from('orders').delete().eq('id', orderId)

    return jsonResponse({
      error: 'stock_deduction_failed',
      message: error instanceof Error ? error.message : 'No se pudo descontar el inventario.',
    }, 409)
  }

  const whatsappNotification = await sendWhatsAppOrderConfirmation(
    supabase,
    request,
    orderId,
    trackingToken,
    validatedOrder.branchName,
    payload,
  )
  const response = { orderId, trackingToken, whatsappNotification }
  const { error: idempotencyError } = await supabase.from('order_idempotency_keys').insert({
    id: makeId('idem'),
    branch_id: payload.branchId,
    idempotency_key: idempotencyKey,
    order_id: orderId,
    request_hash: requestHash,
    response_json: response,
  })

  if (idempotencyError) {
    console.error('Failed to persist idempotency key', idempotencyError)
  }

  return jsonResponse(response, 201)
})
