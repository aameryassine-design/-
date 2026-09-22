import { useCallback, useEffect, useMemo, useState } from 'react'
import { errorMessage, supabase } from '../lib/supabase'
import type { Session, SessionType } from '../lib/types'

interface NewSession {
  type: SessionType
  session_date: string
  label?: string | null
}

export function useSessions(types: readonly SessionType[]) {
  const typesKey = types.join('|')
  const typeList = useMemo(() => typesKey.split('|') as SessionType[], [typesKey])

  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { data, error: queryError } = await supabase
      .from('sessions')
      .select('*')
      .in('type', typeList)
      .order('session_date', { ascending: false })

    if (queryError) setError(errorMessage(queryError))
    else {
      setError(null)
      setSessions((data ?? []) as Session[])
    }
    setLoading(false)
  }, [typeList])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const create = useCallback(async (input: NewSession): Promise<Session | null> => {
    const { data, error: insertError } = await supabase
      .from('sessions')
      .insert({ ...input, label: input.label?.trim() || null })
      .select()
      .single()

    if (insertError) {
      setError(errorMessage(insertError))
      return null
    }

    const session = data as Session
    setSessions((current) =>
      [session, ...current].sort((a, b) => b.session_date.localeCompare(a.session_date)),
    )
    return session
  }, [])

  const update = useCallback(async (id: string, patch: Partial<Session>) => {
    setSessions((current) =>
      current.map((session) => (session.id === id ? { ...session, ...patch } : session)),
    )
    const { error: updateError } = await supabase.from('sessions').update(patch).eq('id', id)
    if (updateError) {
      setError(errorMessage(updateError))
      void refresh()
    }
  }, [refresh])

  const remove = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase.from('sessions').delete().eq('id', id)
    if (deleteError) {
      setError(errorMessage(deleteError))
      return false
    }
    setSessions((current) => current.filter((session) => session.id !== id))
    return true
  }, [])

  return { sessions, loading, error, refresh, create, update, remove }
}
