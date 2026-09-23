import { useEffect, useMemo, useState } from 'react'
import { CommitInput } from '../components/CommitInput'
import { EmptyState, ErrorBanner, Loading } from '../components/Feedback'
import { PageHeader } from '../components/PageHeader'
import { SessionPicker } from '../components/SessionPicker'
import { StatusPicker } from '../components/StatusPicker'
import { useToast } from '../components/Toast'
import { useMemberSheet } from '../hooks/useMemberSheet'
import { useMembers } from '../hooks/useMembers'
import { useSessions } from '../hooks/useSessions'
import { COMPLETION_OPTIONS } from '../lib/constants'
import type { CompletionStatus, MemorizationTextRecord } from '../lib/types'

const SESSION_TYPES = ['حصة أسبوعية'] as const

export function TextsSheet() {
  const toast = useToast()
  const {
    sessions,
    loading: sessionsLoading,
    error: sessionsError,
    create,
    update,
    remove,
  } = useSessions(SESSION_TYPES)
  const { members, loading: membersLoading, error: membersError } = useMembers()
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    setSessionId((current) => {
      if (sessions.length === 0) return null
      if (current && sessions.some((session) => session.id === current)) return current
      return sessions[0].id
    })
  }, [sessions])

  const session = sessions.find((item) => item.id === sessionId) ?? null

  const { rows, loading: rowsLoading, error: rowsError, pending, save } =
    useMemberSheet<MemorizationTextRecord>(
      'memorization_texts',
      sessionId ? { session_id: sessionId } : null,
      'session_id,member_id',
    )

  const counts = useMemo(() => {
    const tally = new Map<CompletionStatus, number>()
    for (const member of members) {
      const status = rows[member.id]?.status
      if (status) tally.set(status, (tally.get(status) ?? 0) + 1)
    }
    return tally
  }, [members, rows])

  const recorded = members.filter((member) => rows[member.id]).length

  const fillRemaining = async () => {
    const targets = members.filter((member) => !rows[member.id])
    for (const member of targets) {
      await save(member.id, { status: 'تم' })
    }
    toast(`تم تسجيل ${targets.length} عضواً`)
  }

  return (
    <section className="page">
      <PageHeader
        title="حفظ النصوص المقررة لكل حصة"
        description="حدّد النص المقرر للحصة، ثم سجّل حالة الحفظ لكل عضو."
      />

      <ErrorBanner message={sessionsError ?? membersError ?? rowsError} />

      <SessionPicker
        sessions={sessions}
        value={sessionId}
        onChange={setSessionId}
        onCreate={create}
        onDelete={remove}
        types={SESSION_TYPES}
        loading={sessionsLoading}
      />

      {session ? (
        <div className="card lesson-card">
          <label className="grow">
            <span className="label">النص/الدرس المقرر لهذه الحصة</span>
            <CommitInput
              value={session.lesson_text ?? ''}
              placeholder="مثال: الأربعون النووية — الحديث 12 و13"
              onCommit={(text) => void update(session.id, { lesson_text: text.trim() || null })}
            />
          </label>
          <p className="hint">يُحفظ على مستوى الحصة ويُطبّق على الجميع؛ استعمل «نص خاص» للاستثناءات.</p>
        </div>
      ) : null}

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
              {COMPLETION_OPTIONS.map((option) =>
                counts.get(option.value) ? (
                  <span key={option.value} className={`pill pill--${option.tone}`}>
                    {option.value}: {counts.get(option.value)}
                  </span>
                ) : null,
              )}
            </div>
            <button
              type="button"
              className="btn btn--ghost"
              disabled={recorded === members.length || rowsLoading}
              onClick={() => void fillRemaining()}
            >
              تعيين الباقي «تم»
            </button>
          </div>

          {rowsLoading ? (
            <Loading />
          ) : (
            <div className="table-wrap">
              <table className="sheet">
                <thead>
                  <tr>
                    <th className="sheet__col-name">العضو</th>
                    <th>حالة الحفظ</th>
                    <th className="sheet__col-note">نص خاص (اختياري)</th>
                    <th className="sheet__col-note">ملاحظة</th>
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
                            options={COMPLETION_OPTIONS}
                            value={row?.status ?? null}
                            onChange={(status) => void save(member.id, { status })}
                          />
                        </td>
                        <td>
                          <CommitInput
                            value={row?.lesson_override ?? ''}
                            disabled={!row}
                            ariaLabel={`نص خاص ${member.full_name}`}
                            placeholder={row ? session?.lesson_text || 'نص خاص…' : 'اختر الحالة أولاً'}
                            onCommit={(text) =>
                              void save(member.id, { lesson_override: text.trim() || null })
                            }
                          />
                        </td>
                        <td>
                          <CommitInput
                            value={row?.note ?? ''}
                            disabled={!row}
                            ariaLabel={`ملاحظة ${member.full_name}`}
                            placeholder={row ? 'ملاحظة…' : 'اختر الحالة أولاً'}
                            onCommit={(note) => void save(member.id, { note: note.trim() || null })}
                          />
                        </td>
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
