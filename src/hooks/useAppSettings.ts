import { useCallback, useEffect, useState } from 'react'
import { errorMessage, supabase } from '../lib/supabase'
import type { AppSettings } from '../lib/types'

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchErr } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle()

      if (fetchErr) {
        setError(errorMessage(fetchErr))
      } else if (data) {
        setSettings(data as AppSettings)
      } else {
        // Valeur par défaut si la table n'a pas encore la ligne
        setSettings({
          id: 1,
          auto_approve_members: true,
          updated_at: new Date().toISOString(),
          updated_by: null,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchSettings()
  }, [fetchSettings])

  const setAutoApprove = useCallback(
    async (enabled: boolean): Promise<boolean> => {
      setUpdating(true)
      const prev = settings
      // Mise à jour optimiste
      setSettings((current) => (current ? { ...current, auto_approve_members: enabled } : null))

      try {
        const { error: upsertErr } = await supabase
          .from('app_settings')
          .upsert({
            id: 1,
            auto_approve_members: enabled,
            updated_at: new Date().toISOString(),
          })

        if (upsertErr) {
          setSettings(prev)
          setError(errorMessage(upsertErr))
          return false
        }
        return true
      } catch (err) {
        setSettings(prev)
        setError(err instanceof Error ? err.message : String(err))
        return false
      } finally {
        setUpdating(false)
      }
    },
    [settings],
  )

  return {
    settings,
    loading,
    error,
    updating,
    setAutoApprove,
    refresh: fetchSettings,
  }
}
