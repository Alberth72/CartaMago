export type InventoryItem = {
  id: string
  name: string
  unit: string
  category: string
}

export type InventoryStock = {
  id: string
  itemId: string
  quantity: number
}

export type InventoryMovement = {
  id: string
  itemId: string
  quantity: number
  movementType: string
  reason: string | null
  createdAt: string
}

export type MermaReason = 'vencimiento' | 'dano' | 'despiece' | 'robo' | 'otro'

export const MERMA_REASONS: Array<{ value: MermaReason; label: string }> = [
  { value: 'vencimiento', label: 'Vencimiento' },
  { value: 'dano', label: 'Daño' },
  { value: 'despiece', label: 'Despiece' },
  { value: 'robo', label: 'Robo' },
  { value: 'otro', label: 'Otro' },
]

export type InventoryData = {
  items: InventoryItem[]
  stock: InventoryStock[]
  movements: InventoryMovement[]
}