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

  await page.getByTestId('fulfillment-didi_food').click()
  await expect(page.getByTestId('didi-food-address')).toBeVisible()
  await expect(page.getByTestId('delivery-address')).toHaveCount(0)
  await expect(page.getByTestId('table-number')).toHaveCount(0)

  await page.getByTestId('fulfillment-table').click()
  await expect(page.getByTestId('table-number')).toBeVisible()
  await expect(page.getByTestId('delivery-address')).toHaveCount(0)
  await expect(page.getByTestId('didi-food-address')).toHaveCount(0)

  await page.getByTestId('fulfillment-pickup').click()
  await expect(page.getByTestId('delivery-address')).toHaveCount(0)
  await expect(page.getByTestId('didi-food-address')).toHaveCount(0)
  await expect(page.getByTestId('table-number')).toHaveCount(0)
})
