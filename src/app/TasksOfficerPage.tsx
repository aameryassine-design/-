import { useState } from 'react'
import { EmptyState, ErrorBanner, Loading } from '../components/Feedback'
import { useToast } from '../components/Toast'
import { useAsync, unwrap } from '../hooks/useAsync'
import { useMembers } from '../hooks/useMembers'
import {
  addDays,
  endOfWeek,
  formatShortDate,
  parseISODate,
  startOfWeek,
  todayISO,
} from '../lib/dates'
import { errorMessage, supabase } from '../lib/supabase'
import type { DailyParticipation, IndividualTask } from '../lib/types'

/**
 * Écran du مسؤول الواجبات الفردية.
 *
 * Il ne lit JAMAIS `task_entries` : la base le lui refuse, et cet écran ne le
 * tente pas. Sa seule source est la vue `daily_participation`, qui ne renvoie
 * que des couples (membre, jour) — ni statut, ni nombre de tâches saisies.
 */

interface Data {
  participation: DailyParticipation[]
  tasks: IndividualTask[]
}

async function loadRange(start: string, end: string): Promise<Data> {
  const [participationResult, taskResult] = await Promise.all([
    supabase
      .from('daily_participation')
      .select('member_id, entry_date, has_responded')
      .gte('entry_date', start)
      .lte('entry_date', end),
    supabase.from('individual_tasks').select('*').order('created_at', { ascending: false }),
  ])

  return {
    participation: unwrap<DailyParticipation[]>(participationResult),
    tasks: unwrap<IndividualTask[]>(taskResult),
  }
}

function daysBetween(start: string, end: string): string[] {
  const days: string[] = []
  for (let day = start; day <= end; day = addDays(day, 1)) days.push(day)
  return days
}

export function TasksOfficerPage() {
  const toast = useToast()
  const { members } = useMembers()
  const today = todayISO()

  const [weekStart, setWeekStart] = useState(() => startOfWeek(today))
  const weekEnd = endOfWeek(weekStart)
  const visibleEnd = weekEnd > today ? today : weekEnd
  const days = daysBetween(weekStart, visibleEnd)

  const data = useAsync(() => loadRange(weekStart, visibleEnd), [weekStart, visibleEnd])

  const [title, setTitle] = useState('')
  const [scope, setScope] = useState('')
  const [busy, setBusy] = useState(false)

  const responded = (memberId: string, day: string) =>
    (data.data?.participation ?? []).some(
      (row) => row.member_id === memberId && row.entry_date === day && row.has_responded,
    )

  const addTask = async () => {
    if (!title.trim()) return
    setBusy(true)
    const { error } = await supabase
      .from('individual_tasks')
      .insert({ title: title.trim(), member_id: scope || null })
    setBusy(false)
    if (error) {
      toast(errorMessage(error), 'error')
      return
    }
    setTitle('')
    toast('تمت إضافة الواجب')
    data.refresh()
  }

  const stopTask = async (task: IndividualTask) => {
    const { error } = await supabase
      .from('individual_tasks')
      .update({ is_active: false, ends_on: todayISO() })
      .eq('id', task.id)
    if (error) toast(errorMessage(error), 'error')
    else {
      toast('تم إيقاف الواجب')
      data.refresh()
    }
  }

  const memberName = (id: string | null) =>
    id ? (members.find((member) => member.id === id)?.full_name ?? '—') : 'الجميع'

  const answeredToday = members.filter((member) => responded(member.id, today)).length
  const activeTasks = (data.data?.tasks ?? []).filter((task) => task.is_active)

  return (
    <section className="page">
      <div className="mobile-head">
        <h2 className="page-header__title">متابعة الواجبات</h2>
        <p className="page-header__description">من أجاب اليوم ومن لم يجب.</p>
      </div>

      <ErrorBanner message={data.error} />

      <div className="summary-grid">
        <div className="card summary-card summary-card--total">
          <span className="summary-card__label">أجابوا اليوم</span>
          <span className="summary-card__value">
            {answeredToday} / {members.length}
          </span>
        </div>
        <div className="card summary-card">
          <span className="summary-card__label">واجبات نشطة</span>
          <span className="summary-card__value">{activeTasks.length}</span>
        </div>
      </div>

      <div className="card day-switch">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => setWeekStart(addDays(weekStart, -7))}
        >
          ‹ الأسبوع السابق
        </button>
        <span className="hint">
          {formatShortDate(weekStart)} — {formatShortDate(visibleEnd)}
        </span>
        <button
          type="button"
          className="btn btn--ghost"
          disabled={weekEnd >= today}
          onClick={() => setWeekStart(addDays(weekStart, 7))}
        >
          التالي ›
        </button>
      </div>

      {data.loading ? <Loading /> : null}

      {!data.loading && members.length === 0 ? (
        <EmptyState title="لا أعضاء" hint="يضيفهم المشرف العام من الموقع." />
      ) : null}

      {members.length > 0 ? (
        <div className="table-wrap">
          <table className="sheet sheet--matrix">
            <thead>
              <tr>
                <th className="sheet__col-name">العضو</th>
                {days.map((day) => (
                  <th key={day} title={formatShortDate(day)}>
                    {parseISODate(day).getDate()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="sheet__name">{member.full_name}</td>
                  {days.map((day) => {
                    const ok = responded(member.id, day)
                    return (
                      <td key={day} className={`cell tone-${ok ? 'good' : 'bad'}`}>
                        <span className="cell__value">{ok ? 'أجاب' : 'لم يجب'}</span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <form
        className="card member-form"
        onSubmit={(event) => {
          event.preventDefault()
          void addTask()
        }}
      >
        <label className="grow">
          <span className="label">واجب جديد</span>
          <input
            className="input"
            value={title}
            required
            placeholder="مثال: ورد الأذكار"
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label>
          <span className="label">يخصّ</span>
          <select className="input" value={scope} onChange={(event) => setScope(event.target.value)}>
            <option value="">جميع الأعضاء</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.full_name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'جارٍ…' : '+ إضافة'}
        </button>
      </form>

      <div className="card">
        <h3 className="card__title">الواجبات</h3>
        <ul className="task-list">
          {(data.data?.tasks ?? []).map((task) => (
            <li key={task.id} className={`task-line${task.is_active ? '' : ' is-archived'}`}>
              <div>
                <strong>{task.title}</strong>
                <span className="sheet__hint">
                  {task.kind === 'reading' ? 'ورد القراءة' : memberName(task.member_id)}
                </span>
              </div>
              {task.is_active && task.kind !== 'reading' ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => void stopTask(task)}
                >
                  إيقاف
                </button>
              ) : (
                <span className="pill pill--neutral">{task.is_active ? 'تلقائي' : 'موقوف'}</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <p className="legend">
        أنت ترى «أجاب / لم يجب» فقط. مضمون الأجوبة وعددها لا يصلان إليك — هذا مضبوط في قاعدة
        البيانات نفسها، لا في هذه الشاشة.
      </p>
    </section>
  )
}
