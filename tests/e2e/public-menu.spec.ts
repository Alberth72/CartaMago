import { expect, type Locator, test } from '@playwright/test'

async function expectCurrency(locator: Locator, amount: string) {
  await expect(locator).toContainText(new RegExp(`\\$\\s*${amount.replace('.', '\\.')}`))
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('loads the public menu from seed data', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /tenemos el mejor sabor/i })).toBeVisible()
  await expect(page.getByTestId('product-card-pollo-entero')).toBeVisible()
  await expect(page.getByTestId('whatsapp-disabled')).toBeDisabled()
  await expect(page.getByText(/agrega productos del menu/i)).toBeVisible()
})

test('updates cart quantity and total when products change', async ({ page, isMobile }) => {
  await page.getByTestId('product-add-pollo-entero').click()

  await expect(page.getByTestId('product-quantity-pollo-entero')).toHaveText('1')
  await expect(page.getByTestId('cart-lines')).toContainText('1 Pollo asado al carbon')
  await expectCurrency(page.getByTestId('cart-total'), '26.000')

  if (isMobile) {
    await expect(page.getByTestId('cart-summary')).toBeVisible()
  }

  await page.getByTestId('product-add-pollo-entero').click()
  await expect(page.getByTestId('product-quantity-pollo-entero')).toHaveText('2')
  await expectCurrency(page.getByTestId('cart-total'), '52.000')

  await page.getByTestId('product-remove-pollo-entero').click()
  await expect(page.getByTestId('product-quantity-pollo-entero')).toHaveText('1')
  await expectCurrency(page.getByTestId('cart-total'), '26.000')
})

test('shows fulfillment-specific fields before WhatsApp handoff', async ({ page }) => {
  await page.getByTestId('product-add-pollo-entero').click()

  await page.getByTestId('fulfillment-local_delivery').click()
  await expect(page.getByTestId('delivery-address')).toBeVisible()
  await expect(page.getByTestId('table-number')).toHaveCount(0)
  await expect(page.getByTestId('didi-food-address')).toHaveCount(0)
  await expect(page.getByTestId('payment-method-bank_transfer')).toBeVisible()
  await expect(page.getByTestId('payment-method-card_at_counter')).toHaveCount(0)

  await page.getByTestId('fulfillment-didi_food').click()
  await expect(page.getByTestId('didi-food-pending')).toBeVisible()
  await expect(page.getByTestId('delivery-address')).toHaveCount(0)
  await expect(page.getByTestId('customer-phone')).toHaveCount(0)
  await expect(page.getByTestId('table-number')).toHaveCount(0)
  await expect(page.getByTestId('payment-method-didi_food')).toBeVisible()

  await page.getByTestId('fulfillment-table').click()
  await expect(page.getByTestId('table-number')).toBeVisible()
  await expect(page.getByTestId('delivery-address')).toHaveCount(0)
  await expect(page.getByTestId('didi-food-address')).toHaveCount(0)
  await expect(page.getByTestId('payment-method-card_at_table')).toBeVisible()

  await page.getByTestId('fulfillment-pickup').click()
  await expect(page.getByTestId('delivery-address')).toHaveCount(0)
  await expect(page.getByTestId('didi-food-pending')).toHaveCount(0)
  await expect(page.getByTestId('table-number')).toHaveCount(0)
  await expect(page.getByTestId('payment-method-card_at_counter')).toBeVisible()
})

test('requires fulfillment details before enabling WhatsApp handoff', async ({ page }) => {
  await page.getByTestId('product-add-pollo-entero').click()

  await expect(page.getByTestId('whatsapp-disabled')).toBeDisabled()
  await expect(page.getByTestId('order-requirements')).toContainText('nombre de quien recoge')
  await expect(page.getByTestId('order-requirements')).toContainText('telefono para confirmar')

  await page.getByTestId('customer-name').fill('Cliente E2E')
  await page.getByTestId('customer-phone').fill('3101234567')
  await expect(page.getByTestId('whatsapp-link')).toBeVisible()

  await page.getByTestId('fulfillment-local_delivery').click()
  await expect(page.getByTestId('whatsapp-disabled')).toBeDisabled()
  await expect(page.getByTestId('order-requirements')).toContainText('direccion del domicilio')

  await page.getByTestId('delivery-address').fill('Calle 123')
  await expect(page.getByTestId('whatsapp-link')).toBeVisible()

  await page.getByTestId('fulfillment-didi_food').click()
  await expect(page.getByTestId('whatsapp-disabled')).toBeDisabled()
  await expect(page.getByTestId('order-requirements')).toContainText('pendiente de integracion oficial')
})
