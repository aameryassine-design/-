import { useCallback, useEffect, useMemo, useState } from 'react'
import { CommitInput } from '../components/CommitInput'
import { EmptyState, ErrorBanner, Loading } from '../components/Feedback'
import { PageHeader } from '../components/PageHeader'
import { StatusPicker } from '../components/StatusPicker'
import { useMemberSheet } from '../hooks/useMemberSheet'
import { useMembers } from '../hooks/useMembers'
import { COMPLETION_OPTIONS } from '../lib/constants'
import { formatShortDate, todayISO } from '../lib/dates'
import { errorMessage, supabase } from '../lib/supabase'
import type { QuranRecord } from '../lib/types'

interface MemberHistory {
  totalPages: number
  last: QuranRecord | null
}

export function QuranPage() {
  const { members, loading: membersLoading, error: membersError } = useMembers()
  const [date, setDate] = useState(todayISO)
  const [history, setHistory] = useState<QuranRecord[]>([])
  const [historyError, setHistoryError] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from('quran_memorization')
      .select('*')
      .order('entry_date', { ascending: false })

    if (queryError) setHistoryError(errorMessage(queryError))
    else {
      setHistoryError(null)
      setHistory((data ?? []) as QuranRecord[])
    }
  }, [])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  const { rows, loading, error, pending, save } = useMemberSheet<QuranRecord>(
    'quran_memorization',
    { entry_date: date },
    'member_id,entry_date',
  )

  const saveAndRefresh = async (memberId: string, patch: Partial<QuranRecord>) => {
    const saved = await save(memberId, patch)
    if (saved) void loadHistory()
  }

  const byMember = useMemo(() => {
    const summary = new Map<string, MemberHistory>()
    for (const record of history) {
      const current = summary.get(record.member_id) ?? { totalPages: 0, last: null }
      current.totalPages += Number(record.pages_done ?? 0)
      if (record.entry_date < date && (!current.last || record.entry_date > current.last.entry_date)) {
        current.last = record
      }
      summary.set(record.member_id, current)
    }
    return summary
  }, [history, date])

  const recentDates = useMemo(() => {
    const dates = [...new Set(history.map((record) => record.entry_date))]
    return dates.slice(0, 6)
  }, [history])

  const totalPagesOfDay = members.reduce(
    (total, member) => total + Number(rows[member.id]?.pages_done ?? 0),
    0,
  )

  return (
    <section className="page">
      <PageHeader
        title="برنامج الحفظ"
        description="تسجيل المقرر والمنجَز من الحفظ في تاريخ معيّن، مع تراكم عدد الصفحات."
      />

      <ErrorBanner message={membersError ?? error ?? historyError} />

      <div className="card">
        <div className="period-picker__range">
          <label>
            <span className="label">تاريخ التسجيل</span>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <button type="button" className="btn btn--ghost" onClick={() => setDate(todayISO())}>
            اليوم
          </button>
        </div>

        {recentDates.length > 0 ? (
          <div className="chip-row">
            <span className="hint">تسجيلات سابقة:</span>
            {recentDates.map((item) => (
              <button
                key={item}
                type="button"
                className={`btn btn--tab btn--sm${item === date ? ' is-active' : ''}`}
                onClick={() => setDate(item)}
              >
                {formatShortDate(item)}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {membersLoading || loading ? <Loading /> : null}

      {!membersLoading && members.length === 0 ? (
        <EmptyState title="لا يوجد أعضاء نشطون" hint="أضف الأعضاء من صفحة «الأعضاء» أولاً." />
      ) : null}

      {!loading && members.length > 0 ? (
        <>
          <div className="sheet-toolbar">
            <span className="pill">
              مجموع صفحات اليوم: {totalPagesOfDay.toLocaleString('ar-MA-u-nu-latn')}
            </span>
            <span className="pill">
              عدد المسجّلين: {members.filter((member) => rows[member.id]).length} / {members.length}
            </span>
          </div>

          <div className="table-wrap">
            <table className="sheet">
              <thead>
                <tr>
                  <th className="sheet__col-name">العضو</th>
                  <th className="sheet__col-note">المقرر</th>
                  <th className="sheet__col-note">المنجَز</th>
                  <th>الصفحات</th>
                  <th>الحالة</th>
                  <th>التراكم</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const row = rows[member.id]
                  const summary = byMember.get(member.id)
                  return (
                    <tr key={member.id} className={pending.includes(member.id) ? 'is-saving' : ''}>
                      <td className="sheet__name">
                        {member.full_name}
                        {summary?.last ? (
                          <span className="sheet__hint">
                            آخر تسجيل {formatShortDate(summary.last.entry_date)}:{' '}
                            {summary.last.achieved_portion || summary.last.planned_portion || '—'}
                          </span>
                        ) : null}
                      </td>
                      <td>
                        <CommitInput
                          value={row?.planned_portion ?? ''}
                          ariaLabel={`المقرر ${member.full_name}`}
                          placeholder="مثال: البقرة 1-20"
                          onCommit={(value) =>
                            void saveAndRefresh(member.id, { planned_portion: value.trim() || null })
                          }
                        />
                      </td>
                      <td>
                        <CommitInput
                          value={row?.achieved_portion ?? ''}
                          ariaLabel={`المنجز ${member.full_name}`}
                          placeholder="ما تم فعلاً"
                          onCommit={(value) =>
                            void saveAndRefresh(member.id, {
                              achieved_portion: value.trim() || null,
                            })
                          }
                        />
                      </td>
                      <td className="sheet__col-narrow">
                        <CommitInput
                          type="number"
                          step="0.25"
                          min="0"
                          value={row?.pages_done != null ? String(row.pages_done) : ''}
                          ariaLabel={`الصفحات ${member.full_name}`}
                          placeholder="0"
                          onCommit={(value) =>
                            void saveAndRefresh(member.id, {
                              pages_done: value.trim() === '' ? null : Number(value),
                            })
                          }
                        />
                      </td>
                      <td>
                        <StatusPicker
                          compact
                          options={COMPLETION_OPTIONS}
                          value={row?.status ?? null}
                          onChange={(status) => void saveAndRefresh(member.id, { status })}
                        />
                      </td>
                      <td className="sheet__total">
                        {(summary?.totalPages ?? 0).toLocaleString('ar-MA-u-nu-latn')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  )
}
