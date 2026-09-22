import { useCallback, useEffect, useState } from 'react'
import type { Period } from '../components/PeriodPicker'
import {
  ATTENDANCE_OPTIONS,
  COMPLETION_OPTIONS,
  PREPARATION_OPTIONS,
  READING_OPTIONS,
  TASK_OPTIONS,
  scoreOf,
  type IndicatorKey,
} from '../lib/constants'
import { addScore, emptyBucket, type Bucket } from '../lib/scoring'
import { errorMessage, supabase } from '../lib/supabase'
import type {
  AttendanceRecord,
  Book,
  BookProgress,
  IndividualTask,
  MemorizationRecord,
  PreparationRecord,
  QuranRecord,
  Session,
} from '../lib/types'

export type MemberScores = Record<IndicatorKey, Bucket>

/** Détail des statuts saisis, pour la vue « un seul membre ». */
export type MemberDetails = Partial<Record<IndicatorKey, Record<string, number>>>

export interface DashboardData {
  scores: Record<string, MemberScores>
  details: Record<string, MemberDetails>
  weeklySessions: number
  councilSessions: number
  loading: boolean
  error: string | null
  refresh: () => void
}

export function emptyScores(): MemberScores {
  return {
    attendance: emptyBucket(),
    preparation: emptyBucket(),
    memorization: emptyBucket(),
    tasks: emptyBucket(),
    quran: emptyBucket(),
    council: emptyBucket(),
    books: emptyBucket(),
  }
}

async function selectIn<T>(table: string, column: string, values: string[]): Promise<T[]> {
  if (values.length === 0) return []
  const { data, error } = await supabase.from(table).select('*').in(column, values)
  if (error) throw error
  return (data ?? []) as T[]
}

export function useDashboardData(period: Period): DashboardData {
  const [scores, setScores] = useState<Record<string, MemberScores>>({})
  const [details, setDetails] = useState<Record<string, MemberDetails>>({})
  const [weeklySessions, setWeeklySessions] = useState(0)
  const [councilSessions, setCouncilSessions] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id, type, session_date')
        .gte('session_date', period.start)
        .lte('session_date', period.end)
      if (sessionError) throw sessionError

      const sessions = (sessionData ?? []) as Pick<Session, 'id' | 'type' | 'session_date'>[]
      const councilIds = sessions.filter((s) => s.type === 'مجلس داخلي').map((s) => s.id)
      const weeklyIds = sessions.filter((s) => s.type !== 'مجلس داخلي').map((s) => s.id)
      const councilSet = new Set(councilIds)

      const [attendanceRows, preparationRows, memorizationRows] = await Promise.all([
        selectIn<AttendanceRecord>('attendance', 'session_id', [...weeklyIds, ...councilIds]),
        selectIn<PreparationRecord>('preparation', 'session_id', weeklyIds),
        selectIn<MemorizationRecord>('memorization_texts', 'session_id', weeklyIds),
      ])

      const [taskResult, quranResult, bookResult, progressResult] = await Promise.all([
        supabase
          .from('individual_tasks')
          .select('*')
          .lte('period_start', period.end)
          .gte('period_end', period.start),
        supabase
          .from('quran_memorization')
          .select('*')
          .gte('entry_date', period.start)
          .lte('entry_date', period.end),
        supabase.from('books').select('id').eq('is_active', true),
        supabase.from('book_reading_progress').select('*'),
      ])

      const firstError =
        taskResult.error ?? quranResult.error ?? bookResult.error ?? progressResult.error
      if (firstError) throw firstError

      const taskRows = (taskResult.data ?? []) as IndividualTask[]
      const quranRows = (quranResult.data ?? []) as QuranRecord[]
      const activeBookIds = new Set(((bookResult.data ?? []) as Pick<Book, 'id'>[]).map((b) => b.id))
      const progressRows = ((progressResult.data ?? []) as BookProgress[]).filter((row) =>
        activeBookIds.has(row.book_id),
      )

      const nextScores: Record<string, MemberScores> = {}
      const nextDetails: Record<string, MemberDetails> = {}

      const bucketOf = (memberId: string, key: IndicatorKey) => {
        nextScores[memberId] ??= emptyScores()
        return nextScores[memberId][key]
      }

      const countDetail = (memberId: string, key: IndicatorKey, status: string) => {
        nextDetails[memberId] ??= {}
        nextDetails[memberId][key] ??= {}
        const bucket = nextDetails[memberId][key]
        bucket[status] = (bucket[status] ?? 0) + 1
      }

      for (const row of attendanceRows) {
        const key: IndicatorKey = councilSet.has(row.session_id) ? 'council' : 'attendance'
        addScore(bucketOf(row.member_id, key), scoreOf(ATTENDANCE_OPTIONS, row.status))
        countDetail(row.member_id, key, row.status)
      }

      for (const row of preparationRows) {
        addScore(bucketOf(row.member_id, 'preparation'), scoreOf(PREPARATION_OPTIONS, row.status))
        countDetail(row.member_id, 'preparation', row.status)
      }

      for (const row of memorizationRows) {
        addScore(bucketOf(row.member_id, 'memorization'), scoreOf(COMPLETION_OPTIONS, row.status))
        countDetail(row.member_id, 'memorization', row.status)
      }

      for (const row of taskRows) {
        addScore(bucketOf(row.member_id, 'tasks'), scoreOf(TASK_OPTIONS, row.status))
        countDetail(row.member_id, 'tasks', row.status)
      }

      for (const row of quranRows) {
        addScore(bucketOf(row.member_id, 'quran'), scoreOf(COMPLETION_OPTIONS, row.status))
        countDetail(row.member_id, 'quran', row.status)
      }

      for (const row of progressRows) {
        addScore(bucketOf(row.member_id, 'books'), scoreOf(READING_OPTIONS, row.status))
        countDetail(row.member_id, 'books', row.status)
      }

      setScores(nextScores)
      setDetails(nextDetails)
      setWeeklySessions(weeklyIds.length)
      setCouncilSessions(councilIds.length)
      setError(null)
    } catch (caught) {
      setError(errorMessage(caught))
    }
    setLoading(false)
  }, [period.start, period.end])

  useEffect(() => {
    void load()
  }, [load])

  return {
    scores,
    details,
    weeklySessions,
    councilSessions,
    loading,
    error,
    refresh: () => void load(),
  }
}
