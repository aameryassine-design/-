// Miroir TypeScript du schéma Supabase v2 (voir supabase/migrations/).

// ---------------------------------------------------------------- énumérations

/** Identifiants ASCII : ils ne servent qu'à brancher du code. Libellés arabes dans roles.ts. */
export type AppRole =
  | 'supervisor'
  | 'tasks_officer'
  | 'memorization_officer'
  | 'majlis_leader'
  | 'member'

export type MemberStatus = 'نشط' | 'مؤرشف'
export type SessionType = 'حصة أسبوعية' | 'مجلس داخلي' | 'موعد آخر'
export type AttendanceStatus = 'حاضر' | 'غائب' | 'متأخر' | 'معذور'
export type PreparationStatus = 'حضّر' | 'لم يحضّر' | 'جزئياً'
export type CompletionStatus = 'تم' | 'لم يتم' | 'جزئياً'
export type ReadingStatus = 'لم يبدأ' | 'قيد القراءة' | 'أنهى'

export type TaskKind = 'worship' | 'reading'

/**
 * Deux états seulement : le troisième — « لم يجب » — est l'ABSENCE de ligne
 * dans `task_entries`. C'est ce qui permet au مسؤول الواجبات de savoir qui a
 * répondu sans rien connaître des réponses.
 */
export type TaskEntryStatus = 'أنجزت' | 'لم أنجز'

// ------------------------------------------------------------------- comptes

export interface Profile {
  id: string
  full_name: string
  /** Recopié depuis auth.users, qui n'est pas lisible côté navigateur. */
  email: string | null
  phone: string | null
}

export interface UserRoleRow {
  user_id: string
  role: AppRole
  granted_at: string
}

// ------------------------------------------------------------------ حلقة

export interface Majlis {
  id: string
  name: string
  leader_user_id: string | null
  note: string | null
  is_active: boolean
}

export interface Member {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  note: string | null
  status: MemberStatus
  user_id: string | null
  majlis_id: string | null
  created_at: string
  updated_at: string
}

export interface Session {
  id: string
  type: SessionType
  session_date: string
  label: string | null
  lesson_text: string | null
  majlis_id: string | null
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

export interface MemorizationTextRecord {
  id: string
  session_id: string
  member_id: string
  lesson_override: string | null
  status: CompletionStatus
  note: string | null
}

// ------------------------------------------------------ الواجبات الفردية

export interface IndividualTask {
  id: string
  title: string
  kind: TaskKind
  /** null = tâche collective, valable pour tous les membres actifs. */
  member_id: string | null
  book_program_id: string | null
  starts_on: string
  ends_on: string | null
  is_active: boolean
  sort_order: number
  note: string | null
  created_at: string
}

export interface TaskEntry {
  id: string
  task_id: string
  member_id: string
  entry_date: string
  status: TaskEntryStatus
}

/** Vue `daily_participation` — tout ce que le مسؤول الواجبات peut lire. */
export interface DailyParticipation {
  member_id: string
  entry_date: string
  has_responded: boolean
}

// ------------------------------------------------------------ برنامج الحفظ

export interface MemorizationProgram {
  id: string
  member_id: string
  title: string
  start_position: string | null
  target: string | null
  is_active: boolean
  note: string | null
}

export interface MemorizationEntry {
  id: string
  program_id: string
  entry_date: string
  thumn_count: number
  position_label: string | null
  note: string | null
}

/** Vue `memorization_progress` — progression cumulée. */
export interface MemorizationProgress {
  program_id: string
  member_id: string
  title: string
  start_position: string | null
  is_active: boolean
  total_thumns: number
  sessions_count: number
  last_entry_date: string | null
  current_position: string | null
}

// ------------------------------------------------------------- قراءة الكتب

export interface Book {
  id: string
  title: string
  author: string | null
  description: string | null
  pdf_path: string | null
  pdf_pages: number | null
  is_active: boolean
  sort_order: number
}

export interface BookProgram {
  id: string
  book_id: string
  pages_per_day: number
  starts_on: string
  ends_on: string | null
  is_active: boolean
  note: string | null
}

export interface BookProgress {
  id: string
  book_id: string
  member_id: string
  status: ReadingStatus
  finished_date: string | null
  last_page: number | null
  note: string | null
}
