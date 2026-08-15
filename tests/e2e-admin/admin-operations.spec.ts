import { expect, type Page, test } from '@playwright/test'

async function login(page: Page) {
  await page.goto('/admin')
  await page.getByPlaceholder('Correo del administrador').fill('owner@cartamago.test')
  await page.getByPlaceholder('Contrasena').fill('cartamago-e2e')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('button', { name: 'Operacion' })).toBeVisible()
}

test('runs the warehouse replenishment cycle in the mock admin panel', async ({ page }) => {
  await login(page)
  await page.getByRole('button', { name: 'Operacion' }).click()

  await expect(page.getByRole('heading', { name: 'Bodega central' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Brasas & Sazon Norte' })).toBeVisible()

  const note = `Solicitud E2E ${Date.now()}`
  await page.getByLabel('Sede').first().selectOption('brasas-sazon-norte')
  await page.getByLabel('Insumo').selectOption('carbon')
  await page.getByLabel('Cantidad').first().fill('3')
  await page.getByLabel('Nota').fill(note)
  await page.getByRole('button', { name: 'Crear solicitud' }).click()

  await expect(page.getByText('Solicitud creada correctamente.')).toBeVisible()
  await expect(page.getByText(note)).toBeVisible()

  await page.getByRole('button', { name: 'Despachar' }).first().click()
  await expect(page.getByText('Solicitud despachada desde bodega.')).toBeVisible()

  await page.getByRole('button', { name: 'Recibir en sede' }).first().click()
  await expect(page.getByText('Despacho recibido en sede.')).toBeVisible()
  await expect(page.getByText('Recibida').first()).toBeVisible()
})
