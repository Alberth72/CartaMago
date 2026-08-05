import { expect, type Page, test } from '@playwright/test'

async function login(page: Page) {
  await page.goto('/admin')
  await page.getByPlaceholder('Correo del administrador').fill('owner@cartamago.test')
  await page.getByPlaceholder('Contrasena').fill('cartamago-e2e')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible()
}

test('validates and saves restaurant data in the mock admin panel', async ({ page }) => {
  await login(page)
  await page.getByRole('button', { name: 'Menu' }).click()

  await page.getByPlaceholder('WhatsApp: 573001234567').fill('123')
  await page.getByRole('button', { name: 'Guardar datos' }).click()
  await expect(page.getByText(/usa whatsapp en formato internacional/i)).toBeVisible()

  await page.getByPlaceholder('WhatsApp: 573001234567').fill('+57 300 123 4567')
  await page.getByRole('button', { name: 'Guardar datos' }).click()
  await expect(page.getByText(/datos del restaurante guardados/i)).toBeVisible()
  await expect(page.getByPlaceholder('WhatsApp: 573001234567')).toHaveValue('573001234567')
})

test('creates a category and product in the mock admin panel', async ({ page }) => {
  await login(page)
  await page.getByRole('button', { name: 'Menu' }).click()

  await page.getByRole('button', { name: 'Guardar producto' }).click()
  await expect(page.getByText(/nombre y categoria son obligatorios/i)).toBeVisible()

  await page.getByPlaceholder('Nueva categoria').fill('E2E Especiales')
  await page.getByRole('textbox', { name: 'Descripcion', exact: true }).fill('Categoria creada por pruebas E2E')
  await page.getByRole('button', { name: 'Crear categoria' }).click()
  await expect(page.getByRole('button', { name: /e2e especiales/i })).toBeVisible()

  await page.getByPlaceholder('Nombre del producto').fill('Producto E2E')
  await page.getByRole('combobox').selectOption('e2e-especiales')
  await page.getByPlaceholder('Descripcion corta').fill('Producto creado por la prueba E2E')
  await page.getByPlaceholder('Precio COP').fill('31000')
  await page.getByRole('button', { name: 'Guardar producto' }).click()

  await expect(page.getByText('Producto guardado.')).toBeVisible()
  await expect(page.getByText('Producto E2E').first()).toBeVisible()
  await expect(page.getByText('Imagen por defecto').first()).toBeVisible()

  await page.getByRole('button', { name: 'Eliminar' }).last().click()
  await expect(page.getByText(/eliminar producto "producto e2e"/i)).toBeVisible()
  await page.getByRole('button', { name: 'Eliminar' }).last().click()

  await expect(page.getByText('Producto eliminado.')).toBeVisible()
  await expect(page.getByText('Producto E2E')).toHaveCount(0)
})

test('filters products by the selected category in the admin panel', async ({ page }) => {
  await login(page)
  await page.getByRole('button', { name: 'Menu' }).click()

  await page.getByRole('button', { name: /bandejas/i }).click()
  await expect(page.getByText('4 productos en Bandejas')).toBeVisible()
  await expect(page.getByText('Bandeja con res')).toBeVisible()
  await expect(page.getByText('Bandeja paisa')).toBeVisible()
  await expect(page.getByText('1 Pollo asado al carbon')).toHaveCount(0)

  await page.getByRole('button', { name: 'Nuevo' }).click()
  await expect(page.getByRole('combobox')).toHaveValue('bandejas')
})
