import { SessionSheet } from '../components/SessionSheet'
import { TextsSheet } from './TextsSheet'
import { ATTENDANCE_OPTIONS, PREPARATION_OPTIONS } from '../lib/constants'

/**
 * Les trois feuilles saisies par le مشرف عام. Inchangées depuis la v1 : seule
 * la RLS a changé sous elles.
 */

export function AttendancePage() {
  return (
    <SessionSheet
      title="الحضور في الموعد الأسبوعي"
      description="سجّل حضور كل عضو في الحصة المختارة."
      table="attendance"
      sessionTypes={['حصة أسبوعية', 'موعد آخر']}
      options={ATTENDANCE_OPTIONS}
      withNotes
      bulkValue="حاضر"
    />
  )
}

export function PreparationPage() {
  return (
    <SessionSheet
      title="مسألة التحضير"
      description="هل حضّر العضو مسألة الحصة؟"
      table="preparation"
      sessionTypes={['حصة أسبوعية', 'موعد آخر']}
      options={PREPARATION_OPTIONS}
      withNotes
      bulkValue="حضّر"
    />
  )
}

export function TextsPage() {
  return <TextsSheet />
}
