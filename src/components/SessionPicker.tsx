import { useState } from 'react'
import { formatDate, todayISO } from '../lib/dates'
import type { Session, SessionType } from '../lib/types'
import { ConfirmDialog } from './ConfirmDialog'

interface Props {
  sessions: Session[]
  value: string | null
  onChange: (id: string) => void
  onCreate: (input: {
    type: SessionType
    session_date: string
    label: string | null
  }) => Promise<Session | null>
  onDelete?: (id: string) => Promise<boolean>
  types: readonly SessionType[]
  loading?: boolean
}

export function sessionLabel(session: Session, withType = false): string {
  const parts = [formatDate(session.session_date)]
  if (session.label) parts.push(session.label)
  if (withType) parts.push(`(${session.type})`)
  return parts.join(' — ')
}

export function SessionPicker({
  sessions,
  value,
  onChange,
  onCreate,
  onDelete,
  types,
  loading = false,
}: Props) {
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [date, setDate] = useState(todayISO())
  const [label, setLabel] = useState('')
  const [type, setType] = useState<SessionType>(types[0])
  const [busy, setBusy] = useState(false)

  const index = sessions.findIndex((session) => session.id === value)
  const current = index >= 0 ? sessions[index] : null

  const submit = async () => {
    setBusy(true)
    const created = await onCreate({ type, session_date: date, label: label.trim() || null })
    setBusy(false)
    if (created) {
      onChange(created.id)
      setCreating(false)
      setLabel('')
    }
  }

  return (
    <div className="session-picker">
      <div className="session-picker__row">
        <label className="session-picker__select">
          <span className="label">الحصة</span>
          <select
            className="input"
            value={value ?? ''}
            disabled={loading || sessions.length === 0}
            onChange={(event) => onChange(event.target.value)}
          >
            {sessions.length === 0 ? <option value="">لا توجد حصص بعد</option> : null}
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {sessionLabel(session, types.length > 1)}
              </option>
            ))}
          </select>
        </label>

        <div className="session-picker__actions">
          <button
            type="button"
            className="btn btn--ghost"
            disabled={index <= 0}
            onClick={() => onChange(sessions[index - 1].id)}
          >
            الأحدث
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={index < 0 || index >= sessions.length - 1}
            onClick={() => onChange(sessions[index + 1].id)}
          >
            الأقدم
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setCreating((open) => !open)}
          >
            {creating ? 'إغلاق' : '+ حصة جديدة'}
          </button>
          {onDelete && current ? (
            <button
              type="button"
              className="btn btn--danger-ghost"
              onClick={() => setConfirmDelete(true)}
            >
              حذف الحصة
            </button>
          ) : null}
        </div>
      </div>

      {creating ? (
        <form
          className="session-picker__form"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <label>
            <span className="label">التاريخ</span>
            <input
              className="input"
              type="date"
              value={date}
              required
              onChange={(event) => setDate(event.target.value)}
            />
          </label>

          {types.length > 1 ? (
            <label>
              <span className="label">النوع</span>
              <select
                className="input"
                value={type}
                onChange={(event) => setType(event.target.value as SessionType)}
              >
                {types.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="grow">
            <span className="label">عنوان (اختياري)</span>
            <input
              className="input"
              type="text"
              value={label}
              placeholder="مثال: لقاء استثنائي"
              onChange={(event) => setLabel(event.target.value)}
            />
          </label>

          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'جارٍ الإضافة…' : 'إضافة'}
          </button>
        </form>
      ) : null}

      <ConfirmDialog
        open={confirmDelete}
        danger
        title="حذف الحصة"
        message={
          current
            ? `سيتم حذف «${sessionLabel(current)}» وكل التسجيلات المرتبطة بها. لا يمكن التراجع.`
            : undefined
        }
        confirmLabel="حذف"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          if (!current || !onDelete) return
          setConfirmDelete(false)
          const removed = await onDelete(current.id)
          if (removed) {
            const next = sessions.find((session) => session.id !== current.id)
            if (next) onChange(next.id)
          }
        }}
      />
    </div>
  )
}
