const env = import.meta.env as Record<string, string | undefined>

export function isE2EAdminMockEnabled() {
  return env.VITE_E2E_ADMIN_MOCK === 'true'
}
