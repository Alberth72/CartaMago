import { ExternalLink, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { Helmet } from 'react-helmet-async'

type AdminShellProps = {
  title: string
  subtitle: string
  documentTitle?: string
  children?: ReactNode
}

export function AdminShell({ title, subtitle, documentTitle, children }: AdminShellProps) {
  return (
    <main className="min-h-screen bg-[#fff8ed] text-stone-950">
      <Helmet>
        <title>{documentTitle ?? `${title} | CartaMago`}</title>
      </Helmet>
      <header className="border-b border-red-950 bg-stone-950 text-white shadow-xl shadow-red-950/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-amber-100 text-red-950 shadow-lg shadow-red-950/20">
              <Sparkles size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-black text-white">{title}</p>
              <p className="text-sm font-bold leading-5 text-amber-100">{subtitle}</p>
            </div>
          </div>
          <a
            href="/"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-white/15 active:translate-y-0"
          >
            <ExternalLink size={16} aria-hidden="true" />
            Ver menu
          </a>
        </div>
      </header>
      {children}
    </main>
  )
}
