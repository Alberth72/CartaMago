import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { PublicMenuApp } from '../features/menu/PublicMenuApp'

const AdminApp = lazy(() =>
  import('../features/admin/AdminApp').then((module) => ({ default: module.AdminApp })),
)

function AdminFallback() {
  return (
    <main className="min-h-screen bg-[#fff8ed] text-stone-950">
      <header className="border-b border-red-950 bg-stone-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5">
          <div className="min-w-0">
            <p className="text-lg font-black text-white">Admin</p>
            <p className="text-sm font-bold text-amber-100">Cargando panel...</p>
          </div>
        </div>
      </header>
    </main>
  )
}

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/admin"
        element={
          <Suspense fallback={<AdminFallback />}>
            <AdminApp />
          </Suspense>
        }
      />
      <Route path="*" element={<PublicMenuApp />} />
    </Routes>
  )
}
