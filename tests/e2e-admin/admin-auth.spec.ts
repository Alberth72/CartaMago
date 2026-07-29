import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/admin')
})

test('rejects invalid credentials without opening the admin panel', async ({ page }) => {
  await page.getByPlaceholder('Correo del administrador').fill('owner@cartamago.test')
  await page.getByPlaceholder('Contrasena').fill('wrong-password')
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page.getByText('Credenciales de prueba invalidas.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pedidos' })).toHaveCount(0)
})

test('logs in with mock admin credentials and logs out from menu tab', async ({ page }) => {
  await page.getByPlaceholder('Correo del administrador').fill('owner@cartamago.test')
  await page.getByPlaceholder('Contrasena').fill('cartamago-e2e')
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page.getByRole('button', { name: 'Pedidos' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible()

  await page.getByRole('button', { name: 'Menu' }).click()
  await expect(page.getByRole('heading', { name: 'Restaurante' })).toBeVisible()

  await page.getByRole('button', { name: 'Salir' }).click()
  await expect(page.getByPlaceholder('Correo del administrador')).toBeVisible()
})
