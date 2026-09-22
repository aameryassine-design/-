import { useCallback, useEffect, useState } from 'react'
import { errorMessage, supabase } from '../lib/supabase'
import type { Member } from '../lib/types'

export function useMembers(includeArchived = false) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('members').select('*').order('full_name', { ascending: true })
    if (!includeArchived) query = query.eq('status', 'نشط')

    const { data, error: queryError } = await query
    if (queryError) setError(errorMessage(queryError))
    else {
      setError(null)
      setMembers((data ?? []) as Member[])
    }
    setLoading(false)
  }, [includeArchived])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { members, loading, error, refresh }
}
