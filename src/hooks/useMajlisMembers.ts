import { useCallback, useEffect, useState } from 'react'
import { errorMessage, supabase } from '../lib/supabase'
import type { MajlisMember, Member, MembershipStatus } from '../lib/types'

export interface MembershipRequest extends MajlisMember {
  member?: Member | null
  majlis_name?: string | null
}

export function useMajlisMembers(majlisId?: string | null) {
  const [requests, setRequests] = useState<MembershipRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('majlis_members')
        .select(`
          id,
          majlis_id,
          member_id,
          status,
          joined_at,
          decided_at,
          decided_by,
          created_at,
          updated_at,
          members (
            id,
            full_name,
            phone,
            email,
            status,
            majlis_id,
            created_at
          ),
          majalis (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false })

      if (majlisId) {
        query = query.eq('majlis_id', majlisId)
      }

      const { data, error: fetchErr } = await query

      if (fetchErr) {
        setError(errorMessage(fetchErr))
        return
      }

      const formatted: MembershipRequest[] = (data || []).map((row: any) => ({
        id: row.id,
        majlis_id: row.majlis_id,
        member_id: row.member_id,
        status: row.status as MembershipStatus,
        joined_at: row.joined_at,
        decided_at: row.decided_at,
        decided_by: row.decided_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
        member: row.members ? (row.members as Member) : null,
        majlis_name: row.majalis ? row.majalis.name : null,
      }))

      setRequests(formatted)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [majlisId])

  useEffect(() => {
    void fetchRequests()
  }, [fetchRequests])

  const updateStatus = useCallback(
    async (requestId: string, status: MembershipStatus): Promise<boolean> => {
      setBusyId(requestId)
      try {
        const { error: updateErr } = await supabase
          .from('majlis_members')
          .update({
            status,
            decided_at: new Date().toISOString(),
          })
          .eq('id', requestId)

        if (updateErr) {
          setError(errorMessage(updateErr))
          return false
        }

        setRequests((prev) =>
          prev.map((req) =>
            req.id === requestId
              ? { ...req, status, decided_at: new Date().toISOString() }
              : req,
          ),
        )
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return false
      } finally {
        setBusyId(null)
      }
    },
    [],
  )

  const pendingRequests = requests.filter((r) => r.status === 'pending')

  return {
    requests,
    pendingRequests,
    loading,
    error,
    busyId,
    approveRequest: (id: string) => updateStatus(id, 'active'),
    rejectRequest: (id: string) => updateStatus(id, 'rejected'),
    refresh: fetchRequests,
  }
}
