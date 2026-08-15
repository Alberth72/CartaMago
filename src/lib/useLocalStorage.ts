import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY_PREFIX = 'cartamago'

function readStorageValue<T>(storageKey: string, initialValue: T) {
  try {
    const item = localStorage.getItem(storageKey)
    return item ? (JSON.parse(item) as T) : initialValue
  } catch {
    return initialValue
  }
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const storageKey = `${STORAGE_KEY_PREFIX}:${key}`
  const [storedValue, setStoredValue] = useState<T>(() => readStorageValue(storageKey, initialValue))
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((current) => {
        const nextValue = typeof value === 'function' ? (value as (prev: T) => T)(current) : value
        try {
          localStorage.setItem(storageKey, JSON.stringify(nextValue))
        } catch {
          // localStorage might be full or unavailable
        }
        return nextValue
      })
    },
    [storageKey],
  )

  // Sync across tabs
  useEffect(() => {
    function handleStorageChange(event: StorageEvent) {
      if (event.key === storageKey && event.newValue) {
        try {
          setStoredValue(JSON.parse(event.newValue) as T)
        } catch {
          // ignore
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [storageKey])

  useEffect(() => {
    setStoredValue(readStorageValue(storageKey, initialValue))
  }, [initialValue, storageKey])

  return [storedValue, setValue] as const
}
