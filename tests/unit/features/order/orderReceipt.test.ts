import { describe, expect, it } from 'vitest'
import type { MenuItem, RestaurantProfile } from '../../../../src/data/restaurantSeed'
import {
  buildOrderReceipt,
  makeLocalOrderId,
  makeLocalTrackingToken,
  makeReceiptNumber,
} from '../../../../src/features/order/orderReceipt'

const restaurant: RestaurantProfile = {
  name: 'Brasas & Sazón',
  shortName: 'Brasas & Sazón',
  whatsappNumber: '573104217941',
  location: 'Asadero y Restaurante',
  headline: 'Tenemos el mejor sabor',
  description: 'Menu digital',
  fulfillmentModes: ['pickup', 'local_delivery', 'didi_food', 'table'],
  heroImage: '/client-assets/brasas-sazon/processed/product-placeholder-preparing.png',
  socialHandle: '@brasasysazon1',
}

const pollo: MenuItem = {
  id: 'pollo-entero',
  categoryId: 'pollos',
  name: '1 Pollo asado al carbon',
  description: 'Incluye papas',
  price: 26000,
  available: true,
}

describe('buildOrderReceipt', () => {
  it('construye un recibo con los totales y lineas del carrito', () => {
    const receipt = buildOrderReceipt({
      orderId: 'ord_abc123',
      trackingToken: 'tk_xyz',
      restaurant,
      cartLines: [{ item: pollo, quantity: 2, note: 'Menos carbon' }],
      total: 52000,
      customerName: 'Ana',
      fulfillmentMode: 'pickup',
      paymentMethod: 'cash',
      paymentStatus: 'pending',
      createdAt: '2026-08-27T10:00:00.000Z',
    })

    expect(receipt.businessName).toBe('Brasas & Sazón')
    expect(receipt.channelLabel).toBe('CartaMago')
    expect(receipt.fulfillmentLabel).toBe('Recoger')
    expect(receipt.paymentLabel).toBe('Efectivo')
    expect(receipt.paymentStatusLabel).toBe('Pago pendiente')
    expect(receipt.totalCop).toBe(52000)
    expect(receipt.customerName).toBe('Ana')
    expect(receipt.tableNumber).toBeNull()
    expect(receipt.items).toHaveLength(1)
    expect(receipt.items[0].productName).toBe('1 Pollo asado al carbon')
    expect(receipt.items[0].quantity).toBe(2)
    expect(receipt.items[0].lineNote).toBe('Menos carbon')
    expect(receipt.receiptNumber).toBe(makeReceiptNumber('ord_abc123'))
  })

  it('incluye el numero de mesa cuando el pedido es en mesa', () => {
    const receipt = buildOrderReceipt({
      orderId: 'ord_mesa',
      trackingToken: 'tk_mesa',
      restaurant,
      cartLines: [{ item: pollo, quantity: 1 }],
      total: 26000,
      customerName: 'Luis',
      tableNumber: '5',
      fulfillmentMode: 'table',
      paymentMethod: 'cash',
      paymentStatus: 'pending',
    })

    expect(receipt.fulfillmentLabel).toBe('Mesa')
    expect(receipt.tableNumber).toBe('5')
  })
})

describe('makeReceiptNumber / local ids', () => {
  it('construye un ticket legible en mayusculas', () => {
    expect(makeReceiptNumber('ord_a1b2')).toBe('PED-ORDA1B2')
  })

  it('genera ids locales con prefijo', () => {
    expect(makeLocalOrderId()).toMatch(/^ord_/)
    expect(makeLocalOrderId('ord')).toMatch(/^ord_/)
    expect(makeLocalTrackingToken()).toMatch(/^tk_/)
  })
})