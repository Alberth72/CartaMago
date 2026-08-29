#!/usr/bin/env node
// Convierte la captura cruda de page.coverage (Playwright + Chromium) en
// coverage/e2e/coverage-final.json con métricas de funciones por archivo fuente.
//
// Formato de salida:
//   { "<ruta relativa>": { funcsTotal, funcsCovered, entries } }
//
// Uso: node scripts/coverage-e2e-convert.mjs
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'

const root = process.cwd()
const rawDir = join(root, 'coverage', 'e2e', 'raw')
const outFile = join(root, 'coverage', 'e2e', 'coverage-final.json')

function collectEntries() {
  if (!existsSync(rawDir)) return []
  return readdirSync(rawDir)
    .filter((file) => file.endsWith('.json'))
    .flatMap((file) => {
      try {
        const parsed = JSON.parse(readFileSync(join(rawDir, file), 'utf8'))
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    })
}

function urlToRelPath(rawUrl) {
  try {
    const url = new URL(rawUrl)
    let pathname = decodeURIComponent(url.pathname)
    if (pathname.startsWith('/@fs/')) {
      pathname = pathname.slice('/@fs/'.length)
    }
    const srcIdx = pathname.indexOf('/src/')
    if (srcIdx >= 0) {
      pathname = pathname.slice(srcIdx + 1) // quita el slash inicial
    }

    const rel = relative(root, resolve(pathname)).split(sep).join('/')
    if (!rel.endsWith('.ts') && !rel.endsWith('.tsx')) return null
    if (!rel.startsWith('src/') && !rel.startsWith('apps/')) return null
    return rel
  } catch {
    return null
  }
}

function accumulate(perFile) {
  const entries = collectEntries()
  for (const entry of entries) {
    const rel = urlToRelPath(entry.url ?? '')
    if (!rel) continue

    const meta = perFile[rel] ?? { funcsTotal: 0, funcsCovered: 0, entries: 0, seen: new Set() }
    meta.entries += 1

    for (const fn of entry.functions ?? []) {
      const key = `${fn.functionName ?? ''}::${fn.ranges?.[0]?.startOffset ?? 0}`
      if (meta.seen.has(key)) continue
      meta.seen.add(key)
      meta.funcsTotal += 1
      if ((fn.ranges ?? []).some((range) => range.count > 0)) {
        meta.funcsCovered += 1
      }
    }

    perFile[rel] = meta
  }

  return entries.length
}

function main() {
  const perFile = {}
  const totalEntries = accumulate(perFile)

  const output = Object.fromEntries(
    Object.entries(perFile).map(([rel, meta]) => [
      rel,
      { funcsTotal: meta.funcsTotal, funcsCovered: meta.funcsCovered, entries: meta.entries },
    ]),
  )

  writeFileSync(outFile, `${JSON.stringify(output, null, 2)}\n`)
  console.log(`[coverage-e2e] Capturas procesadas: ${totalEntries}`)
  console.log(`[coverage-e2e] Archivos fuente únicos: ${Object.keys(output).length}`)
  console.log(`[coverage-e2e] Escrito: ${outFile}`)
}

main()