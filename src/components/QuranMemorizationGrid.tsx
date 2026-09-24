import { useState, useOptimistic, useTransition, useMemo, useEffect } from 'react'
import { ATHMAN_CATALOG, type ThmounMeta, type SurahSegment } from '../data/athmanCatalog'
import { getSurahsTrackForHizb } from '../data/quranMapping'
import { supabase } from '../lib/supabase'
import './QuranMemorizationGrid.css'

export type MemorizationLevel = 'none' | 'weak' | 'medium' | 'mastered'

export const LEVEL_THEME: Record<
  MemorizationLevel,
  { label: string; color: string; bg: string; border: string; glow: string }
> = {
  none: {
    label: 'غير محفوظ',
    color: '#94a3b8',
    bg: '#1e293b',
    border: '#334155',
    glow: 'transparent',
  },
  weak: {
    label: 'ضعيف / قيد الحفظ',
    color: '#ffffff',
    bg: '#ef4444',
    border: '#dc2626',
    glow: 'rgba(239, 68, 68, 0.35)',
  },
  medium: {
    label: 'متوسط / يتطلب مراجعة',
    color: '#ffffff',
    bg: '#f59e0b',
    border: '#d97706',
    glow: 'rgba(245, 158, 11, 0.35)',
  },
  mastered: {
    label: 'متقن تماماً',
    color: '#ffffff',
    bg: '#10b981',
    border: '#059669',
    glow: 'rgba(16, 185, 129, 0.35)',
  },
}

interface Props {
  userId?: string
  onClose?: () => void
  memberName?: string
}

