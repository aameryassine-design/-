import type {
  AttendanceStatus,
  CompletionStatus,
  PreparationStatus,
  ReadingStatus,
  TaskStatus,
} from './types'

export type Tone = 'good' | 'mid' | 'bad' | 'neutral'

export interface StatusOption<T extends string> {
  value: T
  tone: Tone
  /** Poids dans le calcul du bilan. `null` = exclu du dénominateur (ex. معذور). */
  score: number | null
}

export const ATTENDANCE_OPTIONS: readonly StatusOption<AttendanceStatus>[] = [
  { value: 'حاضر', tone: 'good', score: 1 },
  { value: 'متأخر', tone: 'mid', score: 0.5 },
  { value: 'معذور', tone: 'neutral', score: null },
  { value: 'غائب', tone: 'bad', score: 0 },
]

export const COUNCIL_OPTIONS: readonly StatusOption<AttendanceStatus>[] = [
  { value: 'حاضر', tone: 'good', score: 1 },
  { value: 'معذور', tone: 'neutral', score: null },
  { value: 'غائب', tone: 'bad', score: 0 },
]

export const PREPARATION_OPTIONS: readonly StatusOption<PreparationStatus>[] = [
  { value: 'حضّر', tone: 'good', score: 1 },
  { value: 'جزئياً', tone: 'mid', score: 0.5 },
  { value: 'لم يحضّر', tone: 'bad', score: 0 },
]

export const COMPLETION_OPTIONS: readonly StatusOption<CompletionStatus>[] = [
  { value: 'تم', tone: 'good', score: 1 },
  { value: 'جزئياً', tone: 'mid', score: 0.5 },
  { value: 'لم يتم', tone: 'bad', score: 0 },
]

export const TASK_OPTIONS: readonly StatusOption<TaskStatus>[] = [
  { value: 'منجز', tone: 'good', score: 1 },
  { value: 'جزئياً', tone: 'mid', score: 0.5 },
  { value: 'غير منجز', tone: 'bad', score: 0 },
]

export const READING_OPTIONS: readonly StatusOption<ReadingStatus>[] = [
  { value: 'أنهى', tone: 'good', score: 1 },
  { value: 'قيد القراءة', tone: 'mid', score: 0.5 },
  { value: 'لم يبدأ', tone: 'bad', score: 0 },
]

export function scoreOf<T extends string>(
  options: readonly StatusOption<T>[],
  value: T | null | undefined,
): number | null {
  if (!value) return null
  return options.find((option) => option.value === value)?.score ?? null
}

export interface NavItem {
  to: string
  label: string
  short: string
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'البيان', short: 'البيان' },
  { to: '/members', label: 'الأعضاء', short: 'الأعضاء' },
  { to: '/attendance', label: 'الحضور الأسبوعي', short: 'الحضور' },
  { to: '/preparation', label: 'مسألة التحضير', short: 'التحضير' },
  { to: '/memorization', label: 'حفظ النصوص المقررة', short: 'النصوص' },
  { to: '/tasks', label: 'الواجبات الفردية', short: 'الواجبات' },
  { to: '/quran', label: 'برنامج الحفظ', short: 'الحفظ' },
  { to: '/council', label: 'المجلس الداخلي', short: 'المجلس' },
  { to: '/books', label: 'قراءة الكتب', short: 'الكتب' },
]

/** Les 7 indicateurs du bilan, dans l'ordre d'affichage. */
export const INDICATORS = [
  { key: 'attendance', label: 'الحضور الأسبوعي', short: 'الحضور' },
  { key: 'preparation', label: 'مسألة التحضير', short: 'التحضير' },
  { key: 'memorization', label: 'حفظ النصوص', short: 'النصوص' },
  { key: 'tasks', label: 'الواجبات الفردية', short: 'الواجبات' },
  { key: 'quran', label: 'برنامج الحفظ', short: 'الحفظ' },
  { key: 'council', label: 'المجلس الداخلي', short: 'المجلس' },
  { key: 'books', label: 'قراءة الكتب', short: 'الكتب' },
] as const

export type IndicatorKey = (typeof INDICATORS)[number]['key']
