import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorBanner, Loading } from '../components/Feedback'
import { useToast } from '../components/Toast'
import { useAsync, unwrap } from '../hooks/useAsync'
import { useMembers } from '../hooks/useMembers'
import { formatShortDate, todayISO } from '../lib/dates'
import { errorMessage, supabase } from '../lib/supabase'
import type { MemorizationEntry, MemorizationProgress } from '../lib/types'

interface Board {
  progress: MemorizationProgress[]
  recent: MemorizationEntry[]
}

async function loadBoard(): Promise<Board> {
  const [progressResult, recentResult] = await Promise.all([
    supabase.from('memorization_progress').select('*'),
    supabase
      .from('memorization_entries')
      .select('*')
      .order('entry_date', { ascending: false })
      .limit(40),
  ])

  return {
    progress: unwrap<MemorizationProgress[]>(progressResult),
    recent: unwrap<MemorizationEntry[]>(recentResult),
  }
}

export function MemorizationOfficerPage() {
  const toast = useToast()
  const { members } = useMembers()
  const board = useAsync(loadBoard, [])

  const [openId, setOpenId] = useState<string | null>(null)
  const [position, setPosition] = useState('')
  const [busy, setBusy] = useState(false)

  // Création de programme
  const [newMember, setNewMember] = useState('')
  const [newTitle, setNewTitle] = useState('')

  const programs = board.data?.progress ?? []
  const memberName = (id: string) => members.find((m) => m.id === id)?.full_name ?? '—'
  const withoutProgram = members.filter(
    (member) => !programs.some((program) => program.member_id === member.id && program.is_active),
  )

  const createProgram = async () => {
    if (!newMember || !newTitle.trim()) return
    setBusy(true)
    const { error } = await supabase
      .from('memorization_programs')
      .insert({ member_id: newMember, title: newTitle.trim() })
    setBusy(false)
    if (error) {
      toast(errorMessage(error), 'error')
      return
    }
    setNewMember('')
    setNewTitle('')
    toast('تم إنشاء البرنامج')
    board.refresh()
  }

  const addThumn = async (programId: string) => {
    setBusy(true)
    const { error } = await supabase.from('memorization_entries').insert({
      program_id: programId,
      thumn_count: 1,
      entry_date: todayISO(),
      position_label: position.trim() || null,
    })
    setBusy(false)

    if (error) {
      toast(errorMessage(error), 'error')
      return
    }
    setPosition('')
    setOpenId(null)
    toast('تم تسجيل ثمن')
    board.refresh()
  }

  const entriesOf = (programId: string) =>
    (board.data?.recent ?? []).filter((entry) => entry.program_id === programId)

  return (
    <section className="page">
      <div className="mobile-head">
        <h2 className="page-header__title">برنامج الحفظ</h2>
        <p className="page-header__description">سجّل ثمناً كلما أتمّ العضو مقرّره.</p>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <Link to="/app/quran" className="btn btn--primary btn--sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <span>📖</span>
          <span>الانتقال إلى خريطة الأثمان (480 ثمناً)</span>
        </Link>
      </div>

      <ErrorBanner message={board.error} />

      {board.loading ? <Loading /> : null}

      {!board.loading && programs.length === 0 ? (
        <EmptyState title="لا برامج بعد" hint="أنشئ برنامجاً لأحد الأعضاء أدناه." />
      ) : null}

      <div className="task-list">
        {programs.map((program) => {
          const open = openId === program.program_id
          const history = entriesOf(program.program_id)

          return (
            <article key={program.program_id} className="card">
              <div className="task-row__head">
                <h3 className="task-row__title">{memberName(program.member_id)}</h3>
                <span className="pill pill--good">{program.total_thumns} ثمن</span>
              </div>

              <p className="hint">
                {program.title}
                {program.current_position ? ` — ${program.current_position}` : ''}
                {program.last_entry_date
                  ? ` — آخر تسجيل ${formatShortDate(program.last_entry_date)}`
                  : ''}
              </p>

              {open ? (
                <div className="stack">
                  <label>
                    <span className="label">الموضع (اختياري)</span>
                    <input
                      className="input"
                      value={position}
                      placeholder="مثال: الحزب 58، الثمن 3"
                      onChange={(event) => setPosition(event.target.value)}
                    />
                  </label>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="btn btn--primary"
                      disabled={busy}
                      onClick={() => void addThumn(program.program_id)}
                    >
                      تأكيد الثمن
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => {
                        setOpenId(null)
                        setPosition('')
                      }}
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <div className="row-actions">
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => setOpenId(program.program_id)}
                  >
                    + ثمن
                  </button>
                </div>
              )}

              {history.length > 0 ? (
                <ul className="detail-card__list">
                  {history.slice(0, 5).map((entry) => (
                    <li key={entry.id}>
                      <span>{formatShortDate(entry.entry_date)}</span>
                      <strong>{entry.position_label ?? `${entry.thumn_count} ثمن`}</strong>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          )
        })}
      </div>

      <form
        className="card member-form"
        onSubmit={(event) => {
          event.preventDefault()
          void createProgram()
        }}
      >
        <label>
          <span className="label">عضو بلا برنامج</span>
          <select
            className="input"
            value={newMember}
            required
            onChange={(event) => setNewMember(event.target.value)}
          >
            <option value="">اختر…</option>
            {withoutProgram.map((member) => (
              <option key={member.id} value={member.id}>
                {member.full_name}
              </option>
            ))}
          </select>
        </label>
        <label className="grow">
          <span className="label">البرنامج</span>
          <input
            className="input"
            value={newTitle}
            required
            placeholder="مثال: المفصل"
            onChange={(event) => setNewTitle(event.target.value)}
          />
        </label>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          + برنامج
        </button>
      </form>
    </section>
  )
}
