import http from 'k6/http'
import { check, group, sleep } from 'k6'

const baseUrl = (__ENV.BASE_URL || 'http://127.0.0.1:4175').replace(/\/$/, '')
const supabaseUrl = (__ENV.SUPABASE_URL || 'http://127.0.0.1:54321').replace(/\/$/, '')
const supabaseAnonKey = __ENV.SUPABASE_ANON_KEY || ''
const restaurantId = __ENV.RESTAURANT_ID || 'brasas-sazon'
const writeOrders = __ENV.K6_WRITE_ORDERS === 'true'
const cloudRun = __ENV.K6_TARGET_ENV === 'cloud'

if (cloudRun && (!__ENV.BASE_URL || !baseUrl.startsWith('https://'))) {
  throw new Error('Cloud k6 runs require an explicit HTTPS BASE_URL.')
}

export const options = {
  scenarios: writeOrders
    ? {
        menu_reads: {
          executor: 'ramping-vus',
          exec: 'readMenu',
          stages: [
            { duration: '30s', target: 10 },
            { duration: '1m', target: 25 },
            { duration: '30s', target: 0 },
          ],
        },
        order_writes: {
          executor: 'constant-arrival-rate',
          exec: 'createOrder',
          rate: Number(__ENV.K6_ORDER_RATE || 2),
          timeUnit: '1s',
          duration: __ENV.K6_ORDER_DURATION || '1m',
          preAllocatedVUs: 10,
          maxVUs: 30,
        },
      }
    : {
        menu_reads: {
          executor: 'ramping-vus',
          exec: 'readMenu',
          stages: [
            { duration: '30s', target: 10 },
            { duration: '1m', target: 25 },
            { duration: '30s', target: 0 },
          ],
        },
      },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1200'],
    checks: ['rate>0.98'],
  },
}

const supabaseHeaders = {
  apikey: supabaseAnonKey,
  authorization: `Bearer ${supabaseAnonKey}`,
  'content-type': 'application/json',
}

export function readMenu() {
  group('static app shell', () => {
    const response = http.get(`${baseUrl}/`)
    check(response, {
      'app shell is available': (res) => res.status === 200,
      'app shell returns html': (res) => String(res.body).includes('<div id="root">'),
    })
  })

  if (!supabaseAnonKey) {
    sleep(1)
    return
  }

  group('public menu api', () => {
    const restaurant = http.get(
      `${supabaseUrl}/rest/v1/restaurants?id=eq.${restaurantId}&select=id,name,fulfillment_modes`,
      { headers: supabaseHeaders },
    )
    const categories = http.get(
      `${supabaseUrl}/rest/v1/categories?restaurant_id=eq.${restaurantId}&select=id,name,sort_order&order=sort_order.asc`,
      { headers: supabaseHeaders },
    )
    const products = http.get(
      `${supabaseUrl}/rest/v1/products?restaurant_id=eq.${restaurantId}&select=id,name,price_cop,available&order=sort_order.asc`,
      { headers: supabaseHeaders },
    )

    check(restaurant, {
      'restaurant api ok': (res) => res.status === 200,
      'restaurant data returned': (res) => Array.isArray(res.json()) && res.json().length === 1,
    })
    check(categories, {
      'categories api ok': (res) => res.status === 200,
      'categories returned': (res) => Array.isArray(res.json()) && res.json().length > 0,
    })
    check(products, {
      'products api ok': (res) => res.status === 200,
      'products returned': (res) => Array.isArray(res.json()) && res.json().length > 0,
    })
  })

  sleep(1)
}

export default function () {
  if (writeOrders) {
    createOrder()
    return
  }

  readMenu()
}

export function createOrder() {
  if (!supabaseAnonKey) {
    throw new Error('SUPABASE_ANON_KEY is required when K6_WRITE_ORDERS=true')
  }

  const orderId = `ord_k6_${Date.now()}_${__VU}_${__ITER}`

  group('public order write', () => {
    const orderResponse = http.post(
      `${supabaseUrl}/functions/v1/create-order`,
      JSON.stringify({
        restaurant_id: restaurantId,
        restaurantId,
        status: 'pending',
        order_channel: 'cartamago',
        orderChannel: 'cartamago',
        delivery_provider: 'local',
        deliveryProvider: 'local',
        payment_status: 'not_required',
        paymentStatus: 'not_required',
        customer_name: `Cliente carga ${__VU}`,
        customerName: `Cliente carga ${__VU}`,
        customer_note: 'Pedido generado por k6 en ambiente controlado',
        customerNote: 'Pedido generado por k6 en ambiente controlado',
        fulfillment_mode: 'local_delivery',
        fulfillmentMode: 'local_delivery',
        delivery_address: 'Direccion de prueba k6',
        deliveryAddress: 'Direccion de prueba k6',
        table_number: '',
        tableNumber: '',
        total_items: 1,
        totalItems: 1,
        total_cop: 26000,
        totalCop: 26000,
        whatsapp_message: 'Pedido de carga k6',
        whatsappMessage: 'Pedido de carga k6',
        whatsapp_link: 'https://wa.me/573104217941?text=Pedido%20k6',
        whatsappLink: 'https://wa.me/573104217941?text=Pedido%20k6',
        orderStartedAt: Date.now() - 5000,
        website: '',
        items: [
          {
            productId: 'pollo-entero',
            productName: '1 Pollo asado al carbon',
            quantity: 1,
            unitPriceCop: 26000,
            lineNote: '',
          },
        ],
      }),
      { headers: { ...supabaseHeaders, 'x-idempotency-key': orderId } },
    )

    check(orderResponse, {
      'create-order accepted': (res) => res.status === 201 || res.status === 200,
      'create-order returned orderId': (res) => Boolean(res.json('orderId')),
    })
  })

  sleep(1)
}
