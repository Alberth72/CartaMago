import { Bike, Package, Truck, User, type LucideIcon } from 'lucide-react'
import type { OrderStatus, OrderWithItems } from '../order/types'

export const statusLabels: Record<OrderStatus, string> = {
  pending: 'Nuevo',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

export const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-300',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
  preparing: 'bg-purple-100 text-purple-800 border-purple-300',
  ready: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  delivered: 'bg-stone-100 text-stone-500 border-stone-200',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
}

export const statusActions: Array<{ from: OrderStatus[]; to: OrderStatus; label: string; color: string }> = [
  { from: ['pending'], to: 'confirmed', label: 'Confirmar', color: 'bg-blue-600 hover:bg-blue-700' },
  { from: ['confirmed'], to: 'preparing', label: 'Preparando', color: 'bg-purple-600 hover:bg-purple-700' },
  { from: ['preparing'], to: 'ready', label: 'Listo', color: 'bg-emerald-600 hover:bg-emerald-700' },
  { from: ['pending', 'confirmed', 'preparing'], to: 'cancelled', label: 'Cancelar', color: 'bg-red-600 hover:bg-red-700' },
  { from: ['ready'], to: 'delivered', label: 'Marcar entregado', color: 'bg-stone-600 hover:bg-stone-700' },
]

export const fulfillmentIcons: Record<string, LucideIcon> = {
  pickup: Package,
  delivery: Truck,
  local_delivery: Truck,
  didi_food: Bike,
  table: User,
}

export const fulfillmentLabels: Record<string, string> = {
  pickup: 'Recoger',
  delivery: 'Domicilio local',
  local_delivery: 'Domicilio local',
  didi_food: 'DiDiFood',
  table: 'Mesa',
}

export function getNextActions(status: OrderStatus) {
  return statusActions.filter((action) => action.from.includes(status))
}

export function getElapsedMinutes(value: string) {
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return 0

  return Math.max(0, Math.floor((Date.now() - timestamp) / 60000))
}

export function formatElapsedTime(value: string) {
  const minutes = getElapsedMinutes(value)
  if (minutes < 1) return 'Ahora'
  if (minutes < 60) return `${minutes} min`

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

export function getOrderAgeColor(order: OrderWithItems) {
  if (order.status === 'delivered' || order.status === 'cancelled') {
    return 'bg-stone-100 text-stone-500 border-stone-200'
  }

  const minutes = getElapsedMinutes(order.created_at)
  if (minutes >= 30) return 'bg-red-100 text-red-800 border-red-300'
  if (minutes >= 15) return 'bg-amber-100 text-amber-800 border-amber-300'
  return 'bg-emerald-100 text-emerald-800 border-emerald-300'
}

export function getDeliveryConfirmationCopy(order: OrderWithItems) {
  if (order.status === 'delivered') {
    return 'Este pedido ya fue cerrado como entregado.'
  }

  switch (order.fulfillment_mode) {
    case 'pickup':
      return 'Entregado se marca cuando caja o mostrador entrega el pedido al cliente.'
    case 'local_delivery':
    case 'delivery':
      return 'Entregado se marca cuando el mensajero del local confirma la entrega.'
    case 'didi_food':
      return 'Entregado debe venir de DiDiFood cuando tengamos webhook; por ahora se marca manualmente al confirmar en el panel de DiDiFood o con el repartidor.'
    case 'table':
      return 'Entregado se marca cuando cocina o mesero sirve el pedido en la mesa.'
    default:
      return 'Entregado se marca cuando el responsable operativo confirme que el cliente recibio el pedido.'
  }
}
