import { expect, test } from '@playwright/test'

function decodeWhatsAppMessage(href: string) {
  const url = new URL(href)
  return decodeURIComponent(url.searchParams.get('text') ?? '').replace(/\u00a0/g, ' ')
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('builds an actionable WhatsApp order without opening WhatsApp', async ({ page }) => {
  await page.getByTestId('product-add-pollo-entero').click()
  await page.getByTestId('product-note-pollo-entero').fill('Bien dorado')
  await page.getByTestId('fulfillment-didi_food').click()
  await page.getByTestId('customer-name').fill('Cliente E2E')
  await page.getByTestId('didi-food-address').fill('Calle 123')
  await page.getByTestId('customer-note').fill('Sin cubiertos')

  const href = await page.getByTestId('whatsapp-link').getAttribute('href')
  expect(href).toBeTruthy()
  expect(href).toContain('https://wa.me/573104217941?text=')

  const message = decodeWhatsAppMessage(href!)
  expect(message).toContain('Hola, quiero hacer este pedido')
  expect(message).toMatch(/1 x 1 Pollo asado al carbon \(Bien dorado\): \$\s*26\.000/)
  expect(message).toMatch(/Total aproximado: \$\s*26\.000/)
  expect(message).toContain('Entrega: Domicilio por DiDiFood')
  expect(message).toContain('Direccion DiDiFood: Calle 123')
  expect(message).toContain('Nombre: Cliente E2E')
  expect(message).toContain('Notas: Sin cubiertos')
  expect(message.toLowerCase()).not.toContain('pedido confirmado')
})
