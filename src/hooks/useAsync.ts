import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '../lib/supabase'

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  /** Relance le chargement (après une écriture, par exemple). */
  refresh: () => void
  /** Remplace les données en local, sans aller-retour réseau. */
  patch: (next: T) => void
}

/**
 * Chargement asynchrone simple : un `loader`, des dépendances, et de quoi
 * relancer. Les réponses d'un chargement annulé sont ignorées (StrictMode,
 * changement rapide de filtre…).
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const loaderRef = useRef(loader)
  loaderRef.current = loader

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    loaderRef
      .current()
      .then((result) => {
        if (cancelled) return
        setData(result)
        setError(null)
      })
      .catch((caught: unknown) => {
        if (cancelled) return
        setError(errorMessage(caught))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  const refresh = useCallback(() => setTick((value) => value + 1), [])

  return { data, loading, error, refresh, patch: setData }
}

/** Déballe une réponse Supabase en levant l'erreur éventuelle. */
export function unwrap<T>(result: { data: T | null; error: unknown }): T {
  if (result.error) throw result.error
  return (result.data ?? []) as T
}
