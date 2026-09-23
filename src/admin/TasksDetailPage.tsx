import { useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState, ErrorBanner, Loading } from '../components/Feedback'
import { PageHeader } from '../components/PageHeader'
import { useToast } from '../components/Toast'
import { useAsync, unwrap } from '../hooks/useAsync'
import { useMembers } from '../hooks/useMembers'
import { formatDate, todayISO } from '../lib/dates'
import { errorMessage, supabase } from '../lib/supabase'
import type { IndividualTask, TaskEntry } from '../lib/types'

interface DayData {
  tasks: IndividualTask[]
  entries: TaskEntry[]
}

async function loadDay(date: string): Promise<DayData> {
  const [taskResult, entryResult] = await Promise.all([
    supabase.from('individual_tasks').select('*').order('sort_order').order('created_at'),
    supabase.from('task_entries').select('*').eq('entry_date', date),
  ])

  return {
    tasks: unwrap<IndividualTask[]>(taskResult),
    entries: unwrap<TaskEntry[]>(entryResult),
  }
}

function coversDate(task: IndividualTask, date: string): boolean {
  if (task.starts_on > date) return false
  if (task.ends_on && task.ends_on < date) return false
  return true
}

export function TasksDetailPage() {
  const toast = useToast()
  const { members } = useMembers()
  const [date, setDate] = useState(todayISO())
  const day = useAsync(() => loadDay(date), [date])

  const [title, setTitle] = useState('')
  const [scope, setScope] = useState('')
  const [busy, setBusy] = useState(false)
  const [pendingArchive, setPendingArchive] = useState<IndividualTask | null>(null)

  const allTasks = day.data?.tasks ?? []
  const dayTasks = allTasks.filter((task) => task.is_active && coversDate(task, date))
  const entries = day.data?.entries ?? []

  const statusOf = (memberId: string, taskId: string) =>
    entries.find((entry) => entry.member_id === memberId && entry.task_id === taskId)?.status ?? null

  const appliesTo = (task: IndividualTask, memberId: string) =>
    task.member_id === null || task.member_id === memberId

  const addTask = async () => {
    if (!title.trim()) return
    setBusy(true)
    const { error } = await supabase.from('individual_tasks').insert({
      title: title.trim(),
      member_id: scope || null,
      starts_on: date,
    })
    setBusy(false)
    if (error) {
      toast(errorMessage(error), 'error')
      return
    }
    setTitle('')
    toast('تمت إضافة الواجب')
    day.refresh()
  }

  const archive = async (task: IndividualTask) => {
    const { error } = await supabase
      .from('individual_tasks')
      .update({ is_active: false, ends_on: task.ends_on ?? todayISO() })
      .eq('id', task.id)
    if (error) toast(errorMessage(error), 'error')
    else {
      toast('تم إيقاف الواجب')
      day.refresh()
    }
  }

  const memberName = (id: string | null) =>
    id ? (members.find((member) => member.id === id)?.full_name ?? '—') : 'الجميع'

  return (
    <section className="page">
      <PageHeader
        title="الواجبات الفردية — التفصيل الكامل"
        description="ما أنجزه كل عضو، واجباً بواجب. هذه الصفحة للمشرف العام وحده: مسؤول الواجبات لا يرى إلا «أجاب / لم يجب»."
      />

      <ErrorBanner message={day.error} />

      <div className="card">
        <div className="sheet-toolbar">
          <label className="inline-field">
            <span className="label">اليوم</span>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <span className="hint">{formatDate(date)}</span>
        </div>
      </div>

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
          <select
            className="input"
            value={scope}
            onChange={(event) => setScope(event.target.value)}
          >
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

      {day.loading ? <Loading /> : null}

      {!day.loading && dayTasks.length === 0 ? (
        <EmptyState
          title="لا واجبات في هذا اليوم"
          hint="أضف واجباً أعلاه، أو اختر يوماً آخر."
        />
      ) : null}

      {!day.loading && dayTasks.length > 0 && members.length > 0 ? (
        <div className="table-wrap">
          <table className="sheet">
            <thead>
              <tr>
                <th className="sheet__col-name">العضو</th>
                {dayTasks.map((task) => (
                  <th key={task.id}>
                    {task.title}
                    <span className="sheet__hint">
                      {task.kind === 'reading' ? 'ورد القراءة' : memberName(task.member_id)}
                    </span>
                  </th>
                ))}
                <th>الخلاصة</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const mine = dayTasks.filter((task) => appliesTo(task, member.id))
                const answered = mine.filter((task) => statusOf(member.id, task.id)).length
                const done = mine.filter(
                  (task) => statusOf(member.id, task.id) === 'أنجزت',
                ).length

                return (
                  <tr key={member.id}>
                    <td className="sheet__name">{member.full_name}</td>
                    {dayTasks.map((task) => {
                      if (!appliesTo(task, member.id)) {
                        return (
                          <td key={task.id} className="cell">
                            <span className="hint">—</span>
                          </td>
                        )
                      }
                      const status = statusOf(member.id, task.id)
                      const tone =
                        status === 'أنجزت' ? 'good' : status === 'لم أنجز' ? 'bad' : 'neutral'
                      return (
                        <td key={task.id} className="cell">
                          <span className={`pill pill--${tone}`}>{status ?? 'لم يجب'}</span>
                        </td>
                      )
                    })}
                    <td className="sheet__total">
                      {answered === 0 ? (
                        <span className="pill pill--neutral">لم يجب</span>
                      ) : (
                        <span className={`pill pill--${done === mine.length ? 'good' : 'mid'}`}>
                          {done} / {mine.length}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="card">
        <h3 className="card__title">كل الواجبات ({allTasks.length})</h3>
        <div className="table-wrap">
          <table className="sheet">
            <thead>
              <tr>
                <th className="sheet__col-name">الواجب</th>
                <th>يخصّ</th>
                <th>النوع</th>
                <th>من</th>
                <th>إلى</th>
                <th>الحالة</th>
                <th className="sheet__col-actions" />
              </tr>
            </thead>
            <tbody>
              {allTasks.map((task) => (
                <tr key={task.id} className={task.is_active ? '' : 'is-archived'}>
                  <td className="sheet__name">{task.title}</td>
                  <td>{memberName(task.member_id)}</td>
                  <td>
                    <span className="pill">
                      {task.kind === 'reading' ? 'ورد قراءة' : 'واجب تعبدي'}
                    </span>
                  </td>
                  <td>{task.starts_on}</td>
                  <td>{task.ends_on ?? 'مستمر'}</td>
                  <td>
                    <span className={`pill pill--${task.is_active ? 'good' : 'neutral'}`}>
                      {task.is_active ? 'نشط' : 'موقوف'}
                    </span>
                  </td>
                  <td>
                    {task.is_active && task.kind !== 'reading' ? (
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => setPendingArchive(task)}
                      >
                        إيقاف
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint">
          واجبات «ورد القراءة» تُنشأ تلقائياً عند برمجة كتاب، وتتوقف بإيقاف برنامجه من صفحة «الكتب».
        </p>
      </div>

      <ConfirmDialog
        open={pendingArchive !== null}
        title="إيقاف الواجب"
        message={
          pendingArchive
            ? `لن يظهر «${pendingArchive.title}» للأعضاء بعد اليوم. تبقى التسجيلات السابقة محفوظة في البيان.`
            : undefined
        }
        confirmLabel="إيقاف"
        onCancel={() => setPendingArchive(null)}
        onConfirm={() => {
          const task = pendingArchive
          setPendingArchive(null)
          if (task) void archive(task)
        }}
      />
    </section>
  )
}
