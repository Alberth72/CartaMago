export type SupabaseApiConfig = {
  url: string | null
  anonKey: string | null
}

export function getSupabaseApiConfig(): SupabaseApiConfig {
  return {
    url: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? null,
    anonKey: process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? null,
  }
}
