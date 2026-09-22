import { useEffect, useMemo, useState } from 'react'
import { useMemberSheet } from '../hooks/useMemberSheet'
import { useMembers } from '../hooks/useMembers'
import { useSessions } from '../hooks/useSessions'
import type { StatusOption } from '../lib/constants'
import type { SessionType } from '../lib/types'
import { CommitInput } from './CommitInput'
import { EmptyState, ErrorBanner, Loading } from './Feedback'
import { PageHeader } from './PageHeader'
import { SessionPicker } from './SessionPicker'
import { StatusPicker } from './StatusPicker'
import { useToast } from './Toast'

interface SheetRecord<T extends string> {
  id: string
  session_id: string
  member_id: string
  status: T
  note: string | null
}

interface Props<T extends string> {
  title: string
  description: string
  /** Table Supabase : `attendance` ou `preparation`. */
  table: string
  sessionTypes: readonly SessionType[]
  options: readonly StatusOption<T>[]
  withNotes?: boolean
  /** Statut appliqué par le bouton de remplissage rapide. */
  bulkValue?: T
}

export function SessionSheet<T extends string>({
  title,
  description,
  table,
  sessionTypes,
  options,
  withNotes = false,
  bulkValue,
}: Props<T>) {
  const toast = useToast()
  const {
    sessions,
    loading: sessionsLoading,
    error: sessionsError,
    create,
    remove,
  } = useSessions(sessionTypes)
  const { members, loading: membersLoading, error: membersError } = useMembers()
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    setSessionId((current) => {
      if (sessions.length === 0) return null
      if (current && sessions.some((session) => session.id === current)) return current
      return sessions[0].id
    })
  }, [sessions])

  const {
    rows,
    loading: rowsLoading,
    error: rowsError,
    pending,
    save,
  } = useMemberSheet<SheetRecord<T>>(
    table,
    sessionId ? { session_id: sessionId } : null,
    'session_id,member_id',
  )

  const counts = useMemo(() => {
    const tally = new Map<T, number>()
    for (const member of members) {
      const status = rows[member.id]?.status
      if (status) tally.set(status, (tally.get(status) ?? 0) + 1)
    }
    return tally
  }, [members, rows])

  const recorded = members.filter((member) => rows[member.id]).length

  const fillRemaining = async () => {
    if (!bulkValue) return
    const targets = members.filter((member) => !rows[member.id])
    for (const member of targets) {
      await save(member.id, { status: bulkValue })
    }
    toast(`تم تسجيل ${targets.length} عضواً`)
  }

  return (
    <section className="page">
      <PageHeader title={title} description={description} />

      <ErrorBanner message={sessionsError ?? membersError ?? rowsError} />

      <SessionPicker
        sessions={sessions}
        value={sessionId}
        onChange={setSessionId}
        onCreate={create}
        onDelete={remove}
        types={sessionTypes}
        loading={sessionsLoading}
      />

      {sessionsLoading || membersLoading ? <Loading /> : null}

      {!sessionsLoading && sessions.length === 0 ? (
        <EmptyState title="لا توجد حصص مسجّلة" hint="أضف حصة جديدة بالزر أعلاه لبدء التسجيل." />
      ) : null}

      {!membersLoading && members.length === 0 ? (
        <EmptyState title="لا يوجد أعضاء نشطون" hint="أضف الأعضاء من صفحة «الأعضاء» أولاً." />
      ) : null}

      {sessionId && members.length > 0 ? (
        <>
          <div className="sheet-toolbar">
            <div className="sheet-toolbar__stats">
              <span className="pill">
                تم التسجيل: {recorded} / {members.length}
              </span>
              {options.map((option) =>
                counts.get(option.value) ? (
                  <span key={option.value} className={`pill pill--${option.tone}`}>
                    {option.value}: {counts.get(option.value)}
                  </span>
                ) : null,
              )}
            </div>
            {bulkValue ? (
              <button
                type="button"
                className="btn btn--ghost"
                disabled={recorded === members.length || rowsLoading}
                onClick={() => void fillRemaining()}
              >
                تعيين الباقي «{bulkValue}»
              </button>
            ) : null}
          </div>

          {rowsLoading ? (
            <Loading />
          ) : (
            <div className="table-wrap">
              <table className="sheet">
                <thead>
                  <tr>
                    <th className="sheet__col-name">العضو</th>
                    <th>الحالة</th>
                    {withNotes ? <th className="sheet__col-note">ملاحظة</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => {
                    const row = rows[member.id]
                    return (
                      <tr key={member.id} className={pending.includes(member.id) ? 'is-saving' : ''}>
                        <td className="sheet__name">{member.full_name}</td>
                        <td>
                          <StatusPicker
                            options={options}
                            value={row?.status ?? null}
                            onChange={(status) => void save(member.id, { status })}
                          />
                        </td>
                        {withNotes ? (
                          <td>
                            <CommitInput
                              value={row?.note ?? ''}
                              disabled={!row}
                              ariaLabel={`ملاحظة ${member.full_name}`}
                              placeholder={row ? 'ملاحظة…' : 'اختر الحالة أولاً'}
                              onCommit={(note) =>
                                void save(member.id, { note: note.trim() || null })
                              }
                            />
                          </td>
                        ) : null}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </section>
  )
}
