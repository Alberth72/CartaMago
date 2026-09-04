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
}

test('shows consolidated brand reports in the mock admin panel', async ({ page }) => {
  await login(page)
  await page.getByRole('button', { name: 'Reportes' }).click()

  await expect(page.getByText('Ventas consolidadas')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ventas por sede' })).toBeVisible()
  await expect(page.getByRole('list').getByText('Brasas & Sazon Principal')).toBeVisible()
  await expect(page.getByText('Embudo de pedidos')).toHaveCount(0)
})
