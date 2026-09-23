import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { EmptyState, ErrorBanner, Loading } from '../components/Feedback'
import { useToast } from '../components/Toast'
import { useAsync, unwrap } from '../hooks/useAsync'
import { TASK_ENTRY_OPTIONS } from '../lib/constants'
import { addDays, formatDate, todayISO } from '../lib/dates'
import { errorMessage, supabase } from '../lib/supabase'
import type { Book, BookProgram, IndividualTask, TaskEntry, TaskEntryStatus } from '../lib/types'

interface DayData {
  tasks: IndividualTask[]
  entries: TaskEntry[]
  programs: BookProgram[]
  books: Book[]
}

async function loadDay(memberId: string, date: string): Promise<DayData> {
  const [taskResult, entryResult, programResult, bookResult] = await Promise.all([
    supabase
      .from('individual_tasks')
      .select('*')
      .eq('is_active', true)
      .lte('starts_on', date)
      .or(`ends_on.is.null,ends_on.gte.${date}`)
      .order('sort_order')
      .order('created_at'),
    supabase.from('task_entries').select('*').eq('member_id', memberId).eq('entry_date', date),
    supabase.from('book_programs').select('*').eq('is_active', true),
    supabase.from('books').select('*'),
  ])

  return {
    tasks: unwrap<IndividualTask[]>(taskResult),
    entries: unwrap<TaskEntry[]>(entryResult),
    programs: unwrap<BookProgram[]>(programResult),
    books: unwrap<Book[]>(bookResult),
  }
}

export function MyTasksPage() {
  const { member } = useAuth()
  const toast = useToast()
  const today = todayISO()
  const [date, setDate] = useState(today)
  const [saving, setSaving] = useState<string | null>(null)

  const memberId = member?.id ?? ''
  const day = useAsync(
    () => (memberId ? loadDay(memberId, date) : Promise.resolve(null as unknown as DayData)),
    [memberId, date],
  )

  if (!member) {
    return (
      <EmptyState
        title="حسابك غير مرتبط ببطاقة عضو"
        hint="تواصل مع المشرف العام لربط بريدك الإلكتروني ببطاقتك."
      />
    )
  }

  const tasks = day.data?.tasks ?? []
  const entries = day.data?.entries ?? []
  const mine = tasks.filter((task) => task.member_id === null || task.member_id === member.id)

  const statusOf = (taskId: string) =>
    entries.find((entry) => entry.task_id === taskId)?.status ?? null

  const readingHint = (task: IndividualTask): string | null => {
    if (task.kind !== 'reading' || !task.book_program_id) return null
    const program = day.data?.programs.find((item) => item.id === task.book_program_id)
    if (!program) return null
    const book = day.data?.books.find((item) => item.id === program.book_id)
    return `${program.pages_per_day} صفحات${book ? ` من «${book.title}»` : ''}`
  }

  const record = async (task: IndividualTask, status: TaskEntryStatus) => {
    setSaving(task.id)
    const { error } = await supabase.from('task_entries').upsert(
      {
        task_id: task.id,
        member_id: member.id,
        entry_date: date,
        status,
      },
      { onConflict: 'task_id,member_id,entry_date' },
    )
    setSaving(null)

    if (error) {
      toast(errorMessage(error), 'error')
      return
    }
    day.refresh()
  }

  const answered = mine.filter((task) => statusOf(task.id)).length
  const done = mine.filter((task) => statusOf(task.id) === 'أنجزت').length

  return (
    <section className="page">
      <div className="mobile-head">
        <h2 className="page-header__title">واجباتي</h2>
        <p className="page-header__description">{formatDate(date)}</p>
      </div>

      <ErrorBanner message={day.error} />

      <div className="card day-switch">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => setDate(addDays(date, -1))}
          aria-label="اليوم السابق"
        >
          ‹ السابق
        </button>
        <input
          className="input"
          type="date"
          value={date}
          max={today}
          onChange={(event) => setDate(event.target.value)}
        />
        <button
          type="button"
          className="btn btn--ghost"
          disabled={date >= today}
          onClick={() => setDate(addDays(date, 1))}
          aria-label="اليوم التالي"
        >
          التالي ›
        </button>
      </div>

      {day.loading ? <Loading /> : null}

      {!day.loading && mine.length === 0 ? (
        <EmptyState title="لا واجبات في هذا اليوم" hint="ستظهر هنا فور إضافتها من المسؤول." />
      ) : null}

      {mine.length > 0 ? (
        <>
          <div className="sheet-toolbar__stats">
            <span className={`pill pill--${answered === mine.length ? 'good' : 'neutral'}`}>
              أجبت عن {answered} من {mine.length}
            </span>
            <span className="pill pill--good">أنجزت: {done}</span>
          </div>

          <div className="task-list">
            {mine.map((task) => {
              const status = statusOf(task.id)
              const hint = readingHint(task)
              return (
                <article
                  key={task.id}
                  className={`card task-row${saving === task.id ? ' is-saving' : ''}`}
                >
                  <div className="task-row__head">
                    <h3 className="task-row__title">{task.title}</h3>
                    {status ? null : <span className="pill pill--neutral">لم يجب</span>}
                  </div>
                  {hint ? <p className="hint">{hint}</p> : null}

                  <div className="task-row__actions">
                    {TASK_ENTRY_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`btn btn--big chip--${option.tone}${
                          status === option.value ? ' is-active' : ''
                        }`}
                        disabled={saving === task.id}
                        aria-pressed={status === option.value}
                        onClick={() => void record(task, option.value)}
                      >
                        {option.value}
                      </button>
                    ))}
                  </div>
                </article>
              )
            })}
          </div>

          <p className="legend">
            يمكنك تغيير جوابك في أي وقت، لكن لا يمكن محوه: المسؤول يرى فقط أنك «أجبت» في هذا اليوم،
            دون الاطّلاع على الأجوبة نفسها.
          </p>
        </>
      ) : null}
    </section>
  )
}
