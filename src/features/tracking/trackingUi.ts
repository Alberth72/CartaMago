import { CheckCircle2, Clock, Flame, PackageCheck, ReceiptText, XCircle } from 'lucide-react'
import type { OrderStatus, OrderWithItems } from '../order/types'

export const trackingSteps: Array<{ status: OrderStatus; label: string; description: string }> = [
  { status: 'pending', label: 'Recibido', description: 'El local recibio tu pedido.' },
  { status: 'confirmed', label: 'Confirmado', description: 'El equipo valido disponibilidad.' },
  { status: 'preparing', label: 'En cocina', description: 'Tu pedido ya se esta preparando.' },
  { status: 'ready', label: 'Listo', description: 'Esta listo para entregar, servir o enviar.' },
  { status: 'delivered', label: 'Entregado', description: 'Pedido cerrado como entregado.' },
]

export const trackingStatusCopy: Record<OrderStatus, { label: string; description: string }> = {
  pending: {
    label: 'Pedido recibido',
    description: 'Estamos validando disponibilidad y tiempo de preparacion.',
  },
  confirmed: {
    label: 'Pedido confirmado',
    description: 'El equipo ya acepto tu pedido.',
  },
  preparing: {
    label: 'En preparacion',
    description: 'Cocina esta trabajando en tu pedido.',
  },
  ready: {
    label: 'Pedido listo',
    description: 'Ya puede ser servido, recogido o enviado.',
  },
  delivered: {
    label: 'Pedido entregado',
    description: 'Gracias por comprar con nosotros.',
  },
  cancelled: {
    label: 'Pedido cancelado',
    description: 'Comunicate con el local si necesitas revisar este pedido.',
  },
}

export const trackingStatusIcon = {
  pending: ReceiptText,
  confirmed: CheckCircle2,
  preparing: Flame,
  ready: PackageCheck,
  delivered: CheckCircle2,
  cancelled: XCircle,
}

export const trackingStatusTone: Record<OrderStatus, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-900',
  confirmed: 'border-blue-200 bg-blue-50 text-blue-900',
  preparing: 'border-purple-200 bg-purple-50 text-purple-900',
  ready: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  delivered: 'border-stone-200 bg-stone-50 text-stone-600',
  cancelled: 'border-red-200 bg-red-50 text-red-900',
}

export function getStepState(order: OrderWithItems, stepStatus: OrderStatus) {
  if (order.status === 'cancelled') return 'muted'

  const currentIndex = trackingSteps.findIndex((step) => step.status === order.status)
  const stepIndex = trackingSteps.findIndex((step) => step.status === stepStatus)
  if (stepIndex < currentIndex) return 'done'
  if (stepIndex === currentIndex) return 'active'
  return 'pending'
}

export function formatShortOrderId(orderId: string) {
  return orderId.replace(/^ord_/, '').slice(-8).toUpperCase()
}

export function formatLiveTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000))
  if (!Number.isFinite(minutes) || minutes < 1) return 'Ahora'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

export function isActiveKitchenOrder(order: OrderWithItems) {
  return order.status !== 'delivered' && order.status !== 'cancelled'
}

export const ClockIcon = Clock
