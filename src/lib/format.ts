export function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatMenuPrice(value: number | null, fallback = 'Por confirmar') {
  return value == null ? fallback : formatCurrency(value)
}
