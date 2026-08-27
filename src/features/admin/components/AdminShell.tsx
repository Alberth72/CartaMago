import { Moon, Sparkles, Sun } from 'lucide-react'
import type { ReactNode } from 'react'
import { Helmet } from 'react-helmet-async'

export type AdminTheme = 'light' | 'dark'

type AdminShellProps = {
  title: string
  subtitle: string
  theme?: AdminTheme
  documentTitle?: string
  actions?: ReactNode
  children?: ReactNode
  onToggleTheme?: () => void
}

export function AdminShell({
  title,
  subtitle,
  theme = 'light',
  documentTitle,
  actions,
  children,
  onToggleTheme,
}: AdminShellProps) {
  const isDark = theme === 'dark'

  return (
    <main className={`admin-theme-${theme} min-h-screen transition-colors ${isDark ? 'bg-[#15110f] text-stone-100' : 'bg-[#fff8ed] text-stone-950'}`}>
      <Helmet>
        <title>{documentTitle ?? `${title} | CartaMago`}</title>
      </Helmet>
      <header className={`border-b text-white shadow-xl transition-colors ${
        isDark ? 'border-amber-400/20 bg-[#0f0d0b] shadow-black/30' : 'border-red-950 bg-stone-950 shadow-red-950/10'
      }`}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`grid size-11 shrink-0 place-items-center rounded-lg shadow-lg ${
              isDark ? 'bg-amber-300 text-stone-950 shadow-amber-400/10' : 'bg-amber-100 text-red-950 shadow-red-950/20'
            }`}>
              <Sparkles size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-black text-white">{title}</p>
              <p className={`text-sm font-bold leading-5 ${isDark ? 'text-stone-300' : 'text-amber-100'}`}>{subtitle}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onToggleTheme ? (
              <button
                type="button"
                onClick={onToggleTheme}
                className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-black shadow-sm transition hover:-translate-y-0.5 active:translate-y-0 ${
                  isDark
                    ? 'border-amber-300/20 bg-white/10 text-amber-100 hover:bg-white/15'
                    : 'border-white/10 bg-white/10 text-white hover:bg-white/15'
                }`}
                aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              >
                {isDark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
                {isDark ? 'Claro' : 'Oscuro'}
              </button>
            ) : null}
            {actions}
          </div>
        </div>
      </header>
      {children}
    </main>
  )
}
