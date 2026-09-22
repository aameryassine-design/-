import { useCallback, useEffect, useState } from 'react'
import { CommitInput } from '../components/CommitInput'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState, ErrorBanner, Loading } from '../components/Feedback'
import { PageHeader } from '../components/PageHeader'
import {
  currentMonth,
  PeriodPicker,
  previousPeriod,
  type Period,
} from '../components/PeriodPicker'
import { StatusPicker } from '../components/StatusPicker'
import { useToast } from '../components/Toast'
import { useMembers } from '../hooks/useMembers'
import { TASK_OPTIONS } from '../lib/constants'
import { formatRange } from '../lib/dates'
import { errorMessage, supabase } from '../lib/supabase'
import type { IndividualTask, TaskStatus } from '../lib/types'

export function TasksPage() {
  const toast = useToast()
  const { members, loading: membersLoading, error: membersError } = useMembers()
  const [period, setPeriod] = useState<Period>(currentMonth)
  const [tasks, setTasks] = useState<IndividualTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [pendingDelete, setPendingDelete] = useState<IndividualTask | null>(null)
  const [copying, setCopying] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: queryError } = await supabase
      .from('individual_tasks')
      .select('*')
      .lte('period_start', period.end)
      .gte('period_end', period.start)
      .order('created_at', { ascending: true })

    if (queryError) setError(errorMessage(queryError))
    else {
      setError(null)
      setTasks((data ?? []) as IndividualTask[])
    }
    setLoading(false)
  }, [period.start, period.end])

  useEffect(() => {
    void load()
  }, [load])

  const addTask = async (memberId: string) => {
    const description = (drafts[memberId] ?? '').trim()
    if (!description) return

    const { data, error: insertError } = await supabase
      .from('individual_tasks')
      .insert({
        member_id: memberId,
        description,
        period_start: period.start,
        period_end: period.end,
      })
      .select()
      .single()

    if (insertError) {
      toast(errorMessage(insertError), 'error')
      return
    }
    setTasks((current) => [...current, data as IndividualTask])
    setDrafts((current) => ({ ...current, [memberId]: '' }))
  }

  const updateTask = async (id: string, patch: Partial<IndividualTask>) => {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, ...patch } : task)))
    const { error: updateError } = await supabase.from('individual_tasks').update(patch).eq('id', id)
    if (updateError) {
      toast(errorMessage(updateError), 'error')
      void load()
    }
  }

  const deleteTask = async (id: string) => {
    const { error: deleteError } = await supabase.from('individual_tasks').delete().eq('id', id)
    if (deleteError) {
      toast(errorMessage(deleteError), 'error')
      return
    }
    setTasks((current) => current.filter((task) => task.id !== id))
    toast('تم حذف الواجب')
  }

  const copyFromPrevious = async () => {
    setCopying(true)
    const previous = previousPeriod(period)
    const { data, error: queryError } = await supabase
      .from('individual_tasks')
      .select('*')
      .lte('period_start', previous.end)
      .gte('period_end', previous.start)

    if (queryError) {
      setCopying(false)
      toast(errorMessage(queryError), 'error')
      return
    }

    const activeIds = new Set(members.map((member) => member.id))
    const existing = new Set(tasks.map((task) => `${task.member_id}|${task.description}`))
    const toInsert = (data as IndividualTask[])
      .filter(
        (task) =>
          activeIds.has(task.member_id) && !existing.has(`${task.member_id}|${task.description}`),
      )
      .map((task) => ({
        member_id: task.member_id,
        description: task.description,
        period_start: period.start,
        period_end: period.end,
      }))

    if (toInsert.length === 0) {
      setCopying(false)
      toast('لا توجد واجبات جديدة للنسخ')
      return
    }

    const { error: insertError } = await supabase.from('individual_tasks').insert(toInsert)
    setCopying(false)
    if (insertError) {
      toast(errorMessage(insertError), 'error')
      return
    }
    toast(`تم نسخ ${toInsert.length} واجباً`)
    await load()
  }

  const tasksOf = (memberId: string) => tasks.filter((task) => task.member_id === memberId)

  return (
    <section className="page">
      <PageHeader
        title="الواجبات الفردية التعبدية"
        description="واجبات متفق عليها مع كل عضو على حدة، ضمن فترة محددة."
      />

      <ErrorBanner message={membersError ?? error} />

      <div className="card">
        <PeriodPicker value={period} onChange={setPeriod} />
        <div className="card__footer">
          <span className="hint">الفترة المعروضة: {formatRange(period.start, period.end)}</span>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={copying || loading}
            onClick={() => void copyFromPrevious()}
          >
            {copying ? 'جارٍ النسخ…' : 'نسخ واجبات الفترة السابقة'}
          </button>
        </div>
      </div>

      {membersLoading || loading ? <Loading /> : null}

      {!membersLoading && members.length === 0 ? (
        <EmptyState title="لا يوجد أعضاء نشطون" hint="أضف الأعضاء من صفحة «الأعضاء» أولاً." />
      ) : null}

      {!loading && members.length > 0 ? (
        <div className="task-grid">
          {members.map((member) => {
            const memberTasks = tasksOf(member.id)
            const done = memberTasks.filter((task) => task.status === 'منجز').length
            return (
              <div key={member.id} className="card task-card">
                <div className="task-card__header">
                  <h3 className="task-card__name">{member.full_name}</h3>
                  <span className={`pill pill--${done === memberTasks.length && memberTasks.length > 0 ? 'good' : 'neutral'}`}>
                    {done} / {memberTasks.length}
                  </span>
                </div>

                {memberTasks.length === 0 ? (
                  <p className="hint">لا واجبات في هذه الفترة.</p>
                ) : (
                  <ul className="task-list">
                    {memberTasks.map((task) => (
                      <li key={task.id} className="task-list__item">
                        <CommitInput
                          value={task.description}
                          ariaLabel="وصف الواجب"
                          onCommit={(description) => {
                            const trimmed = description.trim()
                            if (trimmed) void updateTask(task.id, { description: trimmed })
                          }}
                        />
                        <div className="task-list__controls">
                          <StatusPicker
                            compact
                            options={TASK_OPTIONS}
                            value={task.status as TaskStatus}
                            onChange={(status) => void updateTask(task.id, { status })}
                          />
                          <button
                            type="button"
                            className="btn btn--danger-ghost btn--sm"
                            onClick={() => setPendingDelete(task)}
                          >
                            حذف
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <form
                  className="task-card__add"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void addTask(member.id)
                  }}
                >
                  <input
                    className="input"
                    value={drafts[member.id] ?? ''}
                    placeholder="واجب جديد… (مثال: ورد يومي من القرآن)"
                    onChange={(event) =>
                      setDrafts((current) => ({ ...current, [member.id]: event.target.value }))
                    }
                  />
                  <button type="submit" className="btn btn--primary btn--sm">
                    إضافة
                  </button>
                </form>
              </div>
            )
          })}
        </div>
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        danger
        title="حذف الواجب"
        message={pendingDelete ? `سيتم حذف «${pendingDelete.description}».` : undefined}
        confirmLabel="حذف"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const task = pendingDelete
          setPendingDelete(null)
          if (task) void deleteTask(task.id)
        }}
      />
    </section>
  )
}
