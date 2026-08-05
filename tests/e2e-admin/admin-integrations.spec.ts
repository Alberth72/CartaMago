import { expect, type Page, test } from '@playwright/test'

async function login(page: Page) {
  await page.goto('/admin')
  await page.getByPlaceholder('Correo del administrador').fill('owner@cartamago.test')
  await page.getByPlaceholder('Contrasena').fill('cartamago-e2e')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('button', { name: 'Integraciones' })).toBeVisible()
}

test('prepares the DiDi Food integration draft in the mock admin panel', async ({ page }) => {
  await login(page)
  await page.getByRole('button', { name: 'Integraciones' }).click()

  await expect(page.getByRole('heading', { name: 'DiDi Food' })).toBeVisible()
  await expect(page.getByText('No conectado')).toBeVisible()

  await page.getByLabel('ID de tienda DiDi Food').fill('didi-store-e2e')
  await page.getByLabel('Estado sandbox').selectOption('requested')
  await page.getByLabel('Notas internas').fill('Solicitud enviada por prueba E2E')
  await page.getByRole('button', { name: 'Guardar preparacion' }).click()

  await expect(page.getByText('Preparacion de DiDi Food guardada.')).toBeVisible()
  await expect(page.getByText('didi-store-e2e')).toBeVisible()
})
