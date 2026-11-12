import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { ATHMAN_CATALOG, type SurahSegment, type ThmounMeta } from '../data/athmanCatalog'
import { getSurahsTrackForHizb } from '../data/quranMapping'
import { errorMessage, supabase } from '../lib/supabase'
import type { HifzEvaluationLevel, HifzLatestState, HifzSessionType } from '../lib/types'
import './QuranMemorizationGrid.css'

export type MemorizationLevel = 'none' | 'weak' | 'medium' | 'mastered'

export const LEVEL_THEME: Record<MemorizationLevel, { label: string; color: string; bg: string; border: string; glow: string }> = {
  none: { label: 'غير محفوظ', color: '#94a3b8', bg: '#1e293b', border: '#334155', glow: 'transparent' },
  weak: { label: 'ضعيف / قيد الحفظ', color: '#fff', bg: '#ef4444', border: '#dc2626', glow: 'rgba(239,68,68,.35)' },
  medium: { label: 'متوسط / يتطلب مراجعة', color: '#fff', bg: '#f59e0b', border: '#d97706', glow: 'rgba(245,158,11,.35)' },
  mastered: { label: 'متقن تماماً', color: '#fff', bg: '#10b981', border: '#059669', glow: 'rgba(16,185,129,.35)' },
}

const levelFromEvaluation = (level: HifzEvaluationLevel): MemorizationLevel => level === 1 ? 'weak' : level === 2 ? 'medium' : 'mastered'

interface Props { userId?: string; onClose?: () => void; memberName?: string; onPersistenceError?: (message: string) => void }

