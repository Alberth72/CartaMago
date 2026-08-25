import { useCallback, useEffect, useState } from 'react'
import { fetchBrandReports } from '../repositories/adminReportsRepository'
import type { BrandReports } from '../reportsTypes'

export function useAdminReports() {
  const [data, setData] = useState<BrandReports | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [status, setStatus] = useState('')

  const load = useCallback(async () => {
    setIsLoading(true)
    setStatus('')
    try {
      setData(await fetchBrandReports())
    } catch (error) {
      setData(null)
      setStatus(error instanceof Error ? error.message : 'No se pudieron cargar los reportes.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { data, isLoading, status, reload: load }
}