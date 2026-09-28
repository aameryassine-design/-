import type { AppRole } from './types'

/** Libellé arabe affiché pour chaque rôle. */
export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: 'مشرف عام',
  supervisor: 'مشرف عام',
  majlis_admin: 'مشرف المجلس',
  tasks_officer: 'مسؤول الواجبات الفردية',
  memorization_officer: 'مسؤول الحفظ',
  majlis_leader: 'مسؤول المجلس الداخلي',
  member: 'عضو',
}

export const ROLE_HINTS: Record<AppRole, string> = {
  super_admin: 'مشرف عام على جميع المجالس، يدير المنظومة بالكامل ويطّلع على جميع البيانات.',
  supervisor: 'مشرف عام على جميع المجالس، يدير المنظومة بالكامل ويطّلع على جميع البيانات.',
  majlis_admin: 'مشرف على مجلسه الخاص فقط: يدير الأعضاء والحضور والتحضير والحفظ وبيان المجلس.',
  tasks_officer: 'ينشئ الواجبات ويتابع من أجاب ومن لم يجب في مجلسه، دون الاطّلاع على الأجوبة.',
  memorization_officer: 'يضع برنامج الحفظ لكل عضو في مجلسه ويسجّل الأثمان المنجزة.',
  majlis_leader: 'يسجّل حضور أعضاء مجلسه في المجلس الداخلي فقط.',
  member: 'يسجّل واجباته وورده، ويقرأ الكتب، ويتابع تقدّمه.',
}

export const ALL_ROLES: readonly AppRole[] = [
  'super_admin',
  'supervisor',
  'majlis_admin',
  'tasks_officer',
  'memorization_officer',
  'majlis_leader',
  'member',
]

/** Rôles affichés dans l'interface de gestion des comptes (évite le doublon super_admin / supervisor) */
export const ASSIGNABLE_ROLES: readonly AppRole[] = [
  'supervisor',
  'majlis_admin',
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
