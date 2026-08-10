import type { MenuCategory, MenuItem } from '../../../data/restaurantSeed'
import { defaultSeed } from '../../../data/restaurantSeed'
import { slugify } from '../../../services/menuRepository'
import type { OrderStatus, OrderWithItems } from '../../order/types'
import type { InventoryData, MermaReason } from '../inventoryTypes'
import type { AdminMenuData, AdminRestaurantForm } from '../types'

const adminEmail = 'owner@cartamago.test'
const adminPassword = 'cartamago-e2e'
const sessionListeners = new Set<(isLoggedIn: boolean) => void>()
let isLoggedIn = false

let restaurantForm: AdminRestaurantForm = {
  name: defaultSeed.restaurant.name,
  shortName: defaultSeed.restaurant.shortName,
  whatsappNumber: defaultSeed.restaurant.whatsappNumber,
  location: defaultSeed.restaurant.location,
  headline: defaultSeed.restaurant.headline,
  description: defaultSeed.restaurant.description,
  socialHandle: defaultSeed.restaurant.socialHandle,
}

let categories: MenuCategory[] = defaultSeed.categories.map((category) => ({ ...category }))
let products: MenuItem[] = defaultSeed.menuItems.map((product) => ({ ...product }))
const now = Date.now()
let orders: OrderWithItems[] = [
  {
    id: 'ord_demo_pending_pickup',
    branch_id: defaultSeed.id,
    status: 'pending',
    order_channel: 'cartamago',
    delivery_provider: 'none',
    payment_status: 'pending',
    payment_method: 'cash',
    payment_provider: 'manual',
    customer_name: 'Laura Torres',
    customer_phone: '3104217941',
    customer_note: 'Recoge en 20 minutos. Confirmar antes de preparar.',
    fulfillment_mode: 'pickup',
    delivery_address: '',
    table_number: '',
    total_items: 2,
    total_cop: 52000,
    whatsapp_message:
      'Hola, quiero hacer este pedido en Brasas & Sazon:\n- 1 x 1 Pollo asado al carbon: $ 26.000\n- 1 x Limonada natural: $ 26.000\nTotal aproximado: $ 52.000\nEntrega: Recoger en el local\nNombre: Laura Torres\nTelefono: 3104217941',
    whatsapp_link: 'https://wa.me/573104217941?text=Pedido%20recoger%20demo',
    created_at: new Date(now - 8 * 60_000).toISOString(),
    updated_at: new Date(now - 8 * 60_000).toISOString(),
    items: [
      {
        id: 'itm_demo_pickup_001',
        order_id: 'ord_demo_pending_pickup',
        product_id: 'pollo-entero',
        product_name: '1 Pollo asado al carbon',
        quantity: 1,
        unit_price_cop: 26000,
        line_note: '',
        sort_order: 10,
      },
      {
        id: 'itm_demo_pickup_002',
        order_id: 'ord_demo_pending_pickup',
        product_id: 'limonada-natural',
        product_name: 'Limonada natural',
        quantity: 1,
        unit_price_cop: 26000,
        line_note: 'Bien fria',
        sort_order: 20,
      },
    ],
  },
  {
    id: 'ord_demo_confirmed_delivery',
    branch_id: defaultSeed.id,
    status: 'confirmed',
    order_channel: 'cartamago',
    delivery_provider: 'local',
    payment_status: 'pending',
    payment_method: 'cash',
    payment_provider: 'manual',
    customer_name: 'Andres Molina',
    customer_phone: '3001234567',
    customer_note: 'Paga en efectivo, enviar cambio de 100000.',
    fulfillment_mode: 'local_delivery',
    delivery_address: 'Calle 18 #7-42, Barrio Centro',
    table_number: '',
    total_items: 3,
    total_cop: 78000,
    whatsapp_message:
      'Hola, quiero domicilio local:\n- 2 x Churrasco 300 gr: $ 52.000\n- 1 x Jugo en agua: $ 26.000\nDireccion: Calle 18 #7-42, Barrio Centro\nTelefono: 3001234567',
    whatsapp_link: 'https://wa.me/573104217941?text=Pedido%20domicilio%20demo',
    created_at: new Date(now - 22 * 60_000).toISOString(),
    updated_at: new Date(now - 18 * 60_000).toISOString(),
    items: [
      {
        id: 'itm_demo_delivery_001',
        order_id: 'ord_demo_confirmed_delivery',
        product_id: 'churrasco',
        product_name: 'Churrasco 300 gr',
        quantity: 2,
        unit_price_cop: 26000,
        line_note: 'Termino medio',
        sort_order: 10,
      },
      {
        id: 'itm_demo_delivery_002',
        order_id: 'ord_demo_confirmed_delivery',
        product_id: 'jugo-agua',
        product_name: 'Jugo en agua',
        quantity: 1,
        unit_price_cop: 26000,
        line_note: 'Mora',
        sort_order: 20,
      },
    ],
  },
  {
    id: 'ord_demo_preparing_pickup',
    branch_id: defaultSeed.id,
    status: 'preparing',
    order_channel: 'whatsapp',
    delivery_provider: 'none',
    payment_status: 'paid',
    payment_method: 'bank_transfer',
    payment_provider: 'manual',
    customer_name: 'Sofia Rojas',
    customer_phone: '3015558899',
    customer_note: 'Recoge en mostrador.',
    fulfillment_mode: 'pickup',
    delivery_address: '',
    table_number: '',
    total_items: 2,
    total_cop: 52000,
    whatsapp_message: 'Hola, paso a recoger: 1 bandeja paisa y 1 limonada natural.',
    whatsapp_link: 'https://wa.me/573104217941?text=Pedido%20preparando%20demo',
    created_at: new Date(now - 38 * 60_000).toISOString(),
    updated_at: new Date(now - 20 * 60_000).toISOString(),
    items: [
      {
        id: 'itm_demo_preparing_001',
        order_id: 'ord_demo_preparing_pickup',
        product_id: 'bandeja-paisa',
        product_name: 'Bandeja paisa',
        quantity: 1,
        unit_price_cop: 26000,
        line_note: '',
        sort_order: 10,
      },
      {
        id: 'itm_demo_preparing_002',
        order_id: 'ord_demo_preparing_pickup',
        product_id: 'limonada-natural',
        product_name: 'Limonada natural',
        quantity: 1,
        unit_price_cop: 26000,
        line_note: '',
        sort_order: 20,
      },
    ],
  },
  {
    id: 'ord_demo_ready_table',
    branch_id: defaultSeed.id,
    status: 'ready',
    order_channel: 'cartamago',
    delivery_provider: 'none',
    payment_status: 'pending',
    payment_method: 'card_at_table',
    payment_provider: 'manual',
    customer_name: 'Mesa 6',
    customer_note: 'Aji aparte y dos servilletas extra.',
    fulfillment_mode: 'table',
    delivery_address: '',
    table_number: '6',
    total_items: 5,
    total_cop: 130000,
    whatsapp_message: 'Hola, pedido para mesa 6: 2 puntas de anca, 2 sopas de pollo y 1 jugo.',
    whatsapp_link: 'https://wa.me/573104217941?text=Pedido%20mesa%206%20demo',
    created_at: new Date(now - 51 * 60_000).toISOString(),
    updated_at: new Date(now - 12 * 60_000).toISOString(),
    items: [
      {
        id: 'itm_demo_table_001',
        order_id: 'ord_demo_ready_table',
        product_id: 'punta-anca',
        product_name: 'Punta de anca 300 gr',
        quantity: 2,
        unit_price_cop: 26000,
        line_note: 'Bien asada',
        sort_order: 10,
      },
      {
        id: 'itm_demo_table_002',
        order_id: 'ord_demo_ready_table',
        product_id: 'sopa-pollo',
        product_name: 'Sopa de pollo',
        quantity: 2,
        unit_price_cop: 26000,
        line_note: '',
        sort_order: 20,
      },
      {
        id: 'itm_demo_table_003',
        order_id: 'ord_demo_ready_table',
        product_id: 'jugo-agua',
        product_name: 'Jugo en agua',
        quantity: 1,
        unit_price_cop: 26000,
        line_note: 'Mango',
        sort_order: 30,
      },
    ],
  },
  {
    id: 'ord_demo_delivered_local',
    branch_id: defaultSeed.id,
    status: 'delivered',
    order_channel: 'cartamago',
    delivery_provider: 'local',
    payment_status: 'paid',
    payment_method: 'wompi',
    payment_provider: 'wompi',
    customer_name: 'Camilo Perez',
    customer_phone: '3120001122',
    customer_note: '',
    fulfillment_mode: 'local_delivery',
    delivery_address: 'Av 2 #9-11',
    table_number: '',
    total_items: 2,
    total_cop: 52000,
    whatsapp_message: 'Hola, domicilio local: 1 pollo apanado y 1 papas a la francesa.',
    whatsapp_link: 'https://wa.me/573104217941?text=Pedido%20entregado%20demo',
    created_at: new Date(now - 2 * 60 * 60_000).toISOString(),
    updated_at: new Date(now - 75 * 60_000).toISOString(),
    items: [
      {
        id: 'itm_demo_delivered_001',
        order_id: 'ord_demo_delivered_local',
        product_id: 'pollo-apanado',
        product_name: '1 Pollo apanado',
        quantity: 1,
        unit_price_cop: 26000,
        line_note: '',
        sort_order: 10,
      },
      {
        id: 'itm_demo_delivered_002',
        order_id: 'ord_demo_delivered_local',
        product_id: 'papas-francesa',
        product_name: 'Papas a la francesa',
        quantity: 1,
        unit_price_cop: 26000,
        line_note: '',
        sort_order: 20,
      },
    ],
  },
  {
    id: 'ord_demo_cancelled_didi',
    branch_id: defaultSeed.id,
    status: 'cancelled',
    order_channel: 'didi_food',
    delivery_provider: 'didi_food',
    payment_status: 'cancelled',
    payment_method: 'didi_food',
    payment_provider: 'didi_food',
    external_provider: 'didi_food',
    external_order_id: 'didi-cancelled-demo',
    external_status: 'cancelled_by_customer',
    external_payload: { source: 'didi_food', reason: 'customer_cancelled', sandbox: true },
    customer_name: 'Natalia Gomez',
    customer_note: 'Pedido cancelado desde proveedor.',
    fulfillment_mode: 'didi_food',
    delivery_address: 'Calle 30 #8-80',
    table_number: '',
    total_items: 1,
    total_cop: 26000,
    whatsapp_message: 'Pedido DiDiFood cancelado: 1 salchipapas.',
    whatsapp_link: '',
    created_at: new Date(now - 3 * 60 * 60_000).toISOString(),
    updated_at: new Date(now - 2.5 * 60 * 60_000).toISOString(),
    items: [
      {
        id: 'itm_demo_cancelled_001',
        order_id: 'ord_demo_cancelled_didi',
        product_id: 'salchipapas',
        product_name: 'Salchipapas',
        quantity: 1,
        unit_price_cop: 26000,
        line_note: '',
        sort_order: 10,
      },
    ],
  },
]

