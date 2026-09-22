import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage, supabase } from '../lib/supabase'

type Scope = Record<string, string>

interface SheetRow {
  id: string
  member_id: string
}

function stripTimestamps<T extends object>(row: T): Partial<T> {
  const { created_at: _created, updated_at: _updated, ...rest } = row as T & {
    created_at?: string
    updated_at?: string
  }
  return rest as Partial<T>
}

/**
 * Feuille de saisie « une ligne par membre » dans un périmètre donné
 * (une séance, une date, un livre…). Chaque modification est enregistrée
 * immédiatement par upsert sur `conflictColumns`.
 */
export function useMemberSheet<T extends SheetRow>(
  table: string,
  scope: Scope | null,
  conflictColumns: string,
) {
  const [rows, setRows] = useState<Record<string, T>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<string[]>([])

  const scopeKey = scope ? JSON.stringify(scope) : ''
  const rowsRef = useRef(rows)
  rowsRef.current = rows

  useEffect(() => {
    if (!scopeKey) {
      setRows({})
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    const load = async () => {
      let query = supabase.from(table).select('*')
      for (const [column, value] of Object.entries(JSON.parse(scopeKey) as Scope)) {
        query = query.eq(column, value)
      }

      const { data, error: queryError } = await query
      if (cancelled) return

      if (queryError) {
        setError(errorMessage(queryError))
      } else {
        setError(null)
        const next: Record<string, T> = {}
        for (const row of (data ?? []) as T[]) next[row.member_id] = row
        setRows(next)
      }
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [table, scopeKey])

  const save = useCallback(
    async (memberId: string, patch: Partial<T>): Promise<boolean> => {
      if (!scopeKey) return false
      const activeScope = JSON.parse(scopeKey) as Scope
      const existing = rowsRef.current[memberId]

      setPending((current) => [...current, memberId])

      const payload = {
        ...(existing ? stripTimestamps(existing) : {}),
        ...activeScope,
        member_id: memberId,
        ...patch,
      }

      const { data, error: upsertError } = await supabase
        .from(table)
        .upsert(payload, { onConflict: conflictColumns })
        .select()
        .single()

      setPending((current) => {
        const index = current.indexOf(memberId)
        if (index === -1) return current
        const next = [...current]
        next.splice(index, 1)
        return next
      })

      if (upsertError) {
        setError(errorMessage(upsertError))
        return false
      }

      setError(null)
      setRows((current) => ({ ...current, [memberId]: data as T }))
      return true
    },
    [table, scopeKey, conflictColumns],
  )

  const clear = useCallback(
    async (memberId: string): Promise<boolean> => {
      const existing = rowsRef.current[memberId]
      if (!existing) return true

      const { error: deleteError } = await supabase.from(table).delete().eq('id', existing.id)
      if (deleteError) {
        setError(errorMessage(deleteError))
        return false
      }

      setRows((current) => {
        const next = { ...current }
        delete next[memberId]
        return next
      })
      return true
    },
    [table],
  )

  return { rows, loading, error, pending, save, clear }
}
