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

  const supabase = getSupabaseClient()
  const { data } = await supabase.auth.getSession()
  if (!data.session) return false

  const user = await supabase.auth.getUser()
  if (user.error || !user.data.user) {
    await supabase.auth.signOut()
    return false
  }

  return true
}

export function subscribeAdminSession(onSessionChange: (isLoggedIn: boolean) => void) {
  if (isE2EAdminMockEnabled()) {
    return subscribeMockAdminSession(onSessionChange)
  }

  const supabase = getSupabaseClient()
  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!session) {
      onSessionChange(false)
      return
    }

    queueMicrotask(async () => {
      const user = await supabase.auth.getUser()
      if (user.error || !user.data.user) {
        await supabase.auth.signOut()
        onSessionChange(false)
        return
      }
      onSessionChange(true)
    })
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
