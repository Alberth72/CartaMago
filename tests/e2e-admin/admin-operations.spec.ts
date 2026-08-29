import { expect, type Page, test } from '@playwright/test'
import { saveCoverage, startCoverage } from '../e2e/coverageCapture'

test.beforeEach(async ({ page }) => {
  await startCoverage(page)
})

test.afterEach(async ({ page }, testInfo) => {
  await saveCoverage(page, testInfo.title)
})

async function login(page: Page) {
  await page.goto('/admin')
  await page.getByPlaceholder('Correo del administrador').fill('owner@cartamago.test')
  await page.getByPlaceholder('Contrasena').fill('cartamago-e2e')
  await page.getByRole('button', { name: 'Ingresar al panel' }).click()
  await expect(page.getByRole('button', { name: 'Operacion' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Caja' })).toBeVisible()
}

test('runs the warehouse replenishment cycle in the mock admin panel', async ({ page }) => {
  await login(page)

  await page.getByRole('button', { name: 'Caja' }).click()
  await expect(page.getByRole('heading', { name: 'Caja', exact: true })).toBeVisible()

  await page.getByLabel('Conteo real').fill('100000')
  await page.getByRole('button', { name: 'Cerrar caja' }).click()
  await expect(page.getByText('Caja cerrada correctamente.')).toBeVisible()

  await page.getByLabel('Nombre de caja').fill('Caja mostrador')
  await page.getByLabel('Base inicial').fill('120000')
  await page.getByRole('button', { name: 'Abrir caja' }).click()
  await expect(page.getByText('Caja abierta correctamente.')).toBeVisible()
  await expect(page.getByText('Terminal de caja')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Cajas abiertas' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Abrir terminal' })).toBeVisible()
  await expect(page.getByText(/\/s\/brasas-sazon\/caja\//)).toBeVisible()
  await expect(page.getByRole('button', { name: /1 Pollo asado al carbon/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Cobrar venta' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Operacion' }).click()
  await expect(page.getByRole('heading', { name: 'Bodega central' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Brasas & Sazon Norte' })).toBeVisible()

  const note = `Solicitud E2E ${Date.now()}`
  await page.getByLabel('Sede').first().selectOption('brasas-sazon-norte')
  await page.getByLabel('Insumo').selectOption('carbon')
  await page.getByLabel('Cantidad').first().fill('3')
  await page.getByLabel('Nota', { exact: true }).fill(note)
  await page.getByRole('button', { name: 'Crear solicitud' }).click()

  await expect(page.getByText('Solicitud creada correctamente.')).toBeVisible()
  await expect(page.getByText(note)).toBeVisible()

  const dispatchButton = page.getByRole('button', { name: 'Despachar' }).first()
  await dispatchButton.scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollBy(0, 140))
  await dispatchButton.click({ force: true })
  await expect(page.getByText('Solicitud despachada desde bodega.')).toBeVisible()

  const receiveButton = page.getByRole('button', { name: 'Recibir en sede' }).first()
  await receiveButton.scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollBy(0, 140))
  await receiveButton.click({ force: true })
  await expect(page.getByText('Despacho recibido en sede.')).toBeVisible()
  await expect(page.getByText('Recibida').first()).toBeVisible()
})
