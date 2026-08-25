// Orquesta el arranque local con datos de prueba (Supabase local en Docker).
// Uso:
//   npm run local:setup              -> start + db reset + seed + sim + 4 usuarios por rol + .env.localdb.local
//   npm run local:reset -- skip      -> igual pero asume Docker/Supabase ya levantado (apaga el comando manual)
//   node scripts/setup-local.mjs     -> idem local:setup
//   node scripts/setup-local.mjs --skip-start
//
// Variables opcionales (env):
//   ADMIN_PASSWORD=Cambiar-esta-clave-123
//   SUPERADMIN_EMAIL / WAREHOUSE_EMAIL / BRANCH_EMAIL / CASHIER_EMAIL
//   VITE_BRANCH_ID=brasas-sazon

import { execSync, spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHmac } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SIM_SQL = resolve(root, 'supabase/dev/production-orders-simulation.sql')
const ENV_FILE = resolve(root, '.env.localdb.local')

const SKIP_START = process.argv.includes('--skip-start')
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'Cambiar-esta-clave-123'
const BRANCH_ID = process.env.VITE_BRANCH_ID ?? 'brasas-sazon'

const SUPABASE_URL = 'http://127.0.0.1:54321'
const BRAND_ID = 'brasas-sazon-brand'
const WAREHOUSE_ID = 'brasas-central'
const MAIN_BRANCH = 'brasas-sazon'
const NORTH_BRANCH = 'brasas-sazon-norte'

const USERS = [
  { email: process.env.SUPERADMIN_EMAIL ?? 'superadmin@cartamago.local', role: 'superadmin', member: { id: 'mb_superadmin', brand_id: BRAND_ID, warehouse_id: null, branch_id: null } },
  { email: process.env.WAREHOUSE_EMAIL ?? 'warehouse@cartamago.local', role: 'warehouse_admin', member: { id: 'mb_warehouse', brand_id: BRAND_ID, warehouse_id: WAREHOUSE_ID, branch_id: null } },
  { email: process.env.BRANCH_EMAIL ?? 'branch@cartamago.local', role: 'branch_admin', member: { id: 'mb_branch', brand_id: null, warehouse_id: WAREHOUSE_ID, branch_id: MAIN_BRANCH } },
  { email: process.env.CASHIER_EMAIL ?? 'cashier@cartamago.local', role: 'cashier', member: { id: 'mb_cashier', brand_id: null, warehouse_id: WAREHOUSE_ID, branch_id: NORTH_BRANCH } },
]

