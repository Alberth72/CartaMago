import { createClient } from '@supabase/supabase-js'

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ADMIN_EMAIL', 'ADMIN_PASSWORD']
const missing = required.filter((key) => !process.env[key])

if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(', ')}`)
  process.exit(1)
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const { data, error } = await supabase.auth.admin.createUser({
  email: process.env.ADMIN_EMAIL,
  password: process.env.ADMIN_PASSWORD,
  email_confirm: true,
  user_metadata: {
    role: 'restaurant_owner',
    restaurant_id: process.env.VITE_RESTAURANT_ID ?? 'brasas-sazon',
  },
})

if (error) {
  console.error(error.message)
  process.exit(1)
}

console.log(`Admin user ready: ${data.user.email}`)
