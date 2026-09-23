import type { Period } from '../components/PeriodPicker'
import {
  ATTENDANCE_OPTIONS,
  COMPLETION_OPTIONS,
  PREPARATION_OPTIONS,
  TASK_ENTRY_OPTIONS,
  scoreOf,
  type IndicatorKey,
  type TallyKey,
} from '../lib/constants'
import { addScore, emptyBucket, type Bucket } from '../lib/scoring'
import { supabase } from '../lib/supabase'
import type {
  AttendanceRecord,
  BookProgress,
  IndividualTask,
  MemorizationEntry,
  MemorizationProgram,
  MemorizationProgress,
  MemorizationTextRecord,
  PreparationRecord,
  Session,
  TaskEntry,
} from '../lib/types'
import { useAsync } from './useAsync'

export type MemberScores = Record<IndicatorKey, Bucket>
export type MemberTallies = Record<TallyKey, number>

/** Détail des statuts saisis, pour la vue « un seul membre ». */
export type MemberDetails = Partial<Record<IndicatorKey, Record<string, number>>>

export interface DashboardResult {
  scores: Record<string, MemberScores>
  tallies: Record<string, MemberTallies>
  details: Record<string, MemberDetails>
  /** Progression cumulée du حفظ, toutes périodes confondues. */
  progress: Record<string, MemorizationProgress>
  books: Record<string, BookProgress[]>
  weeklySessions: number
  councilSessions: number
  activeTasks: number
}

export function emptyScores(): MemberScores {
  return {
    attendance: emptyBucket(),
    preparation: emptyBucket(),
    texts: emptyBucket(),
    tasks: emptyBucket(),
    reading: emptyBucket(),
    council: emptyBucket(),
  }
}

export function emptyTallies(): MemberTallies {
  return { thumns: 0, answered: 0 }
}

async function selectIn<T>(table: string, column: string, values: string[]): Promise<T[]> {
  if (values.length === 0) return []
  const { data, error } = await supabase.from(table).select('*').in(column, values)
  if (error) throw error
  return (data ?? []) as T[]
}

async function selectAll<T>(table: string, columns = '*'): Promise<T[]> {
  const { data, error } = await supabase.from(table).select(columns)
  if (error) throw error
  return (data ?? []) as T[]
}

async function load(period: Period): Promise<DashboardResult> {
  // 1. Les séances de la période, pour séparer الحضور الأسبوعي du المجلس الداخلي.
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

  const [attendanceRows, preparationRows, textRows] = await Promise.all([
    selectIn<AttendanceRecord>('attendance', 'session_id', [...weeklyIds, ...councilIds]),
    selectIn<PreparationRecord>('preparation', 'session_id', weeklyIds),
    selectIn<MemorizationTextRecord>('memorization_texts', 'session_id', weeklyIds),
  ])

  // 2. Les واجبات فردية : le مشرف عام voit le détail complet des saisies.
  const [taskResult, entryResult, programResult, memoEntryResult, progressResult, bookResult] =
    await Promise.all([
      supabase.from('individual_tasks').select('*'),
      supabase
        .from('task_entries')
        .select('*')
        .gte('entry_date', period.start)
        .lte('entry_date', period.end),
      supabase.from('memorization_programs').select('id, member_id, title, is_active'),
      supabase
        .from('memorization_entries')
        .select('*')
        .gte('entry_date', period.start)
        .lte('entry_date', period.end),
      selectAll<MemorizationProgress>('memorization_progress'),
      selectAll<BookProgress>('book_reading_progress'),
    ])

  const failure =
    taskResult.error ?? entryResult.error ?? programResult.error ?? memoEntryResult.error
  if (failure) throw failure

  const tasks = (taskResult.data ?? []) as IndividualTask[]
  const entries = (entryResult.data ?? []) as TaskEntry[]
  const programs = (programResult.data ?? []) as Pick<
    MemorizationProgram,
    'id' | 'member_id' | 'title' | 'is_active'
  >[]
  const memoEntries = (memoEntryResult.data ?? []) as MemorizationEntry[]

  const taskKind = new Map(tasks.map((task) => [task.id, task.kind]))
  const programMember = new Map(programs.map((program) => [program.id, program.member_id]))

  // 3. Agrégation
  const scores: Record<string, MemberScores> = {}
  const tallies: Record<string, MemberTallies> = {}
  const details: Record<string, MemberDetails> = {}
  const answeredDays: Record<string, Set<string>> = {}

  const bucketOf = (memberId: string, key: IndicatorKey) => {
    scores[memberId] ??= emptyScores()
    return scores[memberId][key]
  }

  const tallyOf = (memberId: string): MemberTallies => {
    tallies[memberId] ??= emptyTallies()
    return tallies[memberId]
  }

  const countDetail = (memberId: string, key: IndicatorKey, status: string) => {
    details[memberId] ??= {}
    details[memberId][key] ??= {}
    const bag = details[memberId][key]
    bag[status] = (bag[status] ?? 0) + 1
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

  for (const row of textRows) {
    addScore(bucketOf(row.member_id, 'texts'), scoreOf(COMPLETION_OPTIONS, row.status))
    countDetail(row.member_id, 'texts', row.status)
  }

  for (const row of entries) {
    const key: IndicatorKey = taskKind.get(row.task_id) === 'reading' ? 'reading' : 'tasks'
    addScore(bucketOf(row.member_id, key), scoreOf(TASK_ENTRY_OPTIONS, row.status))
    countDetail(row.member_id, key, row.status)

    answeredDays[row.member_id] ??= new Set()
    answeredDays[row.member_id].add(row.entry_date)
  }

  for (const [memberId, days] of Object.entries(answeredDays)) {
    tallyOf(memberId).answered = days.size
  }

  for (const row of memoEntries) {
    const memberId = programMember.get(row.program_id)
    if (!memberId) continue
    tallyOf(memberId).thumns += row.thumn_count
  }

  const progress: Record<string, MemorizationProgress> = {}
  for (const row of progressResult) {
    // On retient le programme actif, à défaut le plus avancé.
    const current = progress[row.member_id]
    if (!current || (row.is_active && !current.is_active)) progress[row.member_id] = row
  }

  const books: Record<string, BookProgress[]> = {}
  for (const row of bookResult) {
    books[row.member_id] ??= []
    books[row.member_id].push(row)
  }

  return {
    scores,
    tallies,
    details,
    progress,
    books,
    weeklySessions: weeklyIds.length,
    councilSessions: councilIds.length,
    activeTasks: tasks.filter((task) => task.is_active).length,
  }
}

export function useDashboardData(period: Period) {
  return useAsync(() => load(period), [period.start, period.end])
}