function notifySessionListeners() {
  for (const listener of sessionListeners) {
    listener(isLoggedIn)
  }
}

export async function hasMockAdminSession() {
  return isLoggedIn
}

export function subscribeMockAdminSession(onSessionChange: (isLoggedIn: boolean) => void) {
  sessionListeners.add(onSessionChange)
  queueMicrotask(() => onSessionChange(isLoggedIn))

  return () => sessionListeners.delete(onSessionChange)
}

export async function signInMockAdmin(email: string, password: string) {
  if (email !== adminEmail || password !== adminPassword) {
    return 'Credenciales de prueba invalidas.'
  }

  isLoggedIn = true
  notifySessionListeners()
  return undefined
}

export async function signOutMockAdmin() {
  isLoggedIn = false
  notifySessionListeners()
}

export async function fetchMockAdminMenu(): Promise<AdminMenuData> {
  return {
    restaurantForm: { ...restaurantForm },
    categories: categories.map((category) => ({ ...category })),
    products: products.map((product) => ({ ...product })),
  }
}

export async function upsertMockAdminCategory(name: string, description: string) {
  const id = slugify(name)
  categories = [
    ...categories.filter((category) => category.id !== id),
    { id, name: name.trim(), description: description.trim() },
  ]
}

export async function deleteMockAdminCategory(id: string) {
  categories = categories.filter((category) => category.id !== id)
}

