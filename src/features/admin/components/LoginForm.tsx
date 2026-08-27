import type { FormEvent } from 'react'
import { Boxes, Building2, LockKeyhole, Mail, Network, ShieldCheck, Store, Warehouse } from 'lucide-react'
import type { AdminTheme } from './AdminShell'

type LoginFormProps = {
  email: string
  password: string
  status: string
  theme?: AdminTheme
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function LoginForm({
  email,
  password,
  status,
  theme = 'light',
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: LoginFormProps) {
  const isDark = theme === 'dark'

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-8 grid max-w-5xl gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className={`rounded-xl border p-5 text-white shadow-xl ${
        isDark ? 'border-amber-300/20 bg-[#0f0d0b] shadow-black/30' : 'border-stone-200 bg-stone-950 shadow-stone-950/15'
      }`}>
        <div className="flex items-start gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-amber-100 text-red-950 shadow-lg shadow-red-950/20">
            <Network size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="text-2xl font-black tracking-normal">CartaMago Operaciones</p>
            <p className="mt-1 text-sm font-bold leading-6 text-amber-100">
              Centro administrativo para sedes, bodega, caja, inventario y abastecimiento.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-white/10 p-3">
            <Building2 size={18} className="text-amber-100" aria-hidden="true" />
            <p className="mt-3 text-xs font-black uppercase text-stone-300">Cadena</p>
            <p className="mt-1 text-sm font-black text-white">Reportes y alcance</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/10 p-3">
            <Warehouse size={18} className="text-sky-200" aria-hidden="true" />
            <p className="mt-3 text-xs font-black uppercase text-stone-300">Bodega</p>
            <p className="mt-1 text-sm font-black text-white">Compras y despachos</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/10 p-3">
            <Store size={18} className="text-emerald-200" aria-hidden="true" />
            <p className="mt-3 text-xs font-black uppercase text-stone-300">Sede</p>
            <p className="mt-1 text-sm font-black text-white">Caja y operacion</p>
          </div>
        </div>

        <div className="mt-5 grid gap-2 rounded-lg border border-white/10 bg-white/5 p-3 text-xs font-bold text-stone-200">
          <p className="flex items-center gap-2">
            <Boxes size={14} className="text-amber-100" aria-hidden="true" />
            Perfiles separados para superadmin, bodega, administrador de sede y cajero.
          </p>
          <p className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-200" aria-hidden="true" />
            Cada usuario ve solo los frentes que necesita operar.
          </p>
        </div>
      </div>

      <div className={`rounded-xl border p-5 shadow-xl ${
        isDark ? 'border-stone-700 bg-[#211c18] shadow-black/25' : 'border-amber-200 bg-white shadow-amber-900/10'
      }`}>
        <div>
          <p className={`text-lg font-black ${isDark ? 'text-stone-50' : 'text-stone-950'}`}>Ingreso operativo</p>
          <p className={`mt-1 text-sm font-bold leading-5 ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
            Usa el usuario asignado a tu rol para entrar al panel correspondiente.
          </p>
        </div>

        <div className="mt-5 grid gap-3">
          <label className={`grid gap-1 text-sm font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>
            Correo
            <span className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 transition focus-within:ring-2 ${
              isDark
                ? 'border-stone-700 bg-[#15110f] focus-within:border-amber-300 focus-within:ring-amber-300/10'
                : 'border-stone-200 bg-stone-50 focus-within:border-red-800 focus-within:bg-white focus-within:ring-red-900/10'
            }`}>
              <Mail size={16} className={`shrink-0 ${isDark ? 'text-amber-200' : 'text-stone-400'}`} aria-hidden="true" />
              <input
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
                type="email"
                placeholder="Correo del administrador"
                className={`min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-stone-400 ${
                  isDark ? 'text-stone-50' : 'text-stone-950'
                }`}
              />
            </span>
          </label>

          <label className={`grid gap-1 text-sm font-bold ${isDark ? 'text-stone-300' : 'text-stone-700'}`}>
            Contrasena
            <span className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 transition focus-within:ring-2 ${
              isDark
                ? 'border-stone-700 bg-[#15110f] focus-within:border-amber-300 focus-within:ring-amber-300/10'
                : 'border-stone-200 bg-stone-50 focus-within:border-red-800 focus-within:bg-white focus-within:ring-red-900/10'
            }`}>
              <LockKeyhole size={16} className={`shrink-0 ${isDark ? 'text-amber-200' : 'text-stone-400'}`} aria-hidden="true" />
              <input
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                type="password"
                placeholder="Contrasena"
                className={`min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-stone-400 ${
                  isDark ? 'text-stone-50' : 'text-stone-950'
                }`}
              />
            </span>
          </label>
        </div>

        <button className={`mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-black shadow-lg transition hover:-translate-y-0.5 active:translate-y-0 ${
          isDark ? 'bg-amber-300 text-stone-950 shadow-amber-300/10 hover:bg-amber-200' : 'bg-red-900 text-white shadow-red-900/15 hover:bg-red-950'
        }`}>
          <ShieldCheck size={16} aria-hidden="true" />
          Ingresar al panel
        </button>

        {status ? (
          <p className={`mt-3 rounded-lg border px-3 py-2 text-sm font-bold ${
            isDark ? 'border-stone-700 bg-[#15110f] text-stone-300' : 'border-stone-200 bg-stone-50 text-stone-600'
          }`}>
            {status}
          </p>
        ) : null}
      </div>
    </form>
  )
}
