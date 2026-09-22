export type MemberStatus = 'نشط' | 'مؤرشف'
export type SessionType = 'حصة أسبوعية' | 'مجلس داخلي' | 'موعد آخر'
export type AttendanceStatus = 'حاضر' | 'غائب' | 'متأخر' | 'معذور'
export type PreparationStatus = 'حضّر' | 'لم يحضّر' | 'جزئياً'
export type CompletionStatus = 'تم' | 'لم يتم' | 'جزئياً'
export type TaskStatus = 'منجز' | 'غير منجز' | 'جزئياً'
export type ReadingStatus = 'لم يبدأ' | 'قيد القراءة' | 'أنهى'

export interface Member {
  id: string
  full_name: string
  phone: string | null
  note: string | null
  status: MemberStatus
  created_at: string
  updated_at: string
}

export interface Session {
  id: string
  type: SessionType
  session_date: string
  label: string | null
  lesson_text: string | null
  created_at: string
}

export interface AttendanceRecord {
  id: string
  session_id: string
  member_id: string
  status: AttendanceStatus
  note: string | null
}

export interface PreparationRecord {
  id: string
  session_id: string
  member_id: string
  status: PreparationStatus
  note: string | null
}

export interface MemorizationRecord {
  id: string
  session_id: string
  member_id: string
  lesson_override: string | null
  status: CompletionStatus
  note: string | null
}

export interface IndividualTask {
  id: string
  member_id: string
  description: string
  period_start: string
  period_end: string
  status: TaskStatus
  note: string | null
}

export interface QuranRecord {
  id: string
  member_id: string
  session_id: string | null
  entry_date: string
  planned_portion: string | null
  achieved_portion: string | null
  pages_done: number | null
  status: CompletionStatus
  note: string | null
}

export interface Book {
  id: string
  title: string
  author: string | null
  is_active: boolean
  sort_order: number
}

export interface BookProgress {
  id: string
  book_id: string
  member_id: string
  status: ReadingStatus
  finished_date: string | null
  note: string | null
}
