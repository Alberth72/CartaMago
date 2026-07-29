import { getSupabaseClient } from '../../../services/menuRepository'
import { isE2EAdminMockEnabled } from '../../../lib/runtimeFlags'
import {
  hasMockAdminSession,
  signInMockAdmin,
  signOutMockAdmin,
  subscribeMockAdminSession,
} from './adminMockRepository'

export async function hasActiveAdminSession() {
  if (isE2EAdminMockEnabled()) {
    return hasMockAdminSession()
  }

  const { data } = await getSupabaseClient().auth.getSession()
  return Boolean(data.session)
}

export function subscribeAdminSession(onSessionChange: (isLoggedIn: boolean) => void) {
  if (isE2EAdminMockEnabled()) {
    return subscribeMockAdminSession(onSessionChange)
  }

  const { data: listener } = getSupabaseClient().auth.onAuthStateChange((_event, session) => {
    onSessionChange(Boolean(session))
  })

  return () => listener.subscription.unsubscribe()
}

export async function signInAdmin(email: string, password: string) {
  if (isE2EAdminMockEnabled()) {
    return signInMockAdmin(email, password)
  }

  const { error } = await getSupabaseClient().auth.signInWithPassword({ email, password })
  return error?.message
}

export async function signOutAdmin() {
  if (isE2EAdminMockEnabled()) {
    await signOutMockAdmin()
    return
  }

  await getSupabaseClient().auth.signOut()
}
