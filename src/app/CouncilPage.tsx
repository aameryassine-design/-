import { useEffect, useState } from 'react'
import { EmptyState, ErrorBanner, Loading } from '../components/Feedback'
import { useToast } from '../components/Toast'
import { useAsync, unwrap } from '../hooks/useAsync'
import { useMemberSheet } from '../hooks/useMemberSheet'
import { useMembers } from '../hooks/useMembers'
import { useSessions } from '../hooks/useSessions'
import { COUNCIL_OPTIONS } from '../lib/constants'
import { formatDate, todayISO } from '../lib/dates'
import { supabase } from '../lib/supabase'
import type { AttendanceRecord, Majlis } from '../lib/types'

const TYPES = ['مجلس داخلي'] as const

export function CouncilPage() {
  const toast = useToast()

  // La RLS ne renvoie que les مجالس dont je suis responsable.
  const majalis = useAsync(
    async () => unwrap<Majlis[]>(await supabase.from('majalis').select('*').order('name')),
    [],
  )

  const [majlisId, setMajlisId] = useState<string | null>(null)

  useEffect(() => {
    const list = majalis.data ?? []
    if (list.length > 0 && !majlisId) setMajlisId(list[0].id)
  }, [majalis.data, majlisId])

  const { sessions, loading: sessionsLoading, error: sessionsError, create } = useSessions(
    TYPES,
    majlisId,
  )
  const { members, loading: membersLoading } = useMembers()
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    setSessionId((current) => {
      if (sessions.length === 0) return null
      if (current && sessions.some((session) => session.id === current)) return current
      return sessions[0].id
    })
  }, [sessions])

  const { rows, loading: rowsLoading, error: rowsError, pending, save } =
    useMemberSheet<AttendanceRecord>(
      'attendance',
      sessionId ? { session_id: sessionId } : null,
      'session_id,member_id',
    )

  const mine = majlisId ? members.filter((member) => member.majlis_id === majlisId) : members
  const recorded = mine.filter((member) => rows[member.id]).length

  const newSession = async () => {
    if (!majlisId) return
    const today = todayISO()
    if (sessions.some((session) => session.session_date === today)) {
      toast('جلسة اليوم موجودة', 'error')
      return
    }
    const created = await create({ type: 'مجلس داخلي', session_date: today, majlis_id: majlisId })
    if (created) {
      setSessionId(created.id)
      toast('تم فتح جلسة اليوم')
    }
  }

  if (!majalis.loading && (majalis.data ?? []).length === 0) {
    return (
      <EmptyState
        title="لم تُسند إليك أي مجلس"
        hint="يعيّن المشرف العام مسؤول كل مجلس من الموقع."
      />
    )
  }

  return (
    <section className="page">
      <div className="mobile-head">
        <h2 className="page-header__title">مجلسي</h2>
        <p className="page-header__description">سجّل حضور أعضاء مجلسك.</p>
      </div>

      <ErrorBanner message={majalis.error ?? sessionsError ?? rowsError} />

      {(majalis.data ?? []).length > 1 ? (
        <label className="card">
          <span className="label">المجلس</span>
          <select
            className="input"
            value={majlisId ?? ''}
            onChange={(event) => setMajlisId(event.target.value)}
          >
            {(majalis.data ?? []).map((majlis) => (
              <option key={majlis.id} value={majlis.id}>
                {majlis.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="card day-switch">
        <select
          className="input"
          value={sessionId ?? ''}
          disabled={sessions.length === 0}
          onChange={(event) => setSessionId(event.target.value)}
        >
          {sessions.length === 0 ? <option value="">لا جلسات بعد</option> : null}
          {sessions.map((session) => (
            <option key={session.id} value={session.id}>
              {formatDate(session.session_date)}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn--primary" onClick={() => void newSession()}>
          + جلسة اليوم
        </button>
      </div>

      {sessionsLoading || membersLoading || rowsLoading ? <Loading /> : null}

      {!sessionsLoading && sessions.length === 0 ? (
        <EmptyState title="لا جلسات" hint="افتح جلسة اليوم بالزر أعلاه." />
      ) : null}

      {sessionId && mine.length > 0 ? (
        <>
          <div className="sheet-toolbar__stats">
            <span className={`pill pill--${recorded === mine.length ? 'good' : 'neutral'}`}>
              سُجِّل {recorded} من {mine.length}
            </span>
          </div>

          <div className="task-list">
            {mine.map((member) => (
              <article
                key={member.id}
                className={`card task-row${pending.includes(member.id) ? ' is-saving' : ''}`}
              >
                <div className="task-row__head">
                  <h3 className="task-row__title">{member.full_name}</h3>
                </div>
                <div className="task-row__actions">
                  {COUNCIL_OPTIONS.map((option) => {
                    const active = rows[member.id]?.status === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`btn btn--big chip--${option.tone}${active ? ' is-active' : ''}`}
                        aria-pressed={active}
                        onClick={() => void save(member.id, { status: option.value })}
                      >
                        {option.value}
                      </button>
                    )
                  })}
                </div>
              </article>
            ))}
          </div>
        </>
      ) : null}

      {sessionId && mine.length === 0 ? (
        <EmptyState title="لا أعضاء في مجلسك" hint="يُلحقهم المشرف العام بالمجلس من الموقع." />
      ) : null}
    </section>
  )
}
