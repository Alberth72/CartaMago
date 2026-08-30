import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
  vi.restoreAllMocks()
})

describe('apiClient', () => {
  it('returns null base URL when VITE_API_BASE_URL is empty', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const { getApiBaseUrl } = await import('../../../src/services/apiClient')
    expect(getApiBaseUrl()).toBeNull()
  })

  it('trims trailing slashes from the base URL', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com///')
    const { getApiBaseUrl } = await import('../../../src/services/apiClient')
    expect(getApiBaseUrl()).toBe('https://api.example.com')
  })

  it('decides to fallback to Supabase for network-ish errors', async () => {
    const { shouldFallbackToSupabase } = await import('../../../src/services/apiClient')

    expect(shouldFallbackToSupabase(new Error('boom'))).toBe(true)
    expect(shouldFallbackToSupabase(null)).toBe(true)

    const apiError = new Error('down')
    ;(apiError as { status: number }).status = 503
    expect(shouldFallbackToSupabase(apiError)).toBe(true)

    const badRequest = new Error('bad request')
    ;(badRequest as { status: number }).status = 400
    expect(shouldFallbackToSupabase(badRequest)).toBe(false)
  })

  it('throws ApiRequestError when the API is not configured', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const { postApiJson } = await import('../../../src/services/apiClient')
    await expect(postApiJson('/x', {})).rejects.toThrow('CartaMago API is not configured.')
  })

  it('POSTs json with the bearer token and returns parsed data', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
    const fetchStub = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ orderId: 'ord_1' }),
    })
    vi.stubGlobal('fetch', fetchStub)

    const { postApiJson } = await import('../../../src/services/apiClient')
    await expect(postApiJson('orders/status', { orderId: 'ord_1' }, 'token_1')).resolves.toEqual({
      orderId: 'ord_1',
    })

    expect(fetchStub).toHaveBeenCalledWith(
      'https://api.example.com/api/orders/status',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token_1',
        },
        body: JSON.stringify({ orderId: 'ord_1' }),
      }),
    )
  })

  it('throws ApiRequestError with the server message on non-ok responses', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      json: async () => ({ message: 'algo salio mal' }),
    }))

    const { postApiJson } = await import('../../../src/services/apiClient')
    await expect(postApiJson('/x', {})).rejects.toThrow('algo salio mal')
  })

  it('falls back to a generic message when the payload has no message', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: async () => null,
    }))

    const { postApiJson, ApiRequestError } = await import('../../../src/services/apiClient')
    await expect(postApiJson('/x', {})).rejects.toMatchObject({
      name: ApiRequestError.name,
      status: 403,
    })
  })

  it('uses the generic error message when the response body cannot be parsed', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: async () => {
        throw new Error('invalid json')
      },
    }))

    const { postApiJson } = await import('../../../src/services/apiClient')
    await expect(postApiJson('/x', {})).rejects.toMatchObject({
      message: 'CartaMago API request failed (403).',
      status: 403,
    })
  })
})