import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import { PublicMenuApp } from '../features/menu/PublicMenuApp'

const AdminApp = lazy(() =>
  import('../features/admin/AdminApp').then((module) => ({ default: module.AdminApp })),
)
const OrderTrackingPage = lazy(() =>
  import('../features/tracking/OrderTrackingPage').then((module) => ({ default: module.OrderTrackingPage })),
)
const KitchenDisplayPage = lazy(() =>
  import('../features/tracking/KitchenDisplayPage').then((module) => ({ default: module.KitchenDisplayPage })),
)
const LiveRoomDisplayPage = lazy(() =>
  import('../features/tracking/LiveRoomDisplayPage').then((module) => ({ default: module.LiveRoomDisplayPage })),
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
      <Route
        path="/tracking/:orderId"
        element={
          <Suspense fallback={<AdminFallback />}>
            <OrderTrackingPage />
          </Suspense>
        }
      />
      <Route
        path="/s/:branchId/tracking/:orderId"
        element={
          <Suspense fallback={<AdminFallback />}>
            <OrderTrackingPage />
          </Suspense>
        }
      />
      <Route
        path="/kitchen"
        element={
          <Suspense fallback={<AdminFallback />}>
            <KitchenDisplayPage />
          </Suspense>
        }
      />
      <Route
        path="/s/:branchId/kitchen"
        element={
          <Suspense fallback={<AdminFallback />}>
            <KitchenDisplayPage />
          </Suspense>
        }
      />
      <Route
        path="/salon"
        element={
          <Suspense fallback={<AdminFallback />}>
            <LiveRoomDisplayPage />
          </Suspense>
        }
      />
      <Route
        path="/s/:branchId/salon"
        element={
          <Suspense fallback={<AdminFallback />}>
            <LiveRoomDisplayPage />
          </Suspense>
        }
      />
      <Route path="/s/:branchId" element={<PublicMenuApp />} />
      <Route path="*" element={<PublicMenuApp />} />
    </Routes>
  )
}
