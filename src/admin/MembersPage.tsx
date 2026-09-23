import { useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState, ErrorBanner, Loading } from '../components/Feedback'
import { PageHeader } from '../components/PageHeader'
import { useToast } from '../components/Toast'
import { useAsync, unwrap } from '../hooks/useAsync'
import { useMembers } from '../hooks/useMembers'
import { errorMessage, supabase } from '../lib/supabase'
import type { Majlis, Member } from '../lib/types'

interface Draft {
  full_name: string
  phone: string
  email: string
  note: string
  majlis_id: string
}

const EMPTY_DRAFT: Draft = { full_name: '', phone: '', email: '', note: '', majlis_id: '' }

function toPayload(draft: Draft) {
  return {
    full_name: draft.full_name.trim(),
    phone: draft.phone.trim() || null,
    email: draft.email.trim().toLowerCase() || null,
    note: draft.note.trim() || null,
    majlis_id: draft.majlis_id || null,
  }
}

export function MembersPage() {
  const toast = useToast()
  const { members, loading, error, refresh } = useMembers(true)
  const majalis = useAsync(
    async () => unwrap<Majlis[]>(await supabase.from('majalis').select('*').order('name')),
    [],
  )

  const [showArchived, setShowArchived] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT)
  const [pendingDelete, setPendingDelete] = useState<Member | null>(null)
  const [busy, setBusy] = useState(false)

  const majlisName = (id: string | null) =>
    majalis.data?.find((item) => item.id === id)?.name ?? '—'

  const visible = members.filter((member) => showArchived || member.status === 'نشط')
  const archivedCount = members.filter((member) => member.status === 'مؤرشف').length
  const linkedCount = members.filter((member) => member.user_id).length

  const add = async () => {
    if (!draft.full_name.trim()) return
    setBusy(true)
    const { error: insertError } = await supabase.from('members').insert(toPayload(draft))
    setBusy(false)
    if (insertError) {
      toast(errorMessage(insertError), 'error')
      return
    }
    setDraft(EMPTY_DRAFT)
    toast('تمت إضافة العضو')
    await refresh()
  }

  const saveEdit = async (id: string) => {
    if (!editDraft.full_name.trim()) return
    const { error: updateError } = await supabase
      .from('members')
      .update(toPayload(editDraft))
      .eq('id', id)

    if (updateError) {
      toast(errorMessage(updateError), 'error')
      return
    }
    setEditingId(null)
    toast('تم حفظ التعديل')
    await refresh()
  }

  const toggleArchive = async (member: Member) => {
    const nextStatus = member.status === 'نشط' ? 'مؤرشف' : 'نشط'
    const { error: updateError } = await supabase
      .from('members')
      .update({ status: nextStatus })
      .eq('id', member.id)

    if (updateError) {
      toast(errorMessage(updateError), 'error')
      return
    }
    toast(nextStatus === 'مؤرشف' ? 'تمت أرشفة العضو' : 'تمت إعادة العضو')
    await refresh()
  }

  const remove = async (member: Member) => {
    const { error: deleteError } = await supabase.from('members').delete().eq('id', member.id)
    if (deleteError) {
      toast(errorMessage(deleteError), 'error')
      return
    }
    toast('تم حذف العضو')
    await refresh()
  }

  const startEdit = (member: Member) => {
    setEditingId(member.id)
    setEditDraft({
      full_name: member.full_name,
      phone: member.phone ?? '',
      email: member.email ?? '',
      note: member.note ?? '',
      majlis_id: member.majlis_id ?? '',
    })
  }

  const majlisSelect = (value: string, onChange: (next: string) => void) => (
    <select className="input" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">بدون مجلس</option>
      {(majalis.data ?? []).map((item) => (
        <option key={item.id} value={item.id}>
          {item.name}
        </option>
      ))}
    </select>
  )

  return (
    <section className="page">
      <PageHeader
        title="الأعضاء"
        description="أضف البريد الإلكتروني لكل عضو: عندما يسجّل بنفس البريد، يُربط حسابه ببطاقته تلقائياً ويصير «عضواً»."
      />

      <ErrorBanner message={error ?? majalis.error} />

      <form
        className="card member-form"
        onSubmit={(event) => {
          event.preventDefault()
          void add()
        }}
      >
        <label className="grow">
          <span className="label">الاسم الكامل *</span>
          <input
            className="input"
            value={draft.full_name}
            required
            placeholder="مثال: محمد الأمين"
            onChange={(event) => setDraft({ ...draft, full_name: event.target.value })}
          />
        </label>
        <label className="grow">
          <span className="label">البريد الإلكتروني</span>
          <input
            className="input"
            type="email"
            dir="ltr"
            value={draft.email}
            placeholder="name@example.com"
            onChange={(event) => setDraft({ ...draft, email: event.target.value })}
          />
        </label>
        <label>
          <span className="label">الهاتف</span>
          <input
            className="input"
            value={draft.phone}
            placeholder="06…"
            onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
          />
        </label>
        <label>
          <span className="label">المجلس</span>
          {majlisSelect(draft.majlis_id, (majlis_id) => setDraft({ ...draft, majlis_id }))}
        </label>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'جارٍ الإضافة…' : '+ إضافة عضو'}
        </button>
      </form>

      <div className="sheet-toolbar">
        <div className="sheet-toolbar__stats">
          <span className="pill">
            النشطون: {members.filter((m) => m.status === 'نشط').length}
          </span>
          <span className="pill pill--good">حسابات مرتبطة: {linkedCount}</span>
          <span className="pill pill--neutral">
            في انتظار التسجيل: {members.length - linkedCount}
          </span>
        </div>
        {archivedCount > 0 ? (
          <label className="checkbox">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(event) => setShowArchived(event.target.checked)}
            />
            إظهار المؤرشفين ({archivedCount})
          </label>
        ) : null}
      </div>

      {loading ? <Loading /> : null}

      {!loading && visible.length === 0 ? (
        <EmptyState title="لا يوجد أعضاء بعد" hint="أضف أول عضو باستعمال النموذج أعلاه." />
      ) : null}

      {visible.length > 0 ? (
        <div className="table-wrap">
          <table className="sheet">
            <thead>
              <tr>
                <th className="sheet__col-name">الاسم</th>
                <th>البريد الإلكتروني</th>
                <th>المجلس</th>
                <th>الهاتف</th>
                <th>الحساب</th>
                <th>الحالة</th>
                <th className="sheet__col-actions">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((member) => {
                const editing = editingId === member.id
                return (
                  <tr key={member.id} className={member.status === 'مؤرشف' ? 'is-archived' : ''}>
                    <td className="sheet__name">
                      {editing ? (
                        <input
                          className="input"
                          value={editDraft.full_name}
                          onChange={(event) =>
                            setEditDraft({ ...editDraft, full_name: event.target.value })
                          }
                        />
                      ) : (
                        <>
                          {member.full_name}
                          {member.note ? (
                            <span className="sheet__hint">{member.note}</span>
                          ) : null}
                        </>
                      )}
                    </td>
                    <td dir="ltr">
                      {editing ? (
                        <input
                          className="input"
                          type="email"
                          dir="ltr"
                          value={editDraft.email}
                          onChange={(event) =>
                            setEditDraft({ ...editDraft, email: event.target.value })
                          }
                        />
                      ) : (
                        (member.email ?? '—')
                      )}
                    </td>
                    <td>
                      {editing
                        ? majlisSelect(editDraft.majlis_id, (majlis_id) =>
                            setEditDraft({ ...editDraft, majlis_id }),
                          )
                        : majlisName(member.majlis_id)}
                    </td>
                    <td>
                      {editing ? (
                        <input
                          className="input"
                          value={editDraft.phone}
                          onChange={(event) =>
                            setEditDraft({ ...editDraft, phone: event.target.value })
                          }
                        />
                      ) : (
                        (member.phone ?? '—')
                      )}
                    </td>
                    <td>
                      <span className={`pill pill--${member.user_id ? 'good' : 'neutral'}`}>
                        {member.user_id ? 'مرتبط' : 'لم يسجّل بعد'}
                      </span>
                    </td>
                    <td>
                      <span className={`pill pill--${member.status === 'نشط' ? 'good' : 'neutral'}`}>
                        {member.status}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        {editing ? (
                          <>
                            <button
                              type="button"
                              className="btn btn--primary btn--sm"
                              onClick={() => void saveEdit(member.id)}
                            >
                              حفظ
                            </button>
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              onClick={() => setEditingId(null)}
                            >
                              إلغاء
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              onClick={() => startEdit(member)}
                            >
                              تعديل
                            </button>
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              onClick={() => void toggleArchive(member)}
                            >
                              {member.status === 'نشط' ? 'أرشفة' : 'إعادة'}
                            </button>
                            <button
                              type="button"
                              className="btn btn--danger-ghost btn--sm"
                              onClick={() => setPendingDelete(member)}
                            >
                              حذف
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        danger
        title="حذف العضو نهائياً"
        message={
          pendingDelete
            ? `سيتم حذف «${pendingDelete.full_name}» وجميع تسجيلاته: الحضور والتحضير والنصوص والواجبات والحفظ. لا يمكن التراجع — إن أردت الاحتفاظ بالسجل استعمل «أرشفة».`
            : undefined
        }
        confirmLabel="حذف نهائي"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const member = pendingDelete
          setPendingDelete(null)
          if (member) void remove(member)
        }}
      />
    </section>
  )
}
