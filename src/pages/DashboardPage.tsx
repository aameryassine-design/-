import { useMemo, useState } from 'react'
import { EmptyState, ErrorBanner, Loading } from '../components/Feedback'
import { PageHeader } from '../components/PageHeader'
import { currentMonth, PeriodPicker, type Period } from '../components/PeriodPicker'
import { emptyScores, useDashboardData } from '../hooks/useDashboardData'
import { useMembers } from '../hooks/useMembers'
import { INDICATORS } from '../lib/constants'
import { formatRange } from '../lib/dates'
import { average, bucketRatio, formatPct, ratioTone } from '../lib/scoring'

export function DashboardPage() {
  const { members, loading: membersLoading, error: membersError } = useMembers()
  const [period, setPeriod] = useState<Period>(currentMonth)
  const [selectedMember, setSelectedMember] = useState('')

  const { scores, details, weeklySessions, councilSessions, loading, error, refresh } =
    useDashboardData(period)

  const rows = useMemo(() => {
    const source = selectedMember
      ? members.filter((member) => member.id === selectedMember)
      : members

    return source.map((member) => {
      const memberScores = scores[member.id] ?? emptyScores()
      const ratios = INDICATORS.map((indicator) => bucketRatio(memberScores[indicator.key]))
      return {
        member,
        memberScores,
        ratios,
        global: average(ratios),
      }
    })
  }, [members, scores, selectedMember])

  const groupAverages = useMemo(
    () =>
      INDICATORS.map((indicator) =>
        average(
          members.map((member) => bucketRatio((scores[member.id] ?? emptyScores())[indicator.key])),
        ),
      ),
    [members, scores],
  )

  const groupGlobal = average(groupAverages)

  const strugglers = useMemo(
    () =>
      INDICATORS.map((indicator) => ({
        indicator,
        members: members.filter((member) => {
          const ratio = bucketRatio((scores[member.id] ?? emptyScores())[indicator.key])
          return ratio !== null && ratio < 0.5
        }),
      })).filter((entry) => entry.members.length > 0),
    [members, scores],
  )

  return (
    <section className="page">
      <PageHeader
        title="البيان"
        description="حصيلة المحاور السبعة لكل عضو وللمجموعة خلال الفترة المختارة."
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
            {formatRange(period.start, period.end)} — {weeklySessions} حصة أسبوعية،{' '}
            {councilSessions} مجلس داخلي
          </span>
        </div>
      </div>

      {loading || membersLoading ? <Loading /> : null}

      {!membersLoading && members.length === 0 ? (
        <EmptyState title="لا يوجد أعضاء نشطون" hint="أضف الأعضاء من صفحة «الأعضاء» أولاً." />
      ) : null}

      {!loading && members.length > 0 ? (
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
                </tr>
              </thead>
              <tbody>
                {rows.map(({ member, memberScores, ratios, global }) => (
                  <tr key={member.id}>
                    <td className="sheet__name">{member.full_name}</td>
                    {INDICATORS.map((indicator, index) => {
                      const ratio = ratios[index]
                      const bucket = memberScores[indicator.key]
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedMember ? (
            <div className="card">
              <h3 className="card__title">تفصيل الحالات</h3>
              <div className="detail-grid">
                {INDICATORS.map((indicator) => {
                  const breakdown = details[selectedMember]?.[indicator.key]
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
              </div>
            </div>
          ) : null}

          {!selectedMember && strugglers.length > 0 ? (
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
            الحساب: حاضر/حضّر/تم/منجز/أنهى = 100٪، متأخر/جزئياً/قيد القراءة = 50٪، غائب/لم
            يحضّر/لم يتم/غير منجز/لم يبدأ = 0٪. حالة «معذور» مستثناة من الحساب. المحاور غير المسجَّلة
            في الفترة تظهر «—» ولا تدخل في المعدل.
          </p>
        </>
      ) : null}
    </section>
  )
}