export function QuranMemorizationGrid({ userId, onClose, memberName, onPersistenceError }: Props) {
  const { user, member: currentMember, majlisId } = useAuth()
  const targetUserId = userId || user?.id || null
  const [targetMemberId, setTargetMemberId] = useState<string | null>(null)
  const [events, setEvents] = useState<Record<number, HifzLatestState>>({})
  const [activeThmoun, setActiveThmoun] = useState<ThmounMeta | null>(null)
  const [sessionType, setSessionType] = useState<HifzSessionType>('revision')
  const [evaluation, setEvaluation] = useState<HifzEvaluationLevel>(2)
  const [filterJuz, setFilterJuz] = useState<number | 'all'>('all')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const sequenceRef = useRef(new Map<number, number>())

  useEffect(() => {
    let cancelled = false
    async function resolveMember() {
      if (!targetUserId) { if (!cancelled) setTargetMemberId(null); return }
      if (targetUserId === user?.id && currentMember) { if (!cancelled) setTargetMemberId(currentMember.id); return }
      const { data, error } = await supabase.from('members').select('id').eq('user_id', targetUserId).maybeSingle()
      if (error) { if (!cancelled) onPersistenceError?.(errorMessage(error)); return }
      if (!cancelled) setTargetMemberId(data?.id ?? null)
    }
    void resolveMember()
    return () => { cancelled = true }
  }, [targetUserId, user?.id, currentMember, onPersistenceError])

  const reload = useCallback(async (memberId = targetMemberId) => {
    if (!memberId) { setEvents({}); return }
    setLoading(true)
    const { data, error } = await supabase.from('hifz_latest_state').select('id, member_id, majlis_id, thmoun_id, session_type, evaluation_level, recorded_by, source, created_at').eq('member_id', memberId)
    setLoading(false)
    if (error) { onPersistenceError?.(errorMessage(error)); return }
    const next: Record<number, HifzLatestState> = {}
    for (const row of (data ?? []) as HifzLatestState[]) next[row.thmoun_id] = row
    setEvents(next)
  }, [onPersistenceError, targetMemberId])

  useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 0)
    return () => window.clearTimeout(timer)
  }, [reload])
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !saving) setActiveThmoun(null) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [saving])

  const progress = useMemo(() => Object.fromEntries(Object.entries(events).map(([id, event]) => [id, levelFromEvaluation(event.evaluation_level)])) as Record<number, MemorizationLevel>, [events])
  const stats = useMemo(() => {
    const values = Object.values(progress)
    const mastered = values.filter((level) => level === 'mastered').length
    const medium = values.filter((level) => level === 'medium').length
    const weak = values.filter((level) => level === 'weak').length
    return { mastered, medium, weak, percentage: ((mastered / 480) * 100).toFixed(1) }
  }, [progress])
  const ahzab = useMemo(() => Array.from({ length: 60 }, (_, index) => {
    const hizb = index + 1
    return [hizb, ATHMAN_CATALOG.filter((item) => item.hizb === hizb)] as const
  }), [])
  const visibleAhzab = useMemo(() => filterJuz === 'all' ? ahzab : ahzab.filter(([h]) => h === (filterJuz - 1) * 2 + 1 || h === filterJuz * 2), [ahzab, filterJuz])

  const saveSession = async () => {
    if (!activeThmoun || !targetMemberId || !majlisId || saving) return
    const thmounId = activeThmoun.id
    const sequence = (sequenceRef.current.get(thmounId) ?? 0) + 1
    sequenceRef.current.set(thmounId, sequence)
    const previous = events[thmounId]
    const optimistic: HifzLatestState = { id: `optimistic-${sequence}`, member_id: targetMemberId, majlis_id: majlisId, thmoun_id: thmounId, session_type: sessionType, evaluation_level: evaluation, recorded_by: user?.id ?? null, source: 'app', created_at: new Date().toISOString() }
    setEvents((current) => ({ ...current, [thmounId]: optimistic }))
    setSaving(true)
    const { data, error } = await supabase.rpc('record_hifz_session', { _member_id: targetMemberId, _majlis_id: majlisId, _thmoun_id: thmounId, _session_type: sessionType, _evaluation_level: evaluation })
    setSaving(false)
    if (error) {
      if (sequenceRef.current.get(thmounId) === sequence) setEvents((current) => { const restored = { ...current }; if (previous) restored[thmounId] = previous; else delete restored[thmounId]; return restored })
      onPersistenceError?.('تعذّر حفظ جلسة الحفظ. تمت استعادة القيمة السابقة.')
      return
    }
    if (sequenceRef.current.get(thmounId) === sequence && data) setEvents((current) => ({ ...current, [thmounId]: data as HifzLatestState }))
    setActiveThmoun(null)
  }

  const formatSurahs = (surahs: SurahSegment[]) => surahs.map((surah) => `${surah.surahNameAr} (${surah.fromAyah}-${surah.toAyah})`).join('، ')
  const canPersist = Boolean(targetMemberId && majlisId)
  const openThmoun = (thmoun: ThmounMeta) => {
    setSessionType('revision')
    setEvaluation(events[thmoun.id]?.evaluation_level ?? 2)
    setActiveThmoun(thmoun)
  }

  return <div className="quran-tracker" dir="rtl" aria-busy={loading}>
    <div className="quran-tracker__card">
      <div className="stats-main"><div className="stats-metric"><span className="stats-number">{stats.percentage}%</span><span className="stats-caption">{memberName ? `سجل حفظ: ${memberName} (480 ثمناً)` : 'نسبة الإتقان الإجمالية (480 ثمناً)'}</span>{onClose ? <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>إغلاق الخريطة</button> : null}</div><div className="progress-bar"><div className="progress-bar__fill" style={{ width: `${stats.percentage}%` }} /></div></div>
      <div className="stats-badges"><div className="stat-pill stat-pill--mastered"><span className="dot dot--mastered" />متقن: <strong>{stats.mastered}</strong> / 480</div><div className="stat-pill stat-pill--medium"><span className="dot dot--medium" />مراجعة: <strong>{stats.medium}</strong></div><div className="stat-pill stat-pill--weak"><span className="dot dot--weak" />قيد الحفظ: <strong>{stats.weak}</strong></div></div>
      {!canPersist ? <p className="hint">اختر مجلساً نشطاً وعضواً مرتبطاً بحساب قبل تسجيل جلسة جديدة.</p> : null}
    </div>
    <div className="juz-selector" aria-label="اختيار الجزء"><button type="button" className={`juz-btn ${filterJuz === 'all' ? 'juz-btn--active' : ''}`} onClick={() => setFilterJuz('all')}>كامل المصحف</button>{Array.from({ length: 30 }, (_, index) => index + 1).map((juz) => <button key={juz} type="button" className={`juz-btn ${filterJuz === juz ? 'juz-btn--active' : ''}`} onClick={() => setFilterJuz(juz)}>الجزء {juz}</button>)}</div>
    <div className="ahzab-grid">{visibleAhzab.map(([hizbNumber, athman]) => <div key={hizbNumber} className="hizb-card"><div className="hizb-card__header"><span className="hizb-title">الحزب {hizbNumber}</span><span className="hizb-score">{athman.filter((item) => progress[item.id] === 'mastered').length} / 8</span></div><div className="sourates-track" aria-label={`سور الحزب ${hizbNumber}`}>{getSurahsTrackForHizb(hizbNumber).map((span, index) => <div key={`${span.surahNumber}-${index}`} className={`surah-indicator-bar ${span.flexWeight <= 1.2 ? 'surah-indicator-bar--compact' : ''}`} style={{ flex: span.flexWeight }} title={`سورة ${span.surahNameAr}`}><span className="surah-indicator-label">{span.surahNameAr}{span.clusterSurahs && span.clusterSurahs.length > 1 ? <span className="surah-cluster-count">+{span.clusterSurahs.length - 1}</span> : null}</span></div>)}</div><div className="athman-row">{athman.map((thmoun) => { const level = progress[thmoun.id] ?? 'none'; const theme = LEVEL_THEME[level]; return <button key={thmoun.id} type="button" className="cube-btn" style={{ backgroundColor: theme.bg, borderColor: theme.border, boxShadow: `0 2px 8px ${theme.glow}` }} title={`ثمن ${thmoun.quarter}: ${thmoun.surahsSummary}`} onClick={() => openThmoun(thmoun)}><span className="cube-btn__idx">{thmoun.quarter}</span></button> })}</div></div>)}</div>
    {activeThmoun ? <div className="popover-backdrop" role="presentation" onMouseDown={() => !saving && setActiveThmoun(null)}><section className="hifz-dialog" role="dialog" aria-modal="true" aria-labelledby="hifz-dialog-title" onMouseDown={(event) => event.stopPropagation()}><header className="popover-header"><span className="popover-tag">الحزب {activeThmoun.hizb} — {activeThmoun.quarterLabelAr}</span><h3 id="hifz-dialog-title" className="popover-snippet">« {activeThmoun.startSnippetAr} »</h3><p className="popover-surahs">{formatSurahs(activeThmoun.surahs)}</p></header><div className="hifz-dialog__body"><fieldset><legend>نوع الجلسة</legend><div className="popover-choices"><button autoFocus type="button" className={`level-choice-btn ${sessionType === 'nouvelle_memorisation' ? 'level-choice-btn--current' : ''}`} onClick={() => setSessionType('nouvelle_memorisation')}>حفظ جديد</button><button type="button" className={`level-choice-btn ${sessionType === 'revision' ? 'level-choice-btn--current' : ''}`} onClick={() => setSessionType('revision')}>مراجعة</button></div></fieldset><fieldset><legend>التقييم</legend><div className="popover-choices">{([1, 2, 3] as HifzEvaluationLevel[]).map((level) => <button key={level} type="button" className={`level-choice-btn ${evaluation === level ? 'level-choice-btn--current' : ''}`} style={{ backgroundColor: LEVEL_THEME[levelFromEvaluation(level)].bg }} onClick={() => setEvaluation(level)}>{LEVEL_THEME[levelFromEvaluation(level)].label}</button>)}</div></fieldset>{events[activeThmoun.id] ? <p className="hint">آخر تقييم: {LEVEL_THEME[levelFromEvaluation(events[activeThmoun.id].evaluation_level)].label} — {new Intl.DateTimeFormat('ar-MA', { dateStyle: 'medium' }).format(new Date(events[activeThmoun.id].created_at))}</p> : null}</div><footer className="modal__actions"><button type="button" className="btn btn--ghost" disabled={saving} onClick={() => setActiveThmoun(null)}>إلغاء</button><button type="button" className="btn btn--primary" disabled={!canPersist || saving} onClick={() => void saveSession()}>{saving ? 'جارٍ الحفظ…' : 'تسجيل الجلسة'}</button></footer></section></div> : null}
  </div>
}
