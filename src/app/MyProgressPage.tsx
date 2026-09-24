import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { EmptyState, ErrorBanner, Loading } from '../components/Feedback'
import { currentMonth, PeriodPicker, type Period } from '../components/PeriodPicker'
import { QuranMemorizationGrid } from '../components/QuranMemorizationGrid'
import { useAsync, unwrap } from '../hooks/useAsync'
import { formatRange, formatShortDate } from '../lib/dates'
import { formatPct, ratioTone } from '../lib/scoring'
import { supabase } from '../lib/supabase'
import type {
  BookProgress,
  IndividualTask,
  MemorizationEntry,
  MemorizationProgress,
  TaskEntry,
} from '../lib/types'

interface MyData {
  entries: TaskEntry[]
  tasks: IndividualTask[]
  progress: MemorizationProgress[]
  thumns: MemorizationEntry[]
  books: BookProgress[]
}

async function loadMine(memberId: string, period: Period): Promise<MyData> {
  const [entryResult, taskResult, progressResult, bookResult] = await Promise.all([
    supabase
      .from('task_entries')
      .select('*')
      .eq('member_id', memberId)
      .gte('entry_date', period.start)
      .lte('entry_date', period.end),
    supabase.from('individual_tasks').select('*'),
    supabase.from('memorization_progress').select('*'),
    supabase.from('book_reading_progress').select('*').eq('member_id', memberId),
  ])

  const progress = unwrap<MemorizationProgress[]>(progressResult)
  const programIds = progress.map((row) => row.program_id)

  const thumns = programIds.length
    ? unwrap<MemorizationEntry[]>(
        await supabase
          .from('memorization_entries')
          .select('*')
          .in('program_id', programIds)
          .order('entry_date', { ascending: false })
          .limit(20),
      )
    : []

  return {
    entries: unwrap<TaskEntry[]>(entryResult),
    tasks: unwrap<IndividualTask[]>(taskResult),
    progress,
    thumns,
    books: unwrap<BookProgress[]>(bookResult),
  }
}

export function MyProgressPage() {
  const { member, user } = useAuth()
  const [period, setPeriod] = useState<Period>(currentMonth)
  const [activeTab, setActiveTab] = useState<'quran' | 'summary'>('quran')
  const memberId = member?.id ?? ''

  const state = useAsync(
    () => (memberId ? loadMine(memberId, period) : Promise.resolve(null as unknown as MyData)),
    [memberId, period.start, period.end],
  )

  const entries = state.data?.entries ?? []
  const tasks = state.data?.tasks ?? []
  const kindOf = (taskId: string) => tasks.find((task) => task.id === taskId)?.kind ?? 'worship'

  const worship = entries.filter((entry) => kindOf(entry.task_id) === 'worship')
  const reading = entries.filter((entry) => kindOf(entry.task_id) === 'reading')

  const ratio = (rows: TaskEntry[]) =>
    rows.length === 0 ? null : rows.filter((row) => row.status === 'أنجزت').length / rows.length

  const answeredDays = new Set(entries.map((entry) => entry.entry_date)).size
  const program = state.data?.progress.find((row) => row.is_active) ?? state.data?.progress[0]

  return (
    <section className="page">
      <div className="mobile-head">
        <h2 className="page-header__title">تقدّمي</h2>
        <p className="page-header__description">
          {activeTab === 'summary'
            ? (member ? formatRange(period.start, period.end) : 'الملخص العام')
            : 'خريطة حفظ ومراجعة القرآن الكريم (480 ثمناً)'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button
          type="button"
          className={`btn btn--sm ${activeTab === 'quran' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setActiveTab('quran')}
        >
          خريطة الأثمان (480 ثمناً)
        </button>
        <button
          type="button"
          className={`btn btn--sm ${activeTab === 'summary' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setActiveTab('summary')}
        >
          الملخص العام
        </button>
      </div>

      {activeTab === 'quran' ? (
        <QuranMemorizationGrid
          userId={user?.id ?? ''}
          onClose={() => setActiveTab('summary')}
        />
      ) : !member ? (
        <EmptyState
          title="حسابك غير مرتبط ببطاقة عضو"
          hint="تواصل مع المشرف العام لربط بريدك الإلكتروني ببطاقتك."
        />
      ) : (
        <>
          <ErrorBanner message={state.error} />

          <div className="card">
            <PeriodPicker value={period} onChange={setPeriod} showQuarter />
          </div>

          {state.loading ? <Loading /> : null}

          {!state.loading && state.data ? (
            <>
              <div className="summary-grid">
            <div className="card summary-card">
              <span className="summary-card__label">الواجبات التعبدية</span>
              <span className={`summary-card__value tone-${ratioTone(ratio(worship))}`}>
                {formatPct(ratio(worship))}
              </span>
              <span className="hint">{worship.length} تسجيلاً</span>
            </div>

            <div className="card summary-card">
              <span className="summary-card__label">ورد القراءة</span>
              <span className={`summary-card__value tone-${ratioTone(ratio(reading))}`}>
                {formatPct(ratio(reading))}
              </span>
              <span className="hint">{reading.length} تسجيلاً</span>
            </div>

            <div className="card summary-card">
              <span className="summary-card__label">أيام أجبت فيها</span>
              <span className="summary-card__value">{answeredDays}</span>
            </div>

            <div className="card summary-card">
              <span className="summary-card__label">مجموع الأثمان</span>
              <span className="summary-card__value">{program?.total_thumns ?? 0}</span>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 className="card__title" style={{ margin: 0 }}>برنامج الحفظ</h3>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setActiveTab('quran')}
              >
                فتح خريطة الأثمان ↗
              </button>
            </div>
            {program ? (
              <ul className="detail-card__list">
                <li>
                  <span>البرنامج</span>
                  <strong>{program.title}</strong>
                </li>
                <li>
                  <span>الموضع الحالي</span>
                  <strong>{program.current_position ?? program.start_position ?? '—'}</strong>
                </li>
                <li>
                  <span>عدد مرات التسجيل</span>
                  <strong>{program.sessions_count}</strong>
                </li>
                <li>
                  <span>آخر تسجيل</span>
                  <strong>
                    {program.last_entry_date ? formatShortDate(program.last_entry_date) : '—'}
                  </strong>
                </li>
              </ul>
            ) : (
              <p className="hint">لم يُفتح لك برنامج حفظ بعد.</p>
            )}
          </div>

          {(state.data.thumns ?? []).length > 0 ? (
            <div className="card">
              <h3 className="card__title">آخر الأثمان المسجَّلة</h3>
              <ul className="detail-card__list">
                {state.data.thumns.map((entry) => (
                  <li key={entry.id}>
                    <span>{formatShortDate(entry.entry_date)}</span>
                    <strong>
                      {entry.position_label ?? `${entry.thumn_count} ثمن`}
                    </strong>
                  </li>
                ))}
              </ul>
              <p className="hint">يسجّلها مسؤول الحفظ وحده.</p>
            </div>
          ) : null}

          {(state.data.books ?? []).length > 0 ? (
            <div className="card">
              <h3 className="card__title">قراءة الكتب</h3>
              <ul className="detail-card__list">
                {state.data.books.map((row) => (
                  <li key={row.id}>
                    <span>{row.status}</span>
                    <strong>{row.last_page ? `ص ${row.last_page}` : '—'}</strong>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
            </>
          ) : null}
        </>
      )}
    </section>
  )
}
