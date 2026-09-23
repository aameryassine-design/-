import type { AppRole } from './types'

/** Libellé arabe affiché pour chaque rôle. */
export const ROLE_LABELS: Record<AppRole, string> = {
  supervisor: 'مشرف عام',
  tasks_officer: 'مسؤول الواجبات الفردية',
  memorization_officer: 'مسؤول الحفظ',
  majlis_leader: 'مسؤول المجلس الداخلي',
  member: 'عضو',
}

export const ROLE_HINTS: Record<AppRole, string> = {
  supervisor: 'يدير الأعضاء والمجالس والكتب، ويسجّل الحضور والتحضير وحفظ النصوص، ويطّلع على البيان كاملاً.',
  tasks_officer: 'ينشئ الواجبات ويتابع من أجاب ومن لم يجب، دون الاطّلاع على الأجوبة.',
  memorization_officer: 'يضع برنامج الحفظ لكل عضو ويسجّل الأثمان المنجزة.',
  majlis_leader: 'يسجّل حضور أعضاء مجلسه فقط.',
  member: 'يسجّل واجباته وورده، ويقرأ الكتب، ويتابع تقدّمه.',
}

export const ALL_ROLES: readonly AppRole[] = [
  'supervisor',
  'tasks_officer',
  'memorization_officer',
  'majlis_leader',
  'member',
]

export function roleLabel(role: AppRole): string {
  return ROLE_LABELS[role] ?? role
}

/** Le rôle qui décide de l'écran d'accueil, du plus large au plus restreint. */
export function primaryRole(roles: readonly AppRole[]): AppRole | null {
  for (const role of ALL_ROLES) {
    if (roles.includes(role)) return role
  }
  return null
}
