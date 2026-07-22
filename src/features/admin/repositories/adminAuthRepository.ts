import { getSupabaseClient } from '../../../services/menuRepository'

export async function hasActiveAdminSession() {
  const { data } = await getSupabaseClient().auth.getSession()
  return Boolean(data.session)
}

export function subscribeAdminSession(onSessionChange: (isLoggedIn: boolean) => void) {
  const { data: listener } = getSupabaseClient().auth.onAuthStateChange((_event, session) => {
    onSessionChange(Boolean(session))
  })

  return () => listener.subscription.unsubscribe()
}

export async function signInAdmin(email: string, password: string) {
  const { error } = await getSupabaseClient().auth.signInWithPassword({ email, password })
  return error?.message
}

export async function signOutAdmin() {
  await getSupabaseClient().auth.signOut()
}
