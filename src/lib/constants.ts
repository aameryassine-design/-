import type {
  AttendanceStatus,
  CompletionStatus,
  PreparationStatus,
  ReadingStatus,
  TaskEntryStatus,
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

/** Les deux états explicites d'un واجب. Le troisième, « لم يجب », est l'absence de ligne. */
export const TASK_ENTRY_OPTIONS: readonly StatusOption<TaskEntryStatus>[] = [
  { value: 'أنجزت', tone: 'good', score: 1 },
  { value: 'لم أنجز', tone: 'bad', score: 0 },
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

export function toneOf<T extends string>(
  options: readonly StatusOption<T>[],
  value: T | null | undefined,
): Tone {
  if (!value) return 'neutral'
  return options.find((option) => option.value === value)?.tone ?? 'neutral'
}

/** Les indicateurs du bilan exprimés en pourcentage, dans l'ordre d'affichage. */
export const INDICATORS = [
  { key: 'attendance', label: 'الحضور في الموعد الأسبوعي', short: 'الحضور' },
  { key: 'preparation', label: 'مسألة التحضير', short: 'التحضير' },
  { key: 'texts', label: 'حفظ النصوص المقررة', short: 'النصوص' },
  { key: 'tasks', label: 'الواجبات الفردية', short: 'الواجبات' },
  { key: 'reading', label: 'ورد القراءة', short: 'القراءة' },
  { key: 'council', label: 'المجلس الداخلي', short: 'المجلس' },
] as const

export type IndicatorKey = (typeof INDICATORS)[number]['key']

/** Colonnes du bilan qui comptent au lieu de noter (pas de pourcentage). */
export const TALLIES = [
  { key: 'thumns', label: 'الأثمان المنجزة في الفترة', short: 'الأثمان', unit: 'ثمن' },
  { key: 'answered', label: 'أيام الإجابة على الواجبات', short: 'أيام الإجابة', unit: 'يوم' },
] as const

export type TallyKey = (typeof TALLIES)[number]['key']
