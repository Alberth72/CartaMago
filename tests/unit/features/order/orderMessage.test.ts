import { describe, expect, it } from 'vitest'
import {
  buildWhatsAppUrl,
  type CartLine,
  type CustomerDetails,
} from '../../../../src/features/order/orderMessage'
import type { MenuItem, RestaurantProfile } from '../../../../src/data/restaurantSeed'

const restaurant = { name: 'Brasas & Sazon', whatsappNumber: '573104217941' } as unknown as RestaurantProfile

const pollo = { id: 'pollo', name: 'Pollo asado al carbon', price: 26000 } as unknown as MenuItem
const sinPrecio = { id: 'otro', name: 'Extra', price: null, priceNote: 'precio por confirmar' } as unknown as MenuItem

function details(overrides: Partial<CustomerDetails> = {}): CustomerDetails {
  return {
    name: 'Cliente',
    phone: '3101234567',
    note: 'Sin cubiertos',
    address: '',
    table: '',
    fulfillmentMode: 'pickup',
    paymentMethod: 'cash',
    ...overrides,
  }
}

function decode(href: string) {
  const url = new URL(href)
  return decodeURIComponent(url.searchParams.get('text') ?? '')
}

describe('buildWhatsAppUrl', () => {
  it('prepends the wa.me prefix and encodes the message', () => {
    const href = buildWhatsAppUrl(restaurant, [{ item: pollo, quantity: 1 }], details())

    expect(href).toContain('https://wa.me/573104217941?text=')
    const message = decode(href)
    expect(message).toContain('Hola, quiero hacer este pedido en Brasas & Sazon')
  })

  it('includes quantities, totals, fulfillment, payment, and customer data', () => {
    const message = decode(buildWhatsAppUrl(restaurant, [{ item: pollo, quantity: 2 }], details()))

    expect(message).toContain('- 2 x Pollo asado al carbon:')
    expect(message).toContain('52.000')
    expect(message).toContain('Total aproximado:')
    expect(message).toContain('Entrega: Recoger en el local')
    expect(message).toContain('Cliente recoge en el local')
    expect(message).toContain('Pago: Efectivo')
    expect(message).toContain('Nombre: Cliente')
    expect(message).toContain('Telefono: 3101234567')
    expect(message).toContain('Notas: Sin cubiertos')
    expect(message).not.toMatch(/confirmado/i)
  })

  it('uses per-line notes in the message', () => {
    const lines: CartLine[] = [{ item: pollo, quantity: 1, note: 'Bien dorado' }]
    const message = decode(buildWhatsAppUrl(restaurant, lines, details()))

    expect(message).toContain('Pollo asado al carbon (Bien dorado)')
  })

  it('falls back to priceNote when a product has no known price', () => {
    const message = decode(buildWhatsAppUrl(restaurant, [{ item: sinPrecio, quantity: 1 }], details()))

    expect(message).toContain('precio por confirmar')
    expect(message).toContain('Total:')
  })

  it('renders the delivery address for local_delivery', () => {
    const message = decode(
      buildWhatsAppUrl(
        restaurant,
        [{ item: pollo, quantity: 1 }],
        details({ fulfillmentMode: 'local_delivery', address: 'Calle 1' }),
      ),
    )

    expect(message).toContain('Domicilio con mensajeria del local')
    expect(message).toContain('Direccion domicilio local: Calle 1')
  })

  it('renders the table number for table fulfillment', () => {
    const message = decode(
      buildWhatsAppUrl(restaurant, [{ item: pollo, quantity: 1 }], details({ fulfillmentMode: 'table', table: '7' })),
    )

    expect(message).toContain('Mesa: 7')
  })
})