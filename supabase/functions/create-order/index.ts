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
  restaurantId: string
  orderChannel?: string
  deliveryProvider?: string
  paymentStatus?: string
  externalProvider?: string
  externalOrderId?: string
  externalStatus?: string
  externalPayload?: Record<string, unknown>
  customerName: string
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

type ProductRow = {
  id: string
  restaurant_id: string
  name: string
  price_cop: number | null
  available: boolean
}

type RestaurantRow = {
  id: string
  fulfillment_modes: string[] | null
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

async function sha256(value: string) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function validatePayload(payload: Partial<CreateOrderPayload>) {
  if (!payload.restaurantId) return 'restaurantId is required'
  if (!payload.fulfillmentMode) return 'fulfillmentMode is required'
  if (!Array.isArray(payload.items) || payload.items.length === 0) return 'items are required'
  if ((payload.totalItems ?? 0) <= 0) return 'totalItems must be greater than zero'
  if ((payload.totalCop ?? 0) < 0) return 'totalCop cannot be negative'
  if ((payload.customerName ?? '').length > 120) return 'customerName is too long'
  if ((payload.customerNote ?? '').length > 500) return 'customerNote is too long'
  if ((payload.deliveryAddress ?? '').length > 300) return 'deliveryAddress is too long'
  if ((payload.whatsappMessage ?? '').length > 4000) return 'whatsappMessage is too long'
  if ((payload.website ?? '').trim().length > 0) return 'invalid submission'
  if (payload.orderStartedAt && Date.now() - payload.orderStartedAt < minimumOrderAgeMs) {
    return 'submission is too fast'
  }
  if (payload.items.length > 50) return 'too many items'

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

async function enforceRateLimit(
  supabase: ReturnType<typeof createClient>,
  restaurantId: string,
  clientIp: string,
) {
  const now = new Date()
  const windowStartedAtMs = Math.floor(now.getTime() / (rateLimitWindowSeconds * 1000)) * rateLimitWindowSeconds * 1000
  const windowStartedAt = new Date(windowStartedAtMs)
  const expiresAt = new Date(windowStartedAtMs + rateLimitWindowSeconds * 1000)
  const limitHash = await sha256(`${restaurantId}:${clientIp}:${windowStartedAt.toISOString()}`)
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
    restaurant_id: restaurantId,
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

async function validateMenuAndPricing(
  supabase: ReturnType<typeof createClient>,
  payload: CreateOrderPayload,
) {
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('id, fulfillment_modes')
    .eq('id', payload.restaurantId)
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
    .select('id, restaurant_id, name, price_cop, available')
    .eq('restaurant_id', payload.restaurantId)
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
    .eq('restaurant_id', payload.restaurantId)
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
    const allowed = await enforceRateLimit(supabase, payload.restaurantId, getClientIp(request))
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
  const order = {
    id: orderId,
    restaurant_id: payload.restaurantId,
    status: 'pending',
    order_channel: payload.orderChannel ?? 'cartamago',
    delivery_provider: payload.deliveryProvider ?? 'none',
    payment_status: payload.paymentStatus ?? 'not_required',
    external_provider: payload.externalProvider ?? null,
    external_order_id: payload.externalOrderId ?? null,
    external_status: payload.externalStatus ?? null,
    external_payload: payload.externalPayload ?? {},
    customer_name: payload.customerName,
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

  const response = { orderId }
  const { error: idempotencyError } = await supabase.from('order_idempotency_keys').insert({
    id: makeId('idem'),
    restaurant_id: payload.restaurantId,
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
