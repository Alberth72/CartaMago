import type { MenuCategory, MenuItem } from '../../../data/restaurantSeed'
import { defaultSeed } from '../../../data/restaurantSeed'
import { slugify } from '../../../services/menuRepository'
import type { OrderStatus, OrderWithItems } from '../../order/types'
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
let products: MenuItem[] = defaultSeed.menuItems.slice(0, 6).map((product) => ({ ...product }))
let orders: OrderWithItems[] = [
  {
    id: 'ord_e2e_0001',
    restaurant_id: defaultSeed.id,
    status: 'pending',
    customer_name: 'Cliente E2E',
    customer_note: 'Sin cubiertos',
    fulfillment_mode: 'delivery',
    delivery_address: 'Calle 123',
    table_number: '',
    total_items: 1,
    total_cop: 26000,
    whatsapp_message:
      'Hola, quiero hacer este pedido en Brasas & Sazon:\n- 1 x 1 Pollo asado al carbon: $ 26.000\nTotal aproximado: $ 26.000',
    whatsapp_link: 'https://wa.me/573104217941?text=Pedido%20E2E',
    created_at: new Date('2026-07-28T12:00:00.000Z').toISOString(),
    updated_at: new Date('2026-07-28T12:00:00.000Z').toISOString(),
    items: [
      {
        id: 'itm_e2e_0001',
        order_id: 'ord_e2e_0001',
        product_id: 'pollo-entero',
        product_name: '1 Pollo asado al carbon',
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
  return `/client-assets/brasas-sazon/processed/${slugify(productName || 'producto')}.jpg`
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
