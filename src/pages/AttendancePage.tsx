import { SessionSheet } from '../components/SessionSheet'
import { ATTENDANCE_OPTIONS } from '../lib/constants'

export function AttendancePage() {
  return (
    <SessionSheet
      title="الحضور في الموعد الأسبوعي والمواعيد الأخرى"
      description="اختر الحصة ثم سجّل حالة كل عضو بنقرة واحدة. الملاحظة اختيارية."
      table="attendance"
      sessionTypes={['حصة أسبوعية', 'موعد آخر']}
      options={ATTENDANCE_OPTIONS}
      bulkValue="حاضر"
      withNotes
    />
  )
}
