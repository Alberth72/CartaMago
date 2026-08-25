import { describe, expect, it } from 'vitest'
import { slugify } from '../../../src/lib/slug'

describe('slugify', () => {
  it('lowercases and strips accents', () => {
    expect(slugify('Pollo Asado')).toBe('pollo-asado')
    expect(slugify('Brasas & Sazón')).toBe('brasas-sazon')
  })

  it('replaces non-alphanumeric runs with a single dash', () => {
    expect(slugify('Café   Menu!')).toBe('cafe-menu')
  })

  it('strips leading and trailing dashes', () => {
    expect(slugify('  pollo  ')).toBe('pollo')
    expect(slugify('--pollo--')).toBe('pollo')
  })
})