import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBanner, Loading } from '../components/Feedback'
import { PageHeader } from '../components/PageHeader'
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
  const [progressResult, entriesResult] = await Promise.all([
    supabase.from('memorization_progress').select('*'),
    supabase
      .from('memorization_entries')
      .select('*')
      .order('entry_date', { ascending: false })
      .limit(30),
  ])

  return {
    progress: unwrap<MemorizationProgress[]>(progressResult),
    recent: unwrap<MemorizationEntry[]>(entriesResult),
  }
}

export function MemorizationPage() {
  const toast = useToast()
  const { members } = useMembers()
  const board = useAsync(loadBoard, [])

  const [memberId, setMemberId] = useState('')
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)

  const programs = board.data?.progress ?? []
  const memberName = (id: string) => members.find((m) => m.id === id)?.full_name ?? '—'
  const withoutProgram = members.filter(
    (member) => !programs.some((program) => program.member_id === member.id && program.is_active),
  )

  const createProgram = async () => {
    if (!memberId || !title.trim()) return
    setBusy(true)
    const { error } = await supabase
      .from('memorization_programs')
      .insert({ member_id: memberId, title: title.trim() })
    setBusy(false)
    if (error) {
      toast(errorMessage(error), 'error')
      return
    }
    setTitle('')
    setMemberId('')
    toast('تم إنشاء البرنامج')
    board.refresh()
  }

  const addThumn = async (programId: string) => {
    const { error } = await supabase
      .from('memorization_entries')
      .insert({ program_id: programId, thumn_count: 1, entry_date: todayISO() })
    if (error) toast(errorMessage(error), 'error')
    else {
      toast('تم تسجيل ثمن')
      board.refresh()
    }
  }

  return (
    <section className="page">
      <PageHeader
        title="برنامج الحفظ"
        description="لكل عضو برنامجه. الأثمان يسجّلها مسؤول الحفظ من التطبيق؛ يمكنك التسجيل من هنا عند الحاجة."
      >
        <Link to="/admin/quran" className="btn btn--primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <span>📖</span>
          <span>خريطة الأثمان (480 ثمناً)</span>
        </Link>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={board.refresh}
          disabled={board.loading}
        >
          تحديث
        </button>
      </PageHeader>

      <ErrorBanner message={board.error} />

      <form
        className="card member-form"
        onSubmit={(event) => {
          event.preventDefault()
          void createProgram()
        }}
      >
        <label>
          <span className="label">العضو</span>
          <select
            className="input"
            value={memberId}
            required
            onChange={(event) => setMemberId(event.target.value)}
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
            value={title}
            required
            placeholder="مثال: المفصل"
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'جارٍ…' : '+ برنامج جديد'}
        </button>
      </form>

      {board.loading ? <Loading /> : null}

      {!board.loading ? (
        <div className="table-wrap">
          <table className="sheet">
            <thead>
              <tr>
                <th className="sheet__col-name">العضو</th>
                <th>البرنامج</th>
                <th>الأثمان</th>
                <th>الموضع الحالي</th>
                <th>آخر تسجيل</th>
                <th className="sheet__col-actions" />
              </tr>
            </thead>
            <tbody>
              {programs.map((program) => (
                <tr key={program.program_id} className={program.is_active ? '' : 'is-archived'}>
                  <td className="sheet__name">{memberName(program.member_id)}</td>
                  <td>{program.title}</td>
                  <td className="sheet__total">{program.total_thumns}</td>
                  <td>{program.current_position ?? '—'}</td>
                  <td>
                    {program.last_entry_date ? formatShortDate(program.last_entry_date) : '—'}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => void addThumn(program.program_id)}
                    >
                      + ثمن
                    </button>
                  </td>
                </tr>
              ))}
              {programs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="hint">
                    لا برامج بعد.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}