function run(cmd) {
  execSync(cmd, { stdio: 'inherit' })
}
function capture(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).toString()
}
function sqlIntoDb(sql) {
  const dbName = findDbContainer()
  if (!dbName) throw new Error('No se encontro el contenedor de base de datos Supabase. Revisa `docker ps` y que `supabase start` funciono.')
  const res = spawnSync('docker', ['exec', '-i', dbName, 'psql', '-U', 'postgres', '-d', 'postgres'], {
    input: sql,
    encoding: 'utf8',
  })
  if (res.status !== 0) throw new Error(`No se pudo ejecutar SQL en ${dbName}:\n${res.stderr}`)
}
function findDbContainer() {
  let names
  try {
    names = capture('docker ps --format "{{.Names}}"')
  } catch {
    return null
  }
  const candidates = names
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter((name) => name.toLowerCase().startsWith('supabase_db'))
    .filter((name) => !name.toLowerCase().endsWith('_shadow'))
  return candidates[0] ?? null
}
function decodeJwtRole(token) {
  try {
    const payload = token.split('.')[1]
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return typeof data.role === 'string' ? data.role : undefined
  } catch {
    return undefined
  }
}
function collectJwts(value, out = []) {
  if (typeof value === 'string') {
    if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) out.push(value)
    return out
  }
  if (value && typeof value === 'object') for (const child of Object.values(value)) collectJwts(child, out)
  return out
}
function pickKeys({ anon, serviceRole }) {
  if (anon && serviceRole) return { anon, serviceRole }
  const out = capture('npx.cmd supabase status')
  const anonMatch = /anon\s*key[^\n]*[:=]\s*(\S+)/i.exec(out)
  const roleMatch = /service[_\s-]?role\s*key[^\n]*[:=]\s*(\S+)/i.exec(out)
  return {
    anon: anon ?? (anonMatch ? anonMatch[1] : undefined),
    serviceRole: serviceRole ?? (roleMatch ? roleMatch[1] : undefined),
  }
}
function readEnvAnon() {
  try {
    const line = readFileSync(ENV_FILE, 'utf8')
      .split(/\r?\n/)
      .find((l) => l.startsWith('VITE_SUPABASE_ANON_KEY='))
    return line ? line.slice('VITE_SUPABASE_ANON_KEY='.length).trim() : undefined
  } catch {
    return undefined
  }
}
function b64url(value) {
  return Buffer.from(value).toString('base64url')
}
function signJwt(secret, claims) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = b64url(JSON.stringify({ iss: 'supabase-demo', ...claims }))
  const signature = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${signature}`
}
function mintLocalKeys() {
  // Firma local determinista: lee el secreto JWT del contenedor (auth/rest) y
  // firma los tokens anon/service_role. Sin claves hardcodeadas y sin depender
  // del formato de salida de `supabase status`.
  let names
  try {
    names = capture('docker ps --format "{{.Names}}"')
  } catch {
    return { anon: undefined, serviceRole: undefined }
  }
  const containers = names
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter((name) => /^supabase_(auth|rest)_/.test(name))
  for (const name of containers) {
    const env = name.startsWith('supabase_auth_') ? 'GOTRUE_JWT_SECRET' : 'PGRST_JWT_SECRET'
    try {
      const secret = capture(`docker exec ${name} printenv ${env}`).trim()
      if (!secret) continue
      const now = Math.floor(Date.now() / 1000)
      return {
        anon: signJwt(secret, { role: 'anon', exp: now + 3600 }),
        serviceRole: signJwt(secret, { role: 'service_role', exp: now + 3600 }),
      }
    } catch {
      // probar el siguiente contenedor
    }
  }
  return { anon: undefined, serviceRole: undefined }
}
function getApiKeys() {
  const fromEnv = {
    anon: process.env.SUPABASE_ANON_KEY,
    serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY,
  }
  let parsed
  try {
    parsed = JSON.parse(capture('npx.cmd supabase status --output json'))
  } catch {
    parsed = null
  }
  const tokens = parsed ? collectJwts(parsed) : []
  const fromStatus = pickKeys({
    anon: tokens.find((token) => decodeJwtRole(token) === 'anon'),
    serviceRole: tokens.find((token) => decodeJwtRole(token) === 'service_role'),
  })
  const fromMint = mintLocalKeys()
  const anon = fromEnv.anon ?? fromStatus.anon ?? readEnvAnon() ?? fromMint.anon
  const serviceRole = fromEnv.serviceRole ?? fromStatus.serviceRole ?? fromMint.serviceRole
  if (!anon || !serviceRole) {
    throw new Error(
      'No se pudieron resolver las claves de Supabase (anon / service_role).\n' +
        '1) Confirma que el stack este arriba: `npx.cmd supabase status`.\n' +
        '2) Si tu CLI no imprime las claves, pasalas por env y reintenta:\n' +
        '   $env:SUPABASE_ANON_KEY="<anon>"; $env:SUPABASE_SERVICE_ROLE_KEY="<service_role>"; npm run local:setup',
    )
  }
  return { anon, serviceRole }
}

// 1. Levantar el stack si hace falta (reusa contenedores ya corriendo).
// En el primer arranque en Windows los health checks de algunos sidecars
// (storage, pg_meta, studio) pueden fallar por calentamiento. Reintentamos
// una vez deteniendo y levantando de nuevo antes de rendirnos.
function startStack() {
  try {
    run('npx.cmd supabase start')
  } catch {
    console.warn('\nPrimer arranque fallo por health checks o estado Docker local. Limpio datos locales y reintento una vez...')
    try {
      run('npx.cmd supabase stop --no-backup')
    } catch {
      // noop: que no haya stack no es critico aqui
    }
    run('npx.cmd supabase start')
  }
}

if (SKIP_START) {
  console.log('\n[1/5] Reusando contenedores ya levantados (--skip-start)...')
} else {
  console.log('\n[1/5] Levantando Supabase local (Docker)...')
  startStack()
}

// 2. Esquema + migraciones + seed desde cero (datos de prueba reproducibles).
console.log('\n[2/5] Aplicando migraciones y seed...')
run('npx.cmd supabase db reset')

// 3. Pedidos simulados de produccion.
console.log('\n[3/5] Cargando pedidos simulados...')
sqlIntoDb(readFileSync(SIM_SQL, 'utf8'))

// 4. Claves y usuarios por rol.
const { anon: anonKey, serviceRole: serviceRoleKey } = getApiKeys()

console.log('\n[4/5] Creando usuarios por rol (superadmin, warehouse_admin, branch_admin, cashier)...')
const supabase = createClient(SUPABASE_URL, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function findUserId(client, email) {
  const { data, error } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw new Error(error.message)
  const found = data.users.find((user) => user.email === email)
  if (!found) throw new Error(`Usuario ${email} no encontrado.`)
  return found.id
}

for (const user of USERS) {
  const create = await supabase.auth.admin.createUser({
    email: user.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { role: user.role },
  })
  const userId = create.error ? await findUserId(supabase, user.email) : create.data.user.id
  const member = { id: user.member.id, user_id: userId, role: user.role, ...user.member }
  const upsert = await supabase.from('multibrand_members').upsert(member, { onConflict: 'id' })
  if (upsert.error) {
    throw new Error(`No se pudo asignar rol ${user.role} (${user.email}): ${upsert.error.message}`)
  }
}

// 5. Validar que cada rol pueda entrar y escribir el .env.
console.log('\n[5/5] Validando logins por rol y escribiendo .env.localdb.local...')
const anonClient = createClient(SUPABASE_URL, anonKey)
for (const user of USERS) {
  const signIn = await anonClient.auth.signInWithPassword({ email: user.email, password: PASSWORD })
  if (signIn.error) throw new Error(`Fallo el login de ${user.email}: ${signIn.error.message}`)
  const member = await supabase
    .from('multibrand_members')
    .select('role')
    .eq('user_id', signIn.data.user.id)
    .maybeSingle()
  const ok = member.data?.role === user.role
  console.log(`  ${user.email}  login OK, rol=${member.data?.role ?? '?'}  ${ok ? 'OK' : 'FALLA'}`)
  if (!ok) throw new Error(`Rol incorrecto para ${user.email}: esperado ${user.role}`)
}
writeFileSync(
  ENV_FILE,
  [
    `VITE_SUPABASE_URL=${SUPABASE_URL}`,
    `VITE_SUPABASE_ANON_KEY=${anonKey}`,
    `VITE_BRANCH_ID=${BRANCH_ID}`,
    `VITE_MENU_STORAGE_BUCKET=menu-assets`,
    '',
  ].join('\n'),
)

const roleDescription = {
  superadmin: 'toda la marca (panel completo)',
  warehouse_admin: 'bodega central: stock, compras y despachos',
  branch_admin: 'sede principal (Brasas & Sazon)',
  cashier: 'sede norte (Brasas & Sazon Norte)',
}

console.log(`
Listo. Levanta la app:

  npm run dev:localdb

Menu:  http://localhost:5173
Admin: http://localhost:5173/admin

Usuarios por rol (contrasena: ${PASSWORD}):
${USERS.map((user) => `  ${user.email}  (${user.role}) -> ${roleDescription[user.role]}`).join('\n')}
`)
