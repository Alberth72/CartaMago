import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ client: null as unknown, configured: true }))

vi.mock('../../../src/services/supabaseClient', () => ({
  getSupabaseClient: () => h.client,
  getSupabaseConfig: () => ({
    url: 'x',
    anonKey: 'y',
    branchId: 'brasas-sazon',
    storageBucket: 'menu-assets',
  }),
  isSupabaseConfigured: () => h.configured,
}))

vi.mock('../../../src/lib/runtimeFlags', () => ({ isE2EAdminMockEnabled: () => false }))

import { fetchPublicMenu, getSeedMenuData, toProductRow } from '../../../src/services/menuRepository'

function builder(result: () => { data: unknown; error: unknown }) {
  const target: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'order', 'in', 'limit', 'single', 'maybeSingle', 'update', 'insert', 'upsert', 'delete']
  for (const method of methods) target[method] = () => target
  ;(target as { then: unknown }).then = (resolve: (value: unknown) => void) => {
    resolve(result())
    return undefined
  }
  return target
}

function makeClient(overrides: {
  branches?: { data: unknown; error: unknown }
  categories?: { data: unknown; error: unknown }
  products?: { data: unknown; error: unknown }
  photos?: { data: unknown; error: unknown }
}) {
  const tableResults: Record<string, () => { data: unknown; error: unknown }> = {
    branches: () => overrides.branches ?? { data: null, error: null },
    categories: () => overrides.categories ?? { data: [], error: null },
    products: () => overrides.products ?? { data: [], error: null },
    menu_photos: () => overrides.photos ?? { data: [], error: null },
  }
  return {
    from: (table: string) => builder(() => tableResults[table]?.() ?? { data: [], error: null }),
  }
}

beforeEach(() => {
  h.client = makeClient({})
  h.configured = false
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getSeedMenuData', () => {
  it('returns seed data for a known branch', () => {
    const data = getSeedMenuData('brasas-sazon')
    expect(data.branchId).toBe('brasas-sazon')
    expect(data.source).toBe('seed')
    expect(data.restaurant.name.length).toBeGreaterThan(0)
    expect(data.categories.length).toBeGreaterThan(0)
    expect(data.menuItems.length).toBeGreaterThan(0)
  })

  it('uses the configured branch when no branch id is provided', () => {
    const data = getSeedMenuData()
    expect(data.branchId).toBe('brasas-sazon')
    expect(data.source).toBe('seed')
  })

  it('throws for an unknown branch id', () => {
    expect(() => getSeedMenuData('no-existe')).toThrow(/No seed data/)
  })
})

describe('fetchPublicMenu', () => {
  it('falls back to seed when Supabase is not configured', async () => {
    h.configured = false
    const data = await fetchPublicMenu('brasas-sazon')
    expect(data.source).toBe('seed')
    expect(data.branchId).toBe('brasas-sazon')
  })

  it('maps supabase rows into MenuData and normalizes fulfillment modes', async () => {
    h.configured = true
    h.client = makeClient({
      branches: {
        data: {
          id: 'brasas-sazon',
          name: 'Brasas & Sazon',
          short_name: 'Brasas',
          whatsapp_number: '573104217941',
          location: 'Bogota',
          headline: 'Tenemos el mejor sabor',
          description: 'Asadero',
          fulfillment_modes: ['delivery', 'pickup', 'invalid_mode', 'table'],
          hero_image_url: 'hero.jpg',
          social_handle: '@brasas',
        },
        error: null,
      },
      categories: {
        data: [{ id: 'cat-1', branch_id: 'brasas-sazon', name: 'Asados', description: 'Al carbon', image_url: 'a.jpg', sort_order: 1 }],
        error: null,
      },
      products: {
        data: [
          {
            id: 'pollo-entero',
            branch_id: 'brasas-sazon',
            category_id: 'cat-1',
            name: 'Pollo entero',
            description: '1 pollo',
            price_cop: 26000,
            badge: 'Best seller',
            image_url: 'p.jpg',
            available: true,
            sort_order: 1,
          },
        ],
        error: null,
      },
      photos: {
        data: [{ id: 'ph-1', title: 'Local', image_url: 'local.jpg' }],
        error: null,
      },
    })

    const data = await fetchPublicMenu('brasas-sazon')
    expect(data.source).toBe('supabase')
    expect(data.restaurant.name).toBe('Brasas & Sazon')
    expect(data.restaurant.shortName).toBe('Brasas')
    expect(data.restaurant.fulfillmentModes).toEqual(['local_delivery', 'pickup', 'table'])
    expect(data.categories[0].name).toBe('Asados')
    expect(data.menuItems[0].id).toBe('pollo-entero')
    expect(data.menuItems[0].price).toBe(26000)
    expect(data.menuPhotos[0].title).toBe('Local')
  })

  it('falls back to seed when any supabase query errors', async () => {
    h.configured = true
    h.client = makeClient({ branches: { data: null, error: { message: 'boom' } } })

    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const data = await fetchPublicMenu('brasas-sazon')
    expect(data.source).toBe('seed')
    expect(consoleWarn).toHaveBeenCalled()
  })
})

describe('toProductRow', () => {
  it('maps a MenuItem into a ProductRow for the given branch', () => {
    const row = toProductRow(
      {
        id: 'pollo-entero',
        categoryId: 'cat-1',
        name: 'Pollo entero',
        description: '1 pollo',
        price: 26000,
        badge: 'Best seller',
        imageUrl: 'p.jpg',
        available: true,
      },
      'brasas-sazon',
      3,
    )

    expect(row.branch_id).toBe('brasas-sazon')
    expect(row.category_id).toBe('cat-1')
    expect(row.price_cop).toBe(26000)
    expect(row.sort_order).toBe(3)
    expect(row.available).toBe(true)
  })

  it('handles nullable fields', () => {
    const row = toProductRow(
      {
        id: 'x',
        categoryId: 'cat-1',
        name: 'X',
        description: '',
        price: null,
        badge: undefined,
        imageUrl: undefined,
        available: false,
      },
      'brasas-sazon',
    )

    expect(row.price_cop).toBeNull()
    expect(row.badge).toBeNull()
    expect(row.image_url).toBeNull()
    expect(row.available).toBe(false)
  })
})