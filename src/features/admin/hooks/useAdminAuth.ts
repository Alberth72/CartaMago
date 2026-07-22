import { useEffect, useState, type FormEvent } from 'react'
import {
  hasActiveAdminSession,
  signInAdmin,
  signOutAdmin,
  subscribeAdminSession,
} from '../repositories/adminAuthRepository'

type UseAdminAuthOptions = {
  configured: boolean
  onAuthenticated: () => void
  onSignedOut: () => void
  setStatus: (status: string) => void
}

export function useAdminAuth({ configured, onAuthenticated, onSignedOut, setStatus }: UseAdminAuthOptions) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sessionReady, setSessionReady] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    if (!configured) return

    let isMounted = true

    hasActiveAdminSession().then((hasSession) => {
      if (!isMounted) return

      setIsLoggedIn(hasSession)
      setSessionReady(true)
      if (hasSession) onAuthenticated()
    })

    const unsubscribe = subscribeAdminSession((hasSession) => {
      setIsLoggedIn(hasSession)
      setSessionReady(true)
      if (hasSession) onAuthenticated()
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [configured, onAuthenticated])

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('Ingresando...')
    const errorMessage = await signInAdmin(email, password)
    setStatus(errorMessage ?? 'Sesion iniciada.')
  }

  async function logout() {
    await signOutAdmin()
    setIsLoggedIn(false)
    onSignedOut()
  }

  return {
    email,
    password,
    sessionReady,
    isLoggedIn,
    setEmail,
    setPassword,
    login,
    logout,
  }
}
