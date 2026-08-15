import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/admin')
})

test('shows setup guidance when Supabase is not configured', async ({ page }) => {
  await expect(page.getByText('Admin', { exact: true })).toBeVisible()
  await expect(page.getByText(/conecta supabase para activar el panel/i)).toBeVisible()
  await expect(page.getByRole('heading', { name: /admin listo para configurar/i })).toBeVisible()
  await expect(page.getByText('VITE_SUPABASE_URL=https://xxxxx.supabase.co')).toBeVisible()
  await expect(page.getByText('VITE_SUPABASE_ANON_KEY=ey...')).toBeVisible()
  await expect(page.getByText('VITE_BRANCH_ID=brasas-sazon')).toBeVisible()
})

test('links back to the public menu from the admin shell', async ({ page }) => {
  await page.getByRole('link', { name: /ver menu/i }).click()

  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: /tenemos el mejor sabor/i })).toBeVisible()
})
