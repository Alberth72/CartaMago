export type FulfillmentMode = 'pickup' | 'local_delivery' | 'didi_food' | 'table'

export type MenuCategory = {
  id: string
  name: string
  description: string
  image?: string
}

export type MenuItem = {
  id: string
  categoryId: string
  name: string
  description: string
  price: number | null
  priceNote?: string
  badge?: string
  imageUrl?: string
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
  heroImage: string
  socialHandle: string
}

export type MenuPhoto = {
  id: string
  title: string
  image: string
}

export type RestaurantSeed = {
  id: string
  restaurant: RestaurantProfile
  categories: MenuCategory[]
  menuItems: MenuItem[]
  menuPhotos: MenuPhoto[]
}

export const defaultSeed: RestaurantSeed = {
  id: 'brasas-sazon',
  restaurant: {
    name: 'Brasas & Sazón',
    shortName: 'Brasas & Sazón',
    whatsappNumber: '573104217941',
    location: 'Asadero y Restaurante',
    headline: 'Tenemos el mejor sabor',
    description:
      'Menu digital para armar pedidos de pollo, asados, bandejas, sopas, bebidas y adiciones por WhatsApp.',
    fulfillmentModes: ['pickup', 'local_delivery', 'didi_food', 'table'],
    heroImage: '/client-assets/brasas-sazon/processed/hero-brasas-sazon.jpg',
    socialHandle: '@brasasysazon1',
  },
  categories: [
    {
      id: 'pollos',
      name: 'Pollo',
      description: 'Pollo asado al carbon o apanado.',
      image: '/client-assets/brasas-sazon/processed/pollo.jpg',
    },
    {
      id: 'asados',
      name: 'Asados',
      description: 'Carnes de 300 gr con papas, arepa, queso y ensalada dulce.',
      image: '/client-assets/brasas-sazon/processed/asados.jpg',
    },
    {
      id: 'bandejas',
      name: 'Bandejas',
      description: 'Bandejas con sopa, arroz, frijol, maduro, huevo, ensalada y bebida.',
      image: '/client-assets/brasas-sazon/processed/bandejas.jpg',
    },
    {
      id: 'tipicos',
      name: 'Tipicos',
      description: 'Mondongo, sancocho, pescados y picada.',
      image: '/client-assets/brasas-sazon/processed/tipicos.jpg',
    },
    {
      id: 'sopas',
      name: 'Sopas',
      description: 'Sopas y consomes con arepa.',
      image: '/client-assets/brasas-sazon/processed/sopas.jpg',
    },
    {
      id: 'infantil',
      name: 'Infantil',
      description: 'Opciones pequenas y jugos.',
      image: '/client-assets/brasas-sazon/processed/infantil-jugos.jpg',
    },
    {
      id: 'bebidas',
      name: 'Bebidas',
      description: 'Limonadas, jugos y gaseosas.',
      image: '/client-assets/brasas-sazon/processed/bebidas-adiciones.jpg',
    },
    {
      id: 'adiciones',
      name: 'Adiciones',
      description: 'Acompanamientos y extras.',
      image: '/client-assets/brasas-sazon/processed/bebidas-adiciones.jpg',
    },
  ],
  menuItems: [
    { id: 'pollo-entero', categoryId: 'pollos', name: '1 Pollo asado al carbon', description: 'Incluye 4 arepas, 4 papas y maduro.', price: 26000, badge: 'Especialidad', available: true },
    { id: 'medio-asado', categoryId: 'pollos', name: '1/2 asado', description: 'Media porcion de pollo asado al carbon.', price: 26000, available: true },
    { id: 'cuarto-asado', categoryId: 'pollos', name: '1/4 asado', description: 'Cuarto de pollo asado al carbon.', price: 26000, available: true },
    { id: 'pollo-apanado', categoryId: 'pollos', name: '1 Pollo apanado', description: 'Incluye 4 arepas, 4 papas y maduro.', price: 26000, available: true },
    { id: 'combo-pollo', categoryId: 'pollos', name: 'Pollo en combo', description: 'Pollo asado al carbon o apanado con 4 arepas, 4 papas, maduro y gaseosa litro.', price: 26000, badge: 'Combo', available: true },
    { id: 'churrasco', categoryId: 'asados', name: 'Churrasco 300 gr', description: 'Con papa a la francesa, arepa, queso y ensalada dulce.', price: 26000, available: true },
    { id: 'lomo-cerdo', categoryId: 'asados', name: 'Lomo de cerdo 300 gr', description: 'Con papa a la francesa, arepa, queso y ensalada dulce.', price: 26000, available: true },
    { id: 'punta-anca', categoryId: 'asados', name: 'Punta de anca 300 gr', description: 'Con papa a la francesa, arepa, queso y ensalada dulce.', price: 26000, available: true },
    { id: 'filete-pollo', categoryId: 'asados', name: 'Filete de pollo 300 gr', description: 'Con papa a la francesa, arepa, queso y ensalada dulce.', price: 26000, available: true },
    { id: 'chuzo-pollo', categoryId: 'asados', name: 'Chuzo de pollo 300 gr', description: 'Con papa a la francesa, arepa, queso y ensalada dulce.', price: 26000, available: true },
    { id: 'bandeja-res', categoryId: 'bandejas', name: 'Bandeja con res', description: 'Con sopa, arroz, frijol, maduro, huevo, ensalada, jugo o limonada.', price: 26000, available: true },
    { id: 'bandeja-pollo', categoryId: 'bandejas', name: 'Bandeja con pollo', description: 'Con sopa, arroz, frijol, maduro, huevo, ensalada, jugo o limonada.', price: 26000, available: true },
    { id: 'bandeja-cerdo', categoryId: 'bandejas', name: 'Bandeja con cerdo', description: 'Con sopa, arroz, frijol, maduro, huevo, ensalada, jugo o limonada.', price: 26000, available: true },
    { id: 'bandeja-paisa', categoryId: 'bandejas', name: 'Bandeja paisa', description: 'Con frijol, arroz, huevo, arepa, maduro, ensalada, aguacate, chicharron, morcilla y chorizo.', price: 26000, badge: 'Completa', available: true },
    { id: 'mondongo', categoryId: 'tipicos', name: 'Mondongo', description: 'Con porcion de arroz, arepa, aguacate y ensalada.', price: 26000, available: true },
    { id: 'sancocho', categoryId: 'tipicos', name: 'Sancocho', description: 'Con porcion de arroz, arepa, aguacate y ensalada.', price: 26000, available: true },
    { id: 'tilapia', categoryId: 'tipicos', name: 'Tilapia', description: 'Plato tipico con arroz, frijol, ensalada y acompanamientos.', price: 26000, available: true },
    { id: 'picada', categoryId: 'tipicos', name: 'Picada', description: 'Res, cerdo, pollo, chicharron, chorizo, arepas, papas y ensalada.', price: 26000, available: true },
    { id: 'sopa-pollo', categoryId: 'sopas', name: 'Sopa de pollo', description: 'Sopa o consome con arepa. Grande o pequena.', price: 26000, available: true },
    { id: 'sopa-frijol', categoryId: 'sopas', name: 'Sopa de frijol', description: 'Sopa con arepa. Grande o pequena.', price: 26000, available: true },
    { id: 'salchipapas', categoryId: 'infantil', name: 'Salchipapas', description: 'Menu infantil con papas y salchicha.', price: 26000, available: true },
    { id: 'nuggets-pollo', categoryId: 'infantil', name: 'Nuggets de pollo', description: 'Menu infantil con nuggets y papas.', price: 26000, available: true },
    { id: 'jugo-agua', categoryId: 'bebidas', name: 'Jugo en agua', description: 'Sabores: fresa, mora, mango, maracuya y guanabana.', price: 26000, available: true },
    { id: 'jugo-leche', categoryId: 'bebidas', name: 'Jugo en leche', description: 'Sabores: fresa, mora, mango, maracuya y guanabana.', price: 26000, available: true },
    { id: 'limonada-natural', categoryId: 'bebidas', name: 'Limonada natural', description: 'Limonada de la casa.', price: 26000, available: true },
    { id: 'soda-michelada', categoryId: 'bebidas', name: 'Soda michelada', description: 'Bebida refrescante preparada.', price: 26000, available: true },
    { id: 'maduro-entero', categoryId: 'adiciones', name: 'Maduro entero', description: 'Adicion para acompanar el pedido.', price: 26000, available: true },
    { id: 'papas-francesa', categoryId: 'adiciones', name: 'Papas a la francesa', description: 'Porcion de papas a la francesa.', price: 26000, available: true },
    { id: 'arepa-quesito', categoryId: 'adiciones', name: 'Arepa con quesito', description: 'Adicion para acompanar el pedido.', price: 26000, available: true },
    { id: 'para-llevar', categoryId: 'adiciones', name: 'Para llevar', description: 'Empaque para llevar. En el menu fisico aparece con $500 adicionales.', price: 26000, available: true },
    { id: 'ensalada-dulce', categoryId: 'adiciones', name: 'Ensalada dulce', description: 'Adicion para acompanar el pedido.', price: 26000, available: true },
  ],
  menuPhotos: [
    { id: 'cover', title: 'Portada', image: '/client-assets/brasas-sazon/processed/menu-cover.jpg' },
    { id: 'pollo', title: 'Pollo', image: '/client-assets/brasas-sazon/processed/pollo.jpg' },
    { id: 'asados', title: 'Asados', image: '/client-assets/brasas-sazon/processed/asados.jpg' },
    { id: 'bandejas', title: 'Bandejas', image: '/client-assets/brasas-sazon/processed/bandejas.jpg' },
    { id: 'tipicos', title: 'Tipicos', image: '/client-assets/brasas-sazon/processed/tipicos.jpg' },
    { id: 'sopas', title: 'Sopas', image: '/client-assets/brasas-sazon/processed/sopas.jpg' },
    { id: 'bebidas-adiciones', title: 'Bebidas y adiciones', image: '/client-assets/brasas-sazon/processed/bebidas-adiciones.jpg' },
  ],
}

const seedRegistry = new Map<string, RestaurantSeed>([
  ['brasas-sazon', defaultSeed],
])

export function getSeedById(id: string): RestaurantSeed | undefined {
  return seedRegistry.get(id)
}

export function registerSeed(id: string, seed: RestaurantSeed) {
  seedRegistry.set(id, seed)
}

export function getRegisteredSeeds(): string[] {
  return Array.from(seedRegistry.keys())
}
