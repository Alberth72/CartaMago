import { Upload } from 'lucide-react'
import type { ReactNode } from 'react'

type AdminShellProps = {
  title: string
  subtitle: string
  children?: ReactNode
}

export function AdminShell({ title, subtitle, children }: AdminShellProps) {
  return (
    <main className="min-h-screen bg-[#fff8ed] text-stone-950">
      <header className="border-b border-red-950 bg-stone-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5">
          <div className="min-w-0">
            <p className="text-lg font-black text-white">{title}</p>
            <p className="text-sm font-bold text-amber-100">{subtitle}</p>
          </div>
          <a href="/" className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm font-bold">
            <Upload size={16} />
            Ver menu
          </a>
        </div>
      </header>
      {children}
    </main>
  )
}
