import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const env = import.meta.env as Record<string, string | undefined>

let supabaseClient: SupabaseClient | null = null

export function getSupabaseConfig() {
  return {
    url: env.VITE_SUPABASE_URL,
    anonKey: env.VITE_SUPABASE_ANON_KEY,
    branchId: env.VITE_BRANCH_ID ?? 'brasas-sazon',
    storageBucket: env.VITE_MENU_STORAGE_BUCKET ?? 'menu-assets',
  }
}

export function isSupabaseConfigured() {
  const { url, anonKey } = getSupabaseConfig()
  return Boolean(url && anonKey)
}

export function getSupabaseClient() {
  const { url, anonKey } = getSupabaseConfig()
  if (!url || !anonKey) {
    throw new Error('Supabase is not configured')
  }

  supabaseClient ??= createClient(url, anonKey)
  return supabaseClient
}