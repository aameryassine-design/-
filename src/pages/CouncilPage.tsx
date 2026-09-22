import { SessionSheet } from '../components/SessionSheet'
import { COUNCIL_OPTIONS } from '../lib/constants'

export function CouncilPage() {
  return (
    <SessionSheet
      title="الحضور في المجلس الداخلي"
      description="جلسات المجلس الداخلي منفصلة عن الحصص الأسبوعية."
      table="attendance"
      sessionTypes={['مجلس داخلي']}
      options={COUNCIL_OPTIONS}
      bulkValue="حاضر"
      withNotes
    />
  )
}
