import { Link } from 'react-router-dom'
import { useAuth, useDisplayName } from '../auth/AuthProvider'
import { useAsync, unwrap } from '../hooks/useAsync'
import { roleLabel } from '../lib/roles'
import { formatDate, todayISO } from '../lib/dates'
import { supabase } from '../lib/supabase'
import type { IndividualTask, TaskEntry } from '../lib/types'

interface TodayData {
  tasks: IndividualTask[]
  entries: TaskEntry[]
}

async function loadToday(memberId: string, date: string): Promise<TodayData> {
  const [taskResult, entryResult] = await Promise.all([
    supabase
      .from('individual_tasks')
      .select('*')
      .eq('is_active', true)
      .lte('starts_on', date)
      .or(`ends_on.is.null,ends_on.gte.${date}`),
    supabase.from('task_entries').select('*').eq('member_id', memberId).eq('entry_date', date),
  ])

  return {
    tasks: unwrap<IndividualTask[]>(taskResult),
    entries: unwrap<TaskEntry[]>(entryResult),
  }
}

export function HomePage() {
  const { roles, member, has } = useAuth()
  const name = useDisplayName()
  const today = todayISO()

  const state = useAsync(
    () =>
      member
        ? loadToday(member.id, today)
        : Promise.resolve({ tasks: [], entries: [] } as TodayData),
    [member?.id, today],
  )

  const mine = (state.data?.tasks ?? []).filter(
    (task) => task.member_id === null || task.member_id === member?.id,
  )
  const answered = mine.filter((task) =>
    (state.data?.entries ?? []).some((entry) => entry.task_id === task.id),
  ).length

  return (
    <section className="page">
      <div className="card home-hero">
        <p className="home-hero__hello">السلام عليكم</p>
        <h2 className="home-hero__name">{name}</h2>
        <p className="hint">{formatDate(today)}</p>
        <div className="chip-row">
          {roles.map((role) => (
            <span key={role} className="pill">
              {roleLabel(role)}
            </span>
          ))}
        </div>
      </div>

      <Link className="card home-card" to="/app/quran">
        <div>
          <h3 className="home-card__title">خريطة حفظ القرآن (480 ثمناً)</h3>
          <p className="hint">متابعة الحفظ وتثبيت الأثمان بالتلوين التفاعلي</p>
        </div>
        <span aria-hidden="true" style={{ fontSize: '1.4rem' }}>📖</span>
      </Link>

      {has('member') && member ? (
        <Link className="card home-card" to="/app/tasks">
          <div>
            <h3 className="home-card__title">واجبات اليوم</h3>
            <p className="hint">
              {mine.length === 0
                ? 'لا واجبات اليوم'
                : answered === mine.length
                  ? 'أجبت عن كل واجباتك، بارك الله فيك'
                  : `بقي ${mine.length - answered} من ${mine.length}`}
            </p>
          </div>
          <span
            className={`pill pill--${mine.length > 0 && answered === mine.length ? 'good' : 'mid'}`}
          >
            {answered} / {mine.length}
          </span>
        </Link>
      ) : null}

      {has('member') ? (
        <Link className="card home-card" to="/app/progress">
          <div>
            <h3 className="home-card__title">تقدّمي</h3>
            <p className="hint">الواجبات وبرنامج الحفظ</p>
          </div>
          <span aria-hidden="true">↗</span>
        </Link>
      ) : null}

      {has('tasks_officer') ? (
        <Link className="card home-card" to="/app/officer/tasks">
          <div>
            <h3 className="home-card__title">متابعة الواجبات</h3>
            <p className="hint">من أجاب اليوم ومن لم يجب</p>
          </div>
          <span aria-hidden="true">◫</span>
        </Link>
      ) : null}

      {has('memorization_officer') ? (
        <Link className="card home-card" to="/app/officer/memorization">
          <div>
            <h3 className="home-card__title">برنامج الحفظ</h3>
            <p className="hint">تسجيل الأثمان</p>
          </div>
          <span aria-hidden="true">☾</span>
        </Link>
      ) : null}

      {has('majlis_leader') ? (
        <Link className="card home-card" to="/app/council">
          <div>
            <h3 className="home-card__title">مجلسي</h3>
            <p className="hint">حضور أعضاء مجلسك</p>
          </div>
          <span aria-hidden="true">◎</span>
        </Link>
      ) : null}

      <Link className="card home-card" to="/app/books">
        <div>
          <h3 className="home-card__title">الكتب</h3>
          <p className="hint">قراءة وتنزيل</p>
        </div>
        <span aria-hidden="true">▤</span>
      </Link>
    </section>
  )
}
