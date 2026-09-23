import { useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState, ErrorBanner, Loading } from '../components/Feedback'
import { PageHeader } from '../components/PageHeader'
import { useToast } from '../components/Toast'
import { useAsync, unwrap } from '../hooks/useAsync'
import { useMembers } from '../hooks/useMembers'
import { errorMessage, supabase } from '../lib/supabase'
import type { AppRole, Majlis, Profile } from '../lib/types'

interface Account extends Profile {
  roles: AppRole[]
}

async function loadAccounts(): Promise<Account[]> {
  const [profiles, roles] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email, phone').order('full_name'),
    supabase.from('user_roles').select('user_id, role'),
  ])

  const list = unwrap<Profile[]>(profiles)
  const grants = unwrap<{ user_id: string; role: AppRole }[]>(roles)

  return list.map((profile) => ({
    ...profile,
    roles: grants.filter((grant) => grant.user_id === profile.id).map((grant) => grant.role),
  }))
}

export function MajalisPage() {
  const toast = useToast()
  const majalis = useAsync(
    async () => unwrap<Majlis[]>(await supabase.from('majalis').select('*').order('name')),
    [],
  )
  const accounts = useAsync(loadAccounts, [])
  const { members, refresh: refreshMembers } = useMembers(false)

  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Majlis | null>(null)

  const accountLabel = (id: string | null) => {
    if (!id) return '—'
    const account = accounts.data?.find((item) => item.id === id)
    return account ? account.full_name || account.email || id : id
  }

  const create = async () => {
    if (!name.trim()) return
    setBusy(true)
    const { error } = await supabase.from('majalis').insert({ name: name.trim() })
    setBusy(false)
    if (error) {
      toast(errorMessage(error), 'error')
      return
    }
    setName('')
    toast('تمت إضافة المجلس')
    majalis.refresh()
  }

  const rename = async (majlis: Majlis, next: string) => {
    if (!next.trim() || next === majlis.name) return
    const { error } = await supabase
      .from('majalis')
      .update({ name: next.trim() })
      .eq('id', majlis.id)
    if (error) toast(errorMessage(error), 'error')
    else majalis.refresh()
  }

  /**
   * Désigner un responsable lui donne aussi le rôle مسؤول المجلس الداخلي,
   * sans quoi il verrait bien son مجلس en base mais pas l'écran dans l'app.
   */
  const setLeader = async (majlis: Majlis, userId: string) => {
    const { error } = await supabase
      .from('majalis')
      .update({ leader_user_id: userId || null })
      .eq('id', majlis.id)

    if (error) {
      toast(errorMessage(error), 'error')
      return
    }

    if (userId) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role: 'majlis_leader' }, { onConflict: 'user_id,role' })
      if (roleError) toast(errorMessage(roleError), 'error')
      else toast('تم تعيين المسؤول ومنحه الدور')
      accounts.refresh()
    } else {
      toast('تم رفع التعيين')
    }

    majalis.refresh()
  }

  const remove = async (majlis: Majlis) => {
    const { error } = await supabase.from('majalis').delete().eq('id', majlis.id)
    if (error) {
      toast(errorMessage(error), 'error')
      return
    }
    toast('تم حذف المجلس')
    majalis.refresh()
    void refreshMembers()
  }

  const countOf = (majlisId: string) =>
    members.filter((member) => member.majlis_id === majlisId).length

  const orphans = members.filter((member) => !member.majlis_id).length

  return (
    <section className="page">
      <PageHeader
        title="المجالس الداخلية"
        description="كل عضو ينتمي إلى مجلس واحد. مسؤول المجلس لا يرى ولا يسجّل إلا أعضاء مجلسه."
      />

      <ErrorBanner message={majalis.error ?? accounts.error} />

      <form
        className="card member-form"
        onSubmit={(event) => {
          event.preventDefault()
          void create()
        }}
      >
        <label className="grow">
          <span className="label">اسم المجلس *</span>
          <input
            className="input"
            value={name}
            required
            placeholder="مثال: مجلس الفتح"
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'جارٍ الإضافة…' : '+ إضافة مجلس'}
        </button>
      </form>

      {orphans > 0 ? (
        <div className="banner banner--warn">
          {orphans} عضواً بلا مجلس. ألحقهم بمجلس من صفحة «الأعضاء» حتى يظهروا لمسؤول المجلس.
        </div>
      ) : null}

      {majalis.loading || accounts.loading ? <Loading /> : null}

      {!majalis.loading && (majalis.data ?? []).length === 0 ? (
        <EmptyState title="لا توجد مجالس بعد" hint="أضف أول مجلس باستعمال النموذج أعلاه." />
      ) : null}

      {(majalis.data ?? []).length > 0 ? (
        <div className="table-wrap">
          <table className="sheet">
            <thead>
              <tr>
                <th className="sheet__col-name">المجلس</th>
                <th>المسؤول</th>
                <th>عدد الأعضاء</th>
                <th className="sheet__col-actions">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {(majalis.data ?? []).map((majlis) => (
                <tr key={majlis.id}>
                  <td className="sheet__name">
                    <input
                      className="input"
                      defaultValue={majlis.name}
                      onBlur={(event) => void rename(majlis, event.target.value)}
                      aria-label={`اسم ${majlis.name}`}
                    />
                  </td>
                  <td>
                    <select
                      className="input"
                      value={majlis.leader_user_id ?? ''}
                      onChange={(event) => void setLeader(majlis, event.target.value)}
                    >
                      <option value="">بدون مسؤول</option>
                      {(accounts.data ?? []).map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.full_name || account.email}
                        </option>
                      ))}
                    </select>
                    {majlis.leader_user_id ? (
                      <span className="sheet__hint">{accountLabel(majlis.leader_user_id)}</span>
                    ) : null}
                  </td>
                  <td className="sheet__total">{countOf(majlis.id)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn--danger-ghost btn--sm"
                      onClick={() => setPendingDelete(majlis)}
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        danger
        title="حذف المجلس"
        message={
          pendingDelete
            ? `سيُحذف «${pendingDelete.name}» ويصبح أعضاؤه بلا مجلس. إن كانت له جلسات مسجَّلة فسيرفض النظام الحذف حفاظاً على سجلّ الحضور.`
            : undefined
        }
        confirmLabel="حذف"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const majlis = pendingDelete
          setPendingDelete(null)
          if (majlis) void remove(majlis)
        }}
      />
    </section>
  )
}
