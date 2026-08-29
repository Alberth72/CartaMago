import { chromium } from '@playwright/test'

const URL = 'http://localhost:5173/s/brasas-sazon'

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const createOrderCalls = []
  page.on('request', (req) => {
    if (req.url().includes('/functions/v1/create-order') && req.method() === 'POST') {
      createOrderCalls.push({ body: req.postData() })
    }
  })
  page.on('response', async (res) => {
    if (res.url().includes('/functions/v1/create-order') && res.request().method() === 'POST') {
      const last = createOrderCalls[createOrderCalls.length - 1]
      if (last) {
        last.status = res.status()
        last.response = await res.text().catch(() => '')
      }
    }
  })

  await page.goto(URL, { waitUntil: 'networkidle' })

  // Antes de confirmar: menu visible
  const menuVisibleBefore = await page.locator('#menu').isVisible().catch(() => false)
  const cartSummaryBefore = await page.getByTestId('cart-summary').isVisible().catch(() => false)

  await page.getByTestId('product-add-pollo-entero').click()
  await page.getByTestId('customer-name').fill('Cliente Diagnostico UX')
  await page.getByTestId('customer-phone').fill('3001234567')

  const [newPage] = await Promise.all([
    page.waitForEvent('popup', { timeout: 5000 }).catch(() => null),
    page.getByTestId('whatsapp-link').click(),
  ])
  if (newPage) await newPage.close().catch(() => {})

  // Tras confirmar
  await page.getByTestId('order-confirmation').waitFor({ state: 'visible', timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(800)

  const confirmationVisible = await page.getByTestId('order-confirmation').isVisible().catch(() => false)
  const menuVisibleAfter = await page.locator('#menu').isVisible().catch(() => false)
  const cartSummaryAfter = await page.getByTestId('cart-summary').isVisible().catch(() => false)
  const textRecibido = await page.getByText(/ya recibimos tu pedido/i).isVisible().catch(() => false)
  const postStatus = createOrderCalls[0]?.status ?? 'sin-llamada'

  console.log('=== RESULTADOS UX ===')
  console.log('menu visible ANTES:', menuVisibleBefore)
  console.log('cart-summary visible ANTES:', cartSummaryBefore)
  console.log('confirmation visible DESPUES:', confirmationVisible)
  console.log('menu visible DESPUES:', menuVisibleAfter)
  console.log('cart-summary visible DESPUES:', cartSummaryAfter)
  console.log('texto "ya recibimos tu pedido":', textRecibido)
  console.log('create-order status:', postStatus)

  await browser.close()
  process.exit(
    confirmationVisible && !menuVisibleAfter && !cartSummaryAfter && textRecibido && (postStatus === 201 || postStatus === 0 || postStatus === undefined) ? 0 : 2,
  )
}

main().catch((err) => {
  console.error('FALLO:', err)
  process.exit(3)
})