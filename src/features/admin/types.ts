import type { MenuCategory, MenuItem } from '../../data/brasasSazonMenu'

export type AdminProductForm = {
  id: string
  categoryId: string
  name: string
  description: string
  price: string
  badge: string
  imageUrl: string
  available: boolean
}

export type AdminRestaurantForm = {
  name: string
  shortName: string
  whatsappNumber: string
  location: string
  headline: string
  description: string
  socialHandle: string
}

export type AdminMenuData = {
  restaurantForm: AdminRestaurantForm
  categories: MenuCategory[]
  products: MenuItem[]
}
