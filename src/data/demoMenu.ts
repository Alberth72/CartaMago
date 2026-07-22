export type FulfillmentMode = 'pickup' | 'delivery' | 'table'

export type MenuCategory = {
  id: string
  name: string
  description: string
}

export type MenuItem = {
  id: string
  categoryId: string
  name: string
  description: string
  price: number
  badge?: string
  available: boolean
}

export type RestaurantProfile = {
  name: string
  shortName: string
  whatsappNumber: string
  location: string
  headline: string
  description: string
  fulfillmentModes: FulfillmentMode[]
}

export const restaurant: RestaurantProfile = {
  name: 'Asadero El Dorado',
  shortName: 'El Dorado',
  whatsappNumber: '573001112233',
  location: 'Demo CartaMago',
  headline: 'Pollo asado listo para pedir',
  description:
    'Arma tu pedido desde la mesa, para recoger o para domicilio. Lo enviamos ordenado por WhatsApp.',
  fulfillmentModes: ['pickup', 'delivery', 'table'],
}

export const categories: MenuCategory[] = [
  {
    id: 'pollos',
    name: 'Pollos',
    description: 'Porciones clasicas recien salidas del asador.',
  },
  {
    id: 'combos',
    name: 'Combos',
    description: 'Opciones listas para compartir.',
  },
  {
    id: 'acompanamientos',
    name: 'Acompanamientos',
    description: 'Papas, arepas, yuca y ensaladas.',
  },
  {
    id: 'bebidas',
    name: 'Bebidas',
    description: 'Gaseosas y refrescos para completar.',
  },
]

export const menuItems: MenuItem[] = [
  {
    id: 'pollo-entero',
    categoryId: 'pollos',
    name: 'Pollo entero asado',
    description: 'Pollo entero dorado con papa salada, arepas y salsas de la casa.',
    price: 42000,
    badge: 'Mas vendido',
    available: true,
  },
  {
    id: 'medio-pollo',
    categoryId: 'pollos',
    name: 'Medio pollo',
    description: 'Media porcion con papa salada, arepa y salsas.',
    price: 24000,
    available: true,
  },
  {
    id: 'cuarto-pollo',
    categoryId: 'pollos',
    name: 'Cuarto de pollo',
    description: 'Elige pierna-pernil o pechuga. Incluye papa y arepa.',
    price: 14500,
    available: true,
  },
  {
    id: 'combo-familiar',
    categoryId: 'combos',
    name: 'Combo familiar',
    description: 'Pollo entero, papa grande, yuca, ensalada y gaseosa 1.5 L.',
    price: 62000,
    badge: 'Para 4',
    available: true,
  },
  {
    id: 'combo-dorado',
    categoryId: 'combos',
    name: 'Combo dorado',
    description: 'Medio pollo, papa francesa, ensalada y bebida personal.',
    price: 31500,
    available: true,
  },
  {
    id: 'papa-francesa',
    categoryId: 'acompanamientos',
    name: 'Papa francesa',
    description: 'Porcion crocante para compartir.',
    price: 8500,
    available: true,
  },
  {
    id: 'yuca-frita',
    categoryId: 'acompanamientos',
    name: 'Yuca frita',
    description: 'Yuca dorada con salsa de ajo.',
    price: 7500,
    available: true,
  },
  {
    id: 'ensalada',
    categoryId: 'acompanamientos',
    name: 'Ensalada fresca',
    description: 'Repollo, zanahoria y aderezo de la casa.',
    price: 6000,
    available: true,
  },
  {
    id: 'gaseosa-litro',
    categoryId: 'bebidas',
    name: 'Gaseosa 1.5 L',
    description: 'Pregunta por sabores disponibles.',
    price: 9000,
    available: true,
  },
  {
    id: 'bebida-personal',
    categoryId: 'bebidas',
    name: 'Bebida personal',
    description: 'Gaseosa, agua o jugo del dia.',
    price: 4500,
    available: true,
  },
]
