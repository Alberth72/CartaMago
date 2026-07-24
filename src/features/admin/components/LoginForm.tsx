import type { FormEvent } from 'react'
import { BrandMark } from '../../../components/BrandMark'

type LoginFormProps = {
  email: string
  password: string
  status: string
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function LoginForm({
  email,
  password,
  status,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: LoginFormProps) {
  return (
    <form onSubmit={onSubmit} className="mx-auto mt-8 grid max-w-md gap-3 rounded-lg border border-amber-100 bg-white p-5 shadow-md">
      <BrandMark compact title="Restaurante" subtitle="Panel del restaurante" />
      <input
        value={email}
        onChange={(event) => onEmailChange(event.target.value)}
        type="email"
        placeholder="Correo del administrador"
        className="h-11 rounded-md border border-stone-200 px-3 text-sm outline-none focus:border-red-800"
      />
      <input
        value={password}
        onChange={(event) => onPasswordChange(event.target.value)}
        type="password"
        placeholder="Contrasena"
        className="h-11 rounded-md border border-stone-200 px-3 text-sm outline-none focus:border-red-800"
      />
      <button className="h-11 rounded-md bg-red-900 text-sm font-black text-white shadow-sm hover:bg-red-950">Entrar</button>
      {status ? <p className="text-sm text-stone-600">{status}</p> : null}
    </form>
  )
}
