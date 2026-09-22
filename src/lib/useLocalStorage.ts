import { useCallback, useEffect, useRef, useState } from 'react'

const STORAGE_PREFIX = 'plasticine-tools:'

/**
 * Fired whenever a persisted value is written, so the workspace can show that
 * settings are being saved locally without every tool wiring up its own status.
 */
export const SAVED_EVENT = 'plasticine-tools:saved'

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/**
 * State that is transparently persisted to localStorage and restored on reload.
 * The value is stored as JSON so strings, numbers, booleans and objects all work.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => readStorage(key, initialValue))
  const lastWritten = useRef<string | null>(null)

  useEffect(() => {
    const serialized = JSON.stringify(value)
    try {
      window.localStorage.setItem(STORAGE_PREFIX + key, serialized)
    } catch {
      // Storage can be unavailable (private mode, quota). Ignore silently.
    }

    // The first run only mirrors the restored value, and re-writing the same
    // payload is not a save either — so neither should pulse the status.
    const previous = lastWritten.current
    lastWritten.current = serialized
    if (previous === null || previous === serialized) return
    window.dispatchEvent(new Event(SAVED_EVENT))
  }, [key, value])

  // Keep multiple tabs in sync.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_PREFIX + key || event.newValue === null) return
      try {
        setValue(JSON.parse(event.newValue) as T)
      } catch {
        // ignore malformed values from other tabs
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key])

  const reset = useCallback(() => setValue(initialValue), [initialValue])

  return [value, setValue, reset] as const
}
