export type SupabaseApiConfig = {
  url: string | null
  anonKey: string | null
}

function normalizeOptionalEnv(value: string | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed && trimmed !== 'undefined' ? trimmed : null
}

export function getSupabaseApiConfig(): SupabaseApiConfig {
  return {
    url: normalizeOptionalEnv(process.env.SUPABASE_URL) ?? normalizeOptionalEnv(process.env.VITE_SUPABASE_URL),
    anonKey: normalizeOptionalEnv(process.env.SUPABASE_ANON_KEY) ?? normalizeOptionalEnv(process.env.VITE_SUPABASE_ANON_KEY),
  }
}
