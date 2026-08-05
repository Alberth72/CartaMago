import { expect, test } from '@playwright/test'

test('shows the live kitchen display with active mock orders', async ({ page }) => {
  await page.goto('/kitchen')

  await expect(page).toHaveTitle(/cocina en vivo/i)
  await expect(page.getByRole('heading', { name: /cocina en vivo/i })).toBeVisible()
  await expect(page.getByText('Laura Torres')).toBeVisible()
  await expect(page.getByText('Andres Molina')).toBeVisible()
  await expect(page.getByText('Notas de preparacion').first()).toBeVisible()
  await expect(page.getByText(/recoge en 20 minutos/i)).toBeVisible()
  await expect(page.getByText(/activos/i)).toBeVisible()
})

test('shows the public live room display without kitchen notes', async ({ page }) => {
  await page.goto('/salon')

  await expect(page).toHaveTitle(/sala en vivo/i)
  await expect(page.getByRole('heading', { name: /pedidos en preparacion/i })).toBeVisible()
  await expect(page.getByText('Sala en vivo')).toBeVisible()
  await expect(page.getByText('Mesa 6')).toBeVisible()
  await expect(page.getByText('Listos')).toBeVisible()
  await expect(page.getByText('Notas de preparacion')).toHaveCount(0)
  await expect(page.getByText(/recoge en 20 minutos/i)).toHaveCount(0)
})

test('shows public tracking for a mock order', async ({ page }) => {
  await page.goto('/tracking/ord_demo_pending_pickup')

  await expect(page).toHaveTitle(/rastreo g_pickup/i)
  await expect(page.getByRole('heading', { name: /pedido g_pickup/i })).toBeVisible()
  await expect(page.getByText('Rastreo en vivo')).toBeVisible()
  await expect(page.getByText('Laura Torres')).toBeVisible()
  await expect(page.getByText('Progreso del pedido')).toBeVisible()
  await expect(page.getByText(/1 x 1 pollo asado al carbon/i)).toBeVisible()
})