export function QuranMemorizationGrid({ userId, onClose, memberName }: Props) {
  const effectiveUserId = userId || 'current_user'

  const [progress, setProgress] = useState<Record<number, MemorizationLevel>>(() => {
    // Initialisation depuis le stockage local (cache rapide)
    try {
      const cached = localStorage.getItem(`quran_athman_${effectiveUserId}`)
      return cached ? JSON.parse(cached) : {}
    } catch {
      return {}
    }
  })

  const [activeThmoun, setActiveThmoun] = useState<ThmounMeta | null>(null)
  const [filterJuz, setFilterJuz] = useState<number | 'all'>('all')
  const [, startTransition] = useTransition()

  // UI Optimiste : mise à jour visuelle instantanée
  const [optimisticProgress, setOptimisticProgress] = useOptimistic(
    progress,
    (state, update: { id: number; level: MemorizationLevel }) => ({
      ...state,
      [update.id]: update.level,
    }),
  )

  // Recharger le cache local si effectiveUserId change
  useEffect(() => {
    try {
      const cached = localStorage.getItem(`quran_athman_${effectiveUserId}`)
      setProgress(cached ? JSON.parse(cached) : {})
    } catch {
      setProgress({})
    }
  }, [effectiveUserId])

  // Chargement asynchrone des données depuis Supabase
  useEffect(() => {
    let cancelled = false

    async function loadRemote() {
      if (!userId) return
      try {
        const { data, error } = await supabase
          .from('quran_athman_progress')
          .select('thmoun_id, level')
          .eq('user_id', userId)

        if (!error && data && !cancelled) {
          const map: Record<number, MemorizationLevel> = {}
          data.forEach((row: { thmoun_id: number; level: MemorizationLevel }) => {
            map[row.thmoun_id] = row.level
          })
          setProgress(map)
          localStorage.setItem(`quran_athman_${effectiveUserId}`, JSON.stringify(map))
        }
      } catch (err) {
        // Fallback silencieux sur le stockage local si la table n'est pas encore migrée
        console.warn('Suivi Athman : lecture locale', err)
      }
    }

    void loadRemote()
    return () => {
      cancelled = true
    }
  }, [userId, effectiveUserId])

  // Statistiques calculées en temps réel
  const stats = useMemo(() => {
    let mastered = 0
    let medium = 0
    let weak = 0

    for (let id = 1; id <= 480; id++) {
      const lvl = optimisticProgress[id] || 'none'
      if (lvl === 'mastered') mastered++
      else if (lvl === 'medium') medium++
      else if (lvl === 'weak') weak++
    }

    const percentage = ((mastered / 480) * 100).toFixed(1)
    return { mastered, medium, weak, percentage }
  }, [optimisticProgress])

  // Regroupement des Athman par Hizb (1 à 60)
  const ahzab = useMemo(() => {
    const map = new Map<number, ThmounMeta[]>()
    for (let h = 1; h <= 60; h++) map.set(h, [])
    ATHMAN_CATALOG.forEach((item) => map.get(item.hizb)?.push(item))
    return Array.from(map.entries())
  }, [])

  // Filtrage par Juz' (chaque Juz' = 2 Ahzab)
  const visibleAhzab = useMemo(() => {
    if (filterJuz === 'all') return ahzab
    const startHizb = (filterJuz - 1) * 2 + 1
    const endHizb = startHizb + 1
    return ahzab.filter(([h]) => h === startHizb || h === endHizb)
  }, [ahzab, filterJuz])

  // Changement de niveau avec persistance optimiste
  const handleLevelChange = async (thmounId: number, level: MemorizationLevel) => {
    setActiveThmoun(null)

    // 1. Mise à jour immédiate de l'écran
    startTransition(() => {
      setOptimisticProgress({ id: thmounId, level })
    })

    const nextState = { ...progress, [thmounId]: level }
    setProgress(nextState)
    try {
      localStorage.setItem(`quran_athman_${effectiveUserId}`, JSON.stringify(nextState))
    } catch {
      // ignore
    }

    // 2. Synchronisation Supabase si userId est fourni
    if (!userId) return
    try {
      if (level === 'none') {
        await supabase
          .from('quran_athman_progress')
          .delete()
          .match({ user_id: userId, thmoun_id: thmounId })
      } else {
        await supabase.from('quran_athman_progress').upsert(
          {
            user_id: userId,
            thmoun_id: thmounId,
            level,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,thmoun_id' },
        )
      }
    } catch (err) {
      console.warn('Erreur synchronisation Supabase thmoun:', err)
    }
  }

  const formatSurahs = (surahs: SurahSegment[]) =>
    surahs.map((s) => `${s.surahNameAr} (${s.fromAyah}-${s.toAyah})`).join(' ، ')

  return (
    <div className="quran-tracker" dir="rtl">
      {/* 1. Header & Tableau de bord KPIs */}
      <div className="quran-tracker__card">
        <div className="stats-main">
          <div className="stats-metric">
            <span className="stats-number">{stats.percentage}%</span>
            <span className="stats-caption">
              {memberName ? `سجل حفظ: ${memberName} (480 ثمناً)` : 'نسبة الإتقان الإجمالية (480 ثمناً)'}
            </span>
            {onClose ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
                إغلاق الخريطة
              </button>
            ) : null}
          </div>
          <div className="progress-bar">
            <div className="progress-bar__fill" style={{ width: `${stats.percentage}%` }} />
          </div>
        </div>

        <div className="stats-badges">
          <div className="stat-pill stat-pill--mastered">
            <span className="dot dot--mastered" />
            <span>
              متقن: <strong>{stats.mastered}</strong> / 480
            </span>
          </div>
          <div className="stat-pill stat-pill--medium">
            <span className="dot dot--medium" />
            <span>
              مراجعة: <strong>{stats.medium}</strong>
            </span>
          </div>
          <div className="stat-pill stat-pill--weak">
            <span className="dot dot--weak" />
            <span>
              قيد الحفظ: <strong>{stats.weak}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Filtre rapide par Juz' (1 à 30) */}
      <div className="juz-selector" aria-label="اختيار الجزء">
        <button
          type="button"
          className={`juz-btn ${filterJuz === 'all' ? 'juz-btn--active' : ''}`}
          onClick={() => setFilterJuz('all')}
        >
          كامل المصحف (60 حزباً)
        </button>
        {Array.from({ length: 30 }, (_, i) => i + 1).map((juz) => (
          <button
            key={juz}
            type="button"
            className={`juz-btn ${filterJuz === juz ? 'juz-btn--active' : ''}`}
            onClick={() => setFilterJuz(juz)}
          >
            الجزء {juz}
          </button>
        ))}
      </div>

      {/* 3. Grille des 60 Ahzab */}
      <div className="ahzab-grid">
        {visibleAhzab.map(([hizbNumber, athman]) => {
          const masteredInHizb = athman.filter(
            (t) => optimisticProgress[t.id] === 'mastered',
          ).length
          const surahsInHizb = getSurahsTrackForHizb(hizbNumber)

          return (
            <div key={hizbNumber} className="hizb-card">
              <div className="hizb-card__header">
                <span className="hizb-title">الحزب {hizbNumber}</span>
                <span className="hizb-score">{masteredInHizb} / 8</span>
              </div>

              {/* Ligne des Sourates (Superposition géométrique sur les 8 blocs) */}
              <div className="sourates-track" aria-label={`سور الحزب ${hizbNumber}`}>
                {surahsInHizb.map((span, idx) => {
                  const flex = span.flexWeight
                  const isCompact = flex <= 1.2
                  const hasCluster = span.clusterSurahs && span.clusterSurahs.length > 1

                  const tooltip = hasCluster
                    ? `السور: ${span.clusterSurahs!.map((s) => s.name).join(' ، ')} (الثمن ${span.startQuarter})`
                    : `سورة ${span.surahNameAr} — [أثمان ${span.startQuarter === span.endQuarter ? span.startQuarter : `${span.startQuarter} إلى ${span.endQuarter}`}]`

                  return (
                    <div
                      key={`${span.surahNumber}-${idx}`}
                      className={`surah-indicator-bar ${isCompact ? 'surah-indicator-bar--compact' : ''}`}
                      style={{ flex }}
                      title={tooltip}
                    >
                      <span className="surah-indicator-label">
                        {span.surahNameAr}
                        {hasCluster && (
                          <span className="surah-cluster-count">
                            +{span.clusterSurahs!.length - 1}
                          </span>
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* 8 Cubes interactifs */}
              <div className="athman-row">
                {athman.map((thmoun) => {
                  const currentLevel = optimisticProgress[thmoun.id] || 'none'
                  const theme = LEVEL_THEME[currentLevel]

                  return (
                    <button
                      key={thmoun.id}
                      type="button"
                      className="cube-btn"
                      style={{
                        backgroundColor: theme.bg,
                        borderColor: theme.border,
                        boxShadow: `0 2px 8px ${theme.glow}`,
                      }}
                      title={`ثمن ${thmoun.quarter} : ${thmoun.surahsSummary}`}
                      onClick={() => setActiveThmoun(thmoun)}
                    >
                      <span className="cube-btn__idx">{thmoun.quarter}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* 4. Popover contextuel de sélection */}
      {activeThmoun && (
        <div className="popover-backdrop" onClick={() => setActiveThmoun(null)}>
          <div className="popover-content" onClick={(e) => e.stopPropagation()}>
            <div className="popover-header">
              <span className="popover-tag">
                الحزب {activeThmoun.hizb} — {activeThmoun.quarterLabelAr}
              </span>
              <h3 className="popover-snippet">« {activeThmoun.startSnippetAr} »</h3>
              <p className="popover-surahs">{formatSurahs(activeThmoun.surahs)}</p>
            </div>

            <div className="popover-choices">
              {(Object.keys(LEVEL_THEME) as MemorizationLevel[]).map((lvl) => {
                const conf = LEVEL_THEME[lvl]
                const isSelected = (optimisticProgress[activeThmoun.id] || 'none') === lvl

                return (
                  <button
                    key={lvl}
                    type="button"
                    className={`level-choice-btn ${isSelected ? 'level-choice-btn--current' : ''}`}
                    style={{ backgroundColor: conf.bg, color: conf.color }}
                    onClick={() => handleLevelChange(activeThmoun.id, lvl)}
                  >
                    <span>{conf.label}</span>
                    {isSelected && <span className="check-icon">✓</span>}
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              className="popover-close-btn"
              onClick={() => setActiveThmoun(null)}
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