export async function updateMockAdminRestaurant(form: AdminRestaurantForm, whatsappNumber: string) {
  restaurantForm = { ...form, whatsappNumber }
}

export async function upsertMockAdminProduct(product: MenuItem) {
  products = [...products.filter((item) => item.id !== product.id), { ...product }]
}

export async function deleteMockAdminProduct(id: string) {
  products = products.filter((product) => product.id !== id)
}

export async function uploadMockAdminProductImage(_file: File, productName: string) {
  return `/client-assets/brasas-sazon/processed/product-placeholder-preparing.png?mock=${slugify(productName || 'producto')}`
}

export async function fetchMockOrders() {
  return orders.map((order) => ({
    ...order,
    items: order.items.map((item) => ({ ...item })),
  }))
}

export async function updateMockOrderStatus(orderId: string, status: OrderStatus) {
  orders = orders.map((order) =>
    order.id === orderId ? { ...order, status, updated_at: new Date().toISOString() } : order,
  )
  return true
}

// --- Inventory mock ---

let inventoryData: InventoryData = {
  items: [
    { id: 'pollo-entero', name: 'Pollo entero', unit: 'unidad', category: 'Carnes' },
    { id: 'papa-criolla', name: 'Papa criolla', unit: 'kg', category: 'Verduras' },
    { id: 'arroz', name: 'Arroz', unit: 'kg', category: 'Granos' },
    { id: 'limon', name: 'Limon', unit: 'kg', category: 'Frutas' },
    { id: 'carbon', name: 'Carbon', unit: 'bolsa', category: 'Insumos' },
  ],
  stock: [
    { id: 'stk_pollo', itemId: 'pollo-entero', quantity: 25 },
    { id: 'stk_papa', itemId: 'papa-criolla', quantity: 40 },
    { id: 'stk_arroz', itemId: 'arroz', quantity: 60 },
    { id: 'stk_limon', itemId: 'limon', quantity: 15 },
    { id: 'stk_carbon', itemId: 'carbon', quantity: 10 },
  ],
  movements: [
    {
      id: 'mov_demo_001',
      itemId: 'pollo-entero',
      quantity: -2,
      movementType: 'merma',
      reason: 'despiece',
      createdAt: new Date(now - 2 * 60 * 60_000).toISOString(),
    },
    {
      id: 'mov_demo_002',
      itemId: 'papa-criolla',
      quantity: -3,
      movementType: 'merma',
      reason: 'dano',
      createdAt: new Date(now - 5 * 60 * 60_000).toISOString(),
    },
  ],
}

export async function fetchMockInventory(): Promise<InventoryData> {
  return {
    items: inventoryData.items.map((item) => ({ ...item })),
    stock: inventoryData.stock.map((stock) => ({ ...stock })),
    movements: inventoryData.movements.map((movement) => ({ ...movement })),
  }
}

export async function registerMockMerma(itemId: string, quantity: number, reason: MermaReason) {
  const stock = inventoryData.stock.find((entry) => entry.itemId === itemId)
  if (!stock) throw new Error('Insumo no encontrado.')
  if (stock.quantity < quantity) throw new Error('Stock insuficiente para registrar la merma.')

  stock.quantity -= quantity
  inventoryData.movements = [
    {
      id: `mov_${Date.now()}`,
      itemId,
      quantity: -quantity,
      movementType: 'merma',
      reason,
      createdAt: new Date().toISOString(),
    },
    ...inventoryData.movements,
  ]
}
