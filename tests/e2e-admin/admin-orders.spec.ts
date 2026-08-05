import { expect, type Page, test } from '@playwright/test'

async function login(page: Page) {
  await page.goto('/admin')
  await page.getByPlaceholder('Correo del administrador').fill('owner@cartamago.test')
  await page.getByPlaceholder('Contrasena').fill('cartamago-e2e')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('button', { name: 'Pedidos' })).toBeVisible()
}

test('loads mock orders and updates an order status', async ({ page }) => {
  await login(page)

  await expect(page.getByText('Laura Torres')).toBeVisible()
  await expect(page.getByText('Andres Molina')).toBeVisible()
  await expect(page.getByText('Mesa 6')).toBeVisible()

  await page.getByText('Laura Torres').click()
  const modal = page.getByTestId('order-detail-modal')
  await expect(modal.getByText('Detalle del pedido')).toBeVisible()
  await expect(modal.getByText('Nuevo')).toBeVisible()
  await expect(modal.getByText('3104217941', { exact: true })).toBeVisible()
  await expect(modal.getByText('Notificacion al cliente')).toBeVisible()

  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect(modal.getByText('Confirmado', { exact: true })).toBeVisible()
})
