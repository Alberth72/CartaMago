const env = import.meta.env as Record<string, string | undefined>

export class ApiRequestError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
  }
}

export function getApiBaseUrl() {
  const value = env.VITE_API_BASE_URL?.trim()
  return value ? value.replace(/\/+$/, '') : null
}

export function shouldFallbackToSupabase(error: unknown) {
  if (error == null) return true

  if (typeof error === 'object' && 'status' in error && typeof (error as { status?: unknown }).status === 'number') {
    const status = (error as { status: number }).status
    return status === 0 || status >= 500
  }

  return true
}

export async function postApiJson<T>(
  path: string,
  body: unknown,
  accessToken?: string | null,
): Promise<T> {
  const baseUrl = getApiBaseUrl()
  if (!baseUrl) throw new ApiRequestError('CartaMago API is not configured.', 0)

  const response = await fetch(`${baseUrl}/api/${path.replace(/^\/+/, '')}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: unknown } | null
    const message = typeof payload?.message === 'string' ? payload.message : `CartaMago API request failed (${response.status}).`
    throw new ApiRequestError(message, response.status)
  }

  return await response.json() as T
}
