import { SessionSheet } from '../components/SessionSheet'
import { PREPARATION_OPTIONS } from '../lib/constants'

export function PreparationPage() {
  return (
    <SessionSheet
      title="مسألة التحضير"
      description="تحضير العضو للحصة قبل موعدها."
      table="preparation"
      sessionTypes={['حصة أسبوعية']}
      options={PREPARATION_OPTIONS}
      bulkValue="حضّر"
      withNotes
    />
  )
}
