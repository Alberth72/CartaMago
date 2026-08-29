import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
  vi.restoreAllMocks()
})

describe('supabase-rpc.service', () => {
  it('throws ServiceUnavailableException when the API is not configured', async () => {
    vi.stubEnv('SUPABASE_URL', undefined)
    vi.stubEnv('SUPABASE_ANON_KEY', undefined)
    vi.stubEnv('VITE_SUPABASE_URL', undefined)
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', undefined)

    const { SupabaseRpcService } = await import('../../../apps/api/src/supabase/supabase-rpc.service')
    const service = new SupabaseRpcService()
    await expect(service.call('fn', {})).rejects.toThrow('Supabase API is not configured')
  })

  it('calls the RPC and returns data, forwarding the authorization header', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { ok: true }, error: null })
    const createClient = vi.fn().mockReturnValue({ rpc })
    vi.doMock('@supabase/supabase-js', () => ({ createClient }))

    vi.stubEnv('SUPABASE_URL', 'https://api.supabase.co')
    vi.stubEnv('SUPABASE_ANON_KEY', 'api-key')

    const { SupabaseRpcService } = await import('../../../apps/api/src/supabase/supabase-rpc.service')
    const service = new SupabaseRpcService()

    await expect(service.call('my_fn', { p_a: 1 }, 'Bearer abc')).resolves.toEqual({ ok: true })
    expect(createClient).toHaveBeenCalledWith('https://api.supabase.co', 'api-key', expect.objectContaining({
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: 'Bearer abc' } },
    }))
    expect(rpc).toHaveBeenCalledWith('my_fn', { p_a: 1 })

    await expect(service.call('my_fn', { p_a: 2 })).resolves.toEqual({ ok: true })
  })

  it('wraps RPC errors in BadRequestException', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } })
    vi.doMock('@supabase/supabase-js', () => ({ createClient: () => ({ rpc }) }))

    vi.stubEnv('SUPABASE_URL', 'https://api.supabase.co')
    vi.stubEnv('SUPABASE_ANON_KEY', 'api-key')

    const { SupabaseRpcService } = await import('../../../apps/api/src/supabase/supabase-rpc.service')
    const service = new SupabaseRpcService()
    await expect(service.call('my_fn', {})).rejects.toThrow('boom')
  })
})