import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ client: null as unknown }))

vi.mock('../../../src/services/supabaseClient', () => ({
  getSupabaseClient: () => h.client,
  getSupabaseConfig: () => ({ url: 'x', anonKey: 'y', branchId: 'brasas-sazon', storageBucket: 'menu-assets' }),
  isSupabaseConfigured: () => true,
}))
vi.mock('../../../src/lib/runtimeFlags', () => ({ isE2EAdminMockEnabled: () => false }))

import {
  hasActiveAdminSession,
  signInAdmin,
  signOutAdmin,
} from '../../../src/features/admin/repositories/adminAuthRepository'

function makeClient(overrides: {
  session?: { data: { session: unknown }; error: unknown }
  user?: { data: { user: unknown }; error: unknown }
  signIn?: { error: unknown }
} = {}) {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue(overrides.session ?? { data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue(overrides.user ?? { data: { user: { id: 'u1' } }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue(overrides.signIn ?? { error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn(),
    },
  }
}

beforeEach(() => {
  h.client = makeClient({})
})

describe('hasActiveAdminSession', () => {
  it('is true when a valid session and user exist', async () => {
    h.client = makeClient({
      session: { data: { session: { user: { id: 'u1' } } }, error: null },
      user: { data: { user: { id: 'u1' } }, error: null },
    })

    await expect(hasActiveAdminSession()).resolves.toBe(true)
  })

  it('is false when there is no session', async () => {
    h.client = makeClient({ session: { data: { session: null }, error: null } })

    await expect(hasActiveAdminSession()).resolves.toBe(false)
  })
})

describe('signInAdmin', () => {
  it('returns the error message when credentials are invalid', async () => {
    h.client = makeClient({ signIn: { error: { message: 'Invalid login credentials' } } })

    await expect(signInAdmin('a@b.c', 'x')).resolves.toBe('Invalid login credentials')
  })

  it('resolves without error on a valid sign-in', async () => {
    h.client = makeClient({ signIn: { error: null } })

    await expect(signInAdmin('a@b.c', 'x')).resolves.toBeUndefined()
  })
})

describe('signOutAdmin', () => {
  it('calls auth signOut', async () => {
    h.client = makeClient({})

    await expect(signOutAdmin()).resolves.toBeUndefined()
  })
})