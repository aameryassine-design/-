import { useMemo, useState } from 'react'
import { EmptyState, ErrorBanner, Loading } from '../components/Feedback'
import { PageHeader } from '../components/PageHeader'
import { currentMonth, PeriodPicker, type Period } from '../components/PeriodPicker'
import {
  emptyScores,
  emptyTallies,
  useDashboardData,
  type MemberScores,
} from '../hooks/useDashboardData'
import { useMembers } from '../hooks/useMembers'
import { INDICATORS, TALLIES } from '../lib/constants'
import { formatRange, formatShortDate } from '../lib/dates'
import { average, bucketRatio, formatPct, ratioTone } from '../lib/scoring'

export function DashboardPage() {
  const { members, loading: membersLoading, error: membersError } = useMembers()
  const [period, setPeriod] = useState<Period>(currentMonth)
  const [selectedMember, setSelectedMember] = useState('')

  const { data, loading, error, refresh } = useDashboardData(period)

  const scoresOf = (memberId: string): MemberScores => data?.scores[memberId] ?? emptyScores()
  const talliesOf = (memberId: string) => data?.tallies[memberId] ?? emptyTallies()

  const rows = useMemo(() => {
    const source = selectedMember
      ? members.filter((member) => member.id === selectedMember)
      : members

    return source.map((member) => {
      const scores = data?.scores[member.id] ?? emptyScores()
      const ratios = INDICATORS.map((indicator) => bucketRatio(scores[indicator.key]))
      return {
        member,
        scores,
        tallies: data?.tallies[member.id] ?? emptyTallies(),
        ratios,
        global: average(ratios),
      }
    })
  }, [members, data, selectedMember])

  const groupAverages = useMemo(
    () =>
      INDICATORS.map((indicator) =>
        average(members.map((member) => bucketRatio(scoresOf(member.id)[indicator.key]))),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [members, data],
  )

  const groupTallies = useMemo(
    () =>
      TALLIES.map((tally) =>
        members.reduce((total, member) => total + talliesOf(member.id)[tally.key], 0),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [members, data],
  )

  const groupGlobal = average(groupAverages)

  const strugglers = useMemo(
    () =>
      INDICATORS.map((indicator) => ({
        indicator,
        members: members.filter((member) => {
          const ratio = bucketRatio(scoresOf(member.id)[indicator.key])
          return ratio !== null && ratio < 0.5
        }),
      })).filter((entry) => entry.members.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [members, data],
  )

  const selected = members.find((member) => member.id === selectedMember) ?? null
  const progress = selectedMember ? data?.progress[selectedMember] : null
  const books = selectedMember ? (data?.books[selectedMember] ?? []) : []

  return (
    <section className="page">
      <PageHeader
        title="البيان"
        description="حصيلة كل المحاور لكل عضو وللمجموعة خلال الفترة المختارة، بما فيها تفصيل الواجبات الفردية."
      >
        <button type="button" className="btn btn--ghost" onClick={refresh} disabled={loading}>
          تحديث
        </button>
      </PageHeader>

      <ErrorBanner message={membersError ?? error} />

      <div className="card">
        <PeriodPicker value={period} onChange={setPeriod} showQuarter />
        <div className="card__footer">
          <label className="inline-field">
            <span className="label">العضو</span>
            <select
              className="input"
              value={selectedMember}
              onChange={(event) => setSelectedMember(event.target.value)}
            >
              <option value="">كل الأعضاء</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
            </select>
          </label>
          <span className="hint">
            {formatRange(period.start, period.end)} — {data?.weeklySessions ?? 0} حصة أسبوعية،{' '}
            {data?.councilSessions ?? 0} مجلس داخلي، {data?.activeTasks ?? 0} واجباً نشطاً
          </span>
        </div>
      </div>

      {loading || membersLoading ? <Loading /> : null}

      {!membersLoading && members.length === 0 ? (
        <EmptyState title="لا يوجد أعضاء نشطون" hint="أضف الأعضاء من صفحة «الأعضاء» أولاً." />
      ) : null}

      {!loading && data && members.length > 0 ? (
        <>
          <div className="summary-grid">
            <div className="card summary-card summary-card--total">
              <span className="summary-card__label">المعدل العام للمجموعة</span>
              <span className={`summary-card__value tone-${ratioTone(groupGlobal)}`}>
                {formatPct(groupGlobal)}
              </span>
            </div>

            {INDICATORS.map((indicator, index) => {
              const ratio = groupAverages[index]
              return (
                <div key={indicator.key} className="card summary-card">
                  <span className="summary-card__label">{indicator.label}</span>
                  <span className={`summary-card__value tone-${ratioTone(ratio)}`}>
                    {formatPct(ratio)}
                  </span>
                  <div className="bar" aria-hidden="true">
                    <span
                      className={`bar__fill bar__fill--${ratioTone(ratio)}`}
                      style={{ width: `${Math.round((ratio ?? 0) * 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}

            {TALLIES.map((tally, index) => (
              <div key={tally.key} className="card summary-card">
                <span className="summary-card__label">{tally.label}</span>
                <span className="summary-card__value">
                  {groupTallies[index]} <small>{tally.unit}</small>
                </span>
              </div>
            ))}
          </div>

          <div className="table-wrap">
            <table className="sheet sheet--matrix">
              <thead>
                <tr>
                  <th className="sheet__col-name">العضو</th>
                  {INDICATORS.map((indicator) => (
                    <th key={indicator.key} title={indicator.label}>
                      {indicator.short}
                    </th>
                  ))}
                  <th>المعدل</th>
                  {TALLIES.map((tally) => (
                    <th key={tally.key} title={tally.label}>
                      {tally.short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ member, scores, tallies, ratios, global }) => (
                  <tr key={member.id}>
                    <td className="sheet__name">{member.full_name}</td>
                    {INDICATORS.map((indicator, index) => {
                      const ratio = ratios[index]
                      const bucket = scores[indicator.key]
                      return (
                        <td key={indicator.key} className={`cell tone-${ratioTone(ratio)}`}>
                          <span className="cell__value">{formatPct(ratio)}</span>
                          {bucket.count > 0 ? (
                            <span className="cell__count">{bucket.count} تسجيل</span>
                          ) : null}
                        </td>
                      )
                    })}
                    <td className={`cell cell--total tone-${ratioTone(global)}`}>
                      {formatPct(global)}
                    </td>
                    {TALLIES.map((tally) => (
                      <td key={tally.key} className="cell sheet__total">
                        {tallies[tally.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selected ? (
            <div className="card">
              <h3 className="card__title">تفصيل «{selected.full_name}»</h3>
              <div className="detail-grid">
                {INDICATORS.map((indicator) => {
                  const breakdown = data.details[selected.id]?.[indicator.key]
                  return (
                    <div key={indicator.key} className="detail-card">
                      <span className="detail-card__label">{indicator.label}</span>
                      {breakdown ? (
                        <ul className="detail-card__list">
                          {Object.entries(breakdown).map(([status, count]) => (
                            <li key={status}>
                              <span>{status}</span>
                              <strong>{count}</strong>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="hint">لا تسجيلات</span>
                      )}
                    </div>
                  )
                })}

                <div className="detail-card">
                  <span className="detail-card__label">برنامج الحفظ (تراكمي)</span>
                  {progress ? (
                    <ul className="detail-card__list">
                      <li>
                        <span>البرنامج</span>
                        <strong>{progress.title}</strong>
                      </li>
                      <li>
                        <span>مجموع الأثمان</span>
                        <strong>{progress.total_thumns}</strong>
                      </li>
                      <li>
                        <span>الموضع الحالي</span>
                        <strong>{progress.current_position ?? '—'}</strong>
                      </li>
                      <li>
                        <span>آخر تسجيل</span>
                        <strong>
                          {progress.last_entry_date
                            ? formatShortDate(progress.last_entry_date)
                            : '—'}
                        </strong>
                      </li>
                    </ul>
                  ) : (
                    <span className="hint">لا برنامج حفظ</span>
                  )}
                </div>

                <div className="detail-card">
                  <span className="detail-card__label">قراءة الكتب</span>
                  {books.length > 0 ? (
                    <ul className="detail-card__list">
                      {books.map((row) => (
                        <li key={row.id}>
                          <span>{row.status}</span>
                          <strong>{row.last_page ? `ص ${row.last_page}` : '—'}</strong>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="hint">لا متابعة مسجّلة</span>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {!selected && strugglers.length > 0 ? (
            <div className="card">
              <h3 className="card__title">أعضاء يحتاجون متابعة (أقل من 50٪)</h3>
              <ul className="struggler-list">
                {strugglers.map(({ indicator, members: weak }) => (
                  <li key={indicator.key}>
                    <span className="struggler-list__indicator">{indicator.label}</span>
                    <span className="struggler-list__names">
                      {weak.map((member) => member.full_name).join('، ')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="legend">
            الحساب: حاضر/حضّر/تم/أنجزت = 100٪، متأخر/جزئياً = 50٪، غائب/لم يحضّر/لم يتم/لم أنجز =
            0٪، و«معذور» مستثناة. الواجب الذي لم يُسجَّل أصلاً («لم يجب») لا يدخل في النسبة، لكنه
            يظهر في عمود «أيام الإجابة». الأثمان تُحسب عدداً لا نسبة.
          </p>
        </>
      ) : null}
    </section>
  )
}
