import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Page } from '@playwright/test'

type JsRange = { startOffset: number; endOffset: number; count: number }
type JsFunctionCoverage = { functionName: string; isBlockCoverage: boolean; ranges: JsRange[] }
type JsCoverageEntry = { url: string; scriptId: string; source?: string; functions: JsFunctionCoverage[] }

const rawDir = join(process.cwd(), 'coverage', 'e2e', 'raw')

/**
 * Inicia la captura de cobertura JS (chromium only). Llamar en beforeEach del spec.
 * resetOnNavigation: false mantiene la cobertura acumulada mientras el test navega.
 */
export async function startCoverage(page: Page) {
  await page.coverage.startJSCoverage({ resetOnNavigation: false })
}

/**
 * Detiene la captura y guarda solo los módulos propios (src/ o @fs/) en
 * coverage/e2e/raw/<label>.json. Llamar en afterEach del spec.
 */
export async function saveCoverage(page: Page, label: string) {
  if (!page.coverage) return
  const entries = (await page.coverage.stopJSCoverage().catch(() => [])) as JsCoverageEntry[]
  const own = entries.filter((entry) => {
    const url = entry.url ?? ''
    return url.includes('/src/') || url.includes('/@fs/')
  })
  if (own.length === 0) return
  mkdirSync(rawDir, { recursive: true })
  const fileName = join(rawDir, `${label.replace(/[^a-z0-9_-]/gi, '_').slice(0, 90)}.json`)
  writeFileSync(fileName, JSON.stringify(own, null, 2))
}