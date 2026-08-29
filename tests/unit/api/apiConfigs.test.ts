import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
  vi.restoreAllMocks()
})

describe('api.config', () => {
  it('uses sensible defaults when no environment is set', async () => {
    vi.stubEnv('NODE_ENV', undefined)
    vi.stubEnv('API_HOST', undefined)
    vi.stubEnv('API_PORT', undefined)
    vi.stubEnv('API_CORS_ORIGINS', undefined)

    const { getApiConfig } = await import('../../../apps/api/src/config/api.config')
    const config = getApiConfig()

    expect(config.environment).toBe('development')
    expect(config.host).toBe('127.0.0.1')
    expect(config.port).toBe(3333)
    expect(config.corsOrigins).toEqual(['http://localhost:5173', 'http://127.0.0.1:5173'])
  })

  it('parses custom values and trims CORS origins', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('API_HOST', '0.0.0.0')
    vi.stubEnv('API_PORT', '4500')
    vi.stubEnv('API_CORS_ORIGINS', 'https://a.com, https://b.com, ,')

    const { getApiConfig } = await import('../../../apps/api/src/config/api.config')
    const config = getApiConfig()

    expect(config.environment).toBe('production')
    expect(config.host).toBe('0.0.0.0')
    expect(config.port).toBe(4500)
    expect(config.corsOrigins).toEqual(['https://a.com', 'https://b.com'])
  })

  it('falls back to the default port for invalid values', async () => {
    vi.stubEnv('API_PORT', 'not-a-number')
    vi.stubEnv('API_CORS_ORIGINS', undefined)

    const { getApiConfig } = await import('../../../apps/api/src/config/api.config')
    expect(getApiConfig().port).toBe(3333)

    vi.stubEnv('API_PORT', '99999')
    const second = await import('../../../apps/api/src/config/api.config')
    expect(second.getApiConfig().port).toBe(3333)
  })
})

describe('database.config', () => {
  it('uses DATABASE_URL when present', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://db')
    vi.stubEnv('SUPABASE_DB_URL', undefined)
    vi.stubEnv('DATABASE_SSL', undefined)
    vi.stubEnv('NODE_ENV', 'development')

    const { getDatabaseConfig } = await import('../../../apps/api/src/database/database.config')
    const config = getDatabaseConfig()

    expect(config.connectionString).toBe('postgres://db')
    expect(config.ssl).toBe(false)
  })

  it('falls back to SUPABASE_DB_URL and enables SSL in production', async () => {
    vi.stubEnv('DATABASE_URL', undefined)
    vi.stubEnv('SUPABASE_DB_URL', 'postgres://supabase')
    vi.stubEnv('NODE_ENV', 'production')

    const { getDatabaseConfig } = await import('../../../apps/api/src/database/database.config')
    const config = getDatabaseConfig()

    expect(config.connectionString).toBe('postgres://supabase')
    expect(config.ssl).toBe(true)
  })

  it('returns null connection string when nothing is configured', async () => {
    vi.stubEnv('DATABASE_URL', undefined)
    vi.stubEnv('SUPABASE_DB_URL', undefined)

    const { getDatabaseConfig } = await import('../../../apps/api/src/database/database.config')
    expect(getDatabaseConfig().connectionString).toBeNull()
  })
})

describe('supabase.config', () => {
  it('prefers SUPABASE_* over VITE_* for the API', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://api.supabase.co')
    vi.stubEnv('SUPABASE_ANON_KEY', 'api-key')
    vi.stubEnv('VITE_SUPABASE_URL', 'https://vite.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'vite-key')

    const { getSupabaseApiConfig } = await import('../../../apps/api/src/supabase/supabase.config')
    expect(getSupabaseApiConfig()).toEqual({
      url: 'https://api.supabase.co',
      anonKey: 'api-key',
    })
  })

  it('reads VITE_* as fallback', async () => {
    vi.stubEnv('SUPABASE_URL', undefined)
    vi.stubEnv('SUPABASE_ANON_KEY', undefined)
    vi.stubEnv('VITE_SUPABASE_URL', 'https://vite.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'vite-key')

    const { getSupabaseApiConfig } = await import('../../../apps/api/src/supabase/supabase.config')
    expect(getSupabaseApiConfig()).toEqual({
      url: 'https://vite.supabase.co',
      anonKey: 'vite-key',
    })
  })

  it('returns nulls when nothing is configured', async () => {
    vi.stubEnv('SUPABASE_URL', undefined)
    vi.stubEnv('SUPABASE_ANON_KEY', undefined)
    vi.stubEnv('VITE_SUPABASE_URL', undefined)
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', undefined)

    const { getSupabaseApiConfig } = await import('../../../apps/api/src/supabase/supabase.config')
    expect(getSupabaseApiConfig()).toEqual({ url: null, anonKey: null })
  })
})