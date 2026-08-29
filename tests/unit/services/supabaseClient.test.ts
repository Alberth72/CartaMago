import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
  vi.restoreAllMocks()
})

describe('runtimeFlags', () => {
  it('returns false when VITE_E2E_ADMIN_MOCK is not exactly "true"', async () => {
    vi.stubEnv('VITE_E2E_ADMIN_MOCK', undefined)
    const first = await import('../../../src/lib/runtimeFlags')
    expect(first.isE2EAdminMockEnabled()).toBe(false)
  })

  it('returns true when VITE_E2E_ADMIN_MOCK is "true"', async () => {
    vi.stubEnv('VITE_E2E_ADMIN_MOCK', 'true')
    const second = await import('../../../src/lib/runtimeFlags')
    expect(second.isE2EAdminMockEnabled()).toBe(true)
  })
})

describe('supabaseClient', () => {
  it('builds config with defaults for branch id and bucket', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon')
    vi.stubEnv('VITE_BRANCH_ID', undefined)
    vi.stubEnv('VITE_MENU_STORAGE_BUCKET', undefined)

    const { getSupabaseConfig, isSupabaseConfigured } = await import('../../../src/services/supabaseClient')
    expect(getSupabaseConfig()).toEqual({
      url: 'https://x.supabase.co',
      anonKey: 'anon',
      branchId: 'brasas-sazon',
      storageBucket: 'menu-assets',
    })
    expect(isSupabaseConfigured()).toBe(true)
  })

  it('reports not configured when url or anonKey are missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', undefined)
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon')

    const { isSupabaseConfigured } = await import('../../../src/services/supabaseClient')
    expect(isSupabaseConfigured()).toBe(false)
  })

  it('throws when requesting a client without configuration', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', undefined)
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', undefined)

    const { getSupabaseClient } = await import('../../../src/services/supabaseClient')
    expect(() => getSupabaseClient()).toThrow('Supabase is not configured')
  })

  it('creates and caches a single client when configured', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon')

    const createClient = vi.fn().mockReturnValue({ id: 'client' })
    vi.doMock('@supabase/supabase-js', () => ({ createClient }))

    const { getSupabaseClient } = await import('../../../src/services/supabaseClient')
    const first = getSupabaseClient()
    const second = getSupabaseClient()

    expect(first).toBe(second)
    expect(createClient).toHaveBeenCalledTimes(1)
    expect(createClient).toHaveBeenCalledWith('https://x.supabase.co', 'anon')
  })
})