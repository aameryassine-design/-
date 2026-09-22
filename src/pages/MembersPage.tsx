import { useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState, ErrorBanner, Loading } from '../components/Feedback'
import { PageHeader } from '../components/PageHeader'
import { useToast } from '../components/Toast'
import { useMembers } from '../hooks/useMembers'
import { errorMessage, supabase } from '../lib/supabase'
import type { Member } from '../lib/types'

interface Draft {
  full_name: string
  phone: string
  note: string
}

const EMPTY_DRAFT: Draft = { full_name: '', phone: '', note: '' }

export function MembersPage() {
  const toast = useToast()
  const { members, loading, error, refresh } = useMembers(true)
  const [showArchived, setShowArchived] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT)
  const [pendingDelete, setPendingDelete] = useState<Member | null>(null)
  const [busy, setBusy] = useState(false)

  const visible = members.filter((member) => showArchived || member.status === 'نشط')
  const archivedCount = members.filter((member) => member.status === 'مؤرشف').length

  const add = async () => {
    const name = draft.full_name.trim()
    if (!name) return
    setBusy(true)
    const { error: insertError } = await supabase.from('members').insert({
      full_name: name,
      phone: draft.phone.trim() || null,
      note: draft.note.trim() || null,
    })
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
    const name = editDraft.full_name.trim()
    if (!name) return
    const { error: updateError } = await supabase
      .from('members')
      .update({
        full_name: name,
        phone: editDraft.phone.trim() || null,
        note: editDraft.note.trim() || null,
      })
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

  return (
    <section className="page">
      <PageHeader
        title="الأعضاء"
        description="إدارة أعضاء الحلقة. الأرشفة تُخفي العضو من صفحات المتابعة مع الاحتفاظ بسجلّه."
      />

      <ErrorBanner message={error} />

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
        <label>
          <span className="label">الهاتف</span>
          <input
            className="input"
            value={draft.phone}
            placeholder="06…"
            onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
          />
        </label>
        <label className="grow">
          <span className="label">ملاحظة</span>
          <input
            className="input"
            value={draft.note}
            placeholder="اختياري"
            onChange={(event) => setDraft({ ...draft, note: event.target.value })}
          />
        </label>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'جارٍ الإضافة…' : '+ إضافة عضو'}
        </button>
      </form>

      <div className="sheet-toolbar">
        <span className="pill">عدد النشطين: {members.filter((m) => m.status === 'نشط').length}</span>
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
                <th>الهاتف</th>
                <th>ملاحظة</th>
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
                        member.full_name
                      )}
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
                      {editing ? (
                        <input
                          className="input"
                          value={editDraft.note}
                          onChange={(event) =>
                            setEditDraft({ ...editDraft, note: event.target.value })
                          }
                        />
                      ) : (
                        (member.note ?? '—')
                      )}
                    </td>
                    <td>
                      <span
                        className={`pill pill--${member.status === 'نشط' ? 'good' : 'neutral'}`}
                      >
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
                              onClick={() => {
                                setEditingId(member.id)
                                setEditDraft({
                                  full_name: member.full_name,
                                  phone: member.phone ?? '',
                                  note: member.note ?? '',
                                })
                              }}
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
            ? `سيتم حذف «${pendingDelete.full_name}» وجميع تسجيلاته في المحاور السبعة. لا يمكن التراجع — إن أردت الاحتفاظ بالسجل استعمل «أرشفة».`
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
