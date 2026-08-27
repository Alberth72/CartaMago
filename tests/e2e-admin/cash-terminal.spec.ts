import { expect, test } from '@playwright/test'

test('registers a sale from a tokenized cash terminal', async ({ page }) => {
  await page.goto('/s/brasas-sazon/caja/cash_demo_001/t/cs_mock_cash_demo_001')

  await expect(page.getByRole('heading', { name: 'Caja principal' })).toBeVisible()
  await expect(page.getByText('Venta rapida')).toBeVisible()

  await page.getByRole('button', { name: /1 Pollo asado al carbon/ }).first().click()
  await page.getByRole('button', { name: /Limonada natural/ }).first().click()
  await expect(page.getByText(/52.000/)).toBeVisible()

  await page.getByRole('button', { name: 'Cobrar venta' }).click()
  await expect(page.getByText('Venta registrada correctamente.')).toBeVisible()
  await expect(page.getByText('Ultimo comprobante')).toBeVisible()
  await expect(page.getByTestId('receipt-card')).toContainText('Recibo interno')
  await expect(page.getByTestId('print-receipt')).toBeVisible()
  await expect(page.getByTestId('cash-ticket-link')).toBeVisible()

  const [ticketPage] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByTestId('cash-ticket-link').click(),
  ])
  await expect(ticketPage.getByText('Pedido no encontrado')).toHaveCount(0)
  await expect(ticketPage.getByTestId('receipt-card')).toContainText('Recibo interno')
})
