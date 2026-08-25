// Guard para dev:localdb / build:localdb.
// Evita levantar el modo local sin `.env.localdb.local` o apuntando a un host
// que no sea localhost (proteccion contra escribir en produccion).
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ENV_FILE = resolve(root, '.env.localdb.local')

let text
try {
  text = readFileSync(ENV_FILE, 'utf8')
} catch {
  console.error('Falta .env.localdb.local. Corre primero:  npm run local:setup')
  process.exit(1)
}

const line = text.split(/\r?\n/).find((l) => l.startsWith('VITE_SUPABASE_URL='))
const url = (line ?? '').slice('VITE_SUPABASE_URL='.length).trim()

if (!/127\.0\.0\.1|localhost/i.test(url)) {
  console.error(
    `VITE_SUPABASE_URL no apunta a localhost (recibido: "${url || 'vacio'}").` +
      '\nNo se levanta dev:localdb para evitar tocar datos de produccion/cloud.' +
      '\nCorre:  npm run local:setup   (escribe el .env local correcto).',
  )
  process.exit(1)
}

console.log(`localdb OK -> ${url}`)
