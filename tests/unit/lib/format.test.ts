import { describe, expect, it } from 'vitest'
import { formatCurrency, formatMenuPrice } from '../../../src/lib/format'

describe('formatCurrency', () => {
  it('matches Intl es-CO COP with no decimals', () => {
    const expected = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(26000)

    expect(formatCurrency(26000)).toBe(expected)
    expect(formatCurrency(26000)).toContain('26.000')
  })

  it('groups thousands in es-CO format', () => {
    expect(formatCurrency(52000)).toContain('52.000')
  })
})

describe('formatMenuPrice', () => {
  it('formats numeric values', () => {
    expect(formatMenuPrice(26000)).toContain('26.000')
  })

  it('returns the default fallback for null', () => {
    expect(formatMenuPrice(null)).toBe('Por confirmar')
  })

  it('uses a custom fallback when provided', () => {
    expect(formatMenuPrice(null, 'x')).toBe('x')
  })
})