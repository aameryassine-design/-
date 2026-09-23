import { useState } from 'react'
import { EmptyState, ErrorBanner, Loading } from '../components/Feedback'
import { PageHeader } from '../components/PageHeader'
import { useToast } from '../components/Toast'
import { useAsync, unwrap } from '../hooks/useAsync'
import { ALL_ROLES, ROLE_HINTS, roleLabel } from '../lib/roles'
import { errorMessage, supabase } from '../lib/supabase'
import type { AppRole, Member, Profile } from '../lib/types'

interface Account extends Profile {
  roles: AppRole[]
  member: Member | null
}

async function loadAccounts(): Promise<Account[]> {
  const [profileResult, roleResult, memberResult] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email, phone').order('full_name'),
    supabase.from('user_roles').select('user_id, role'),
    supabase.from('members').select('*'),
  ])

  const profiles = unwrap<Profile[]>(profileResult)
  const grants = unwrap<{ user_id: string; role: AppRole }[]>(roleResult)
  const members = unwrap<Member[]>(memberResult)

  return profiles.map((profile) => ({
    ...profile,
    roles: grants.filter((grant) => grant.user_id === profile.id).map((grant) => grant.role),
    member: members.find((member) => member.user_id === profile.id) ?? null,
  }))
}

export function UsersPage() {
  const toast = useToast()
  const accounts = useAsync(loadAccounts, [])
  const [busy, setBusy] = useState<string | null>(null)

  const toggle = async (account: Account, role: AppRole, next: boolean) => {
    setBusy(`${account.id}:${role}`)

    const { error } = next
      ? await supabase.from('user_roles').insert({ user_id: account.id, role })
      : await supabase.from('user_roles').delete().eq('user_id', account.id).eq('role', role)

    setBusy(null)

    if (error) {
      toast(errorMessage(error), 'error')
      return
    }

    toast(next ? `تم منح «${roleLabel(role)}»` : `تم سحب «${roleLabel(role)}»`)
    accounts.refresh()
  }

  const list = accounts.data ?? []
  const pending = list.filter((account) => account.roles.length === 0)

  return (
    <section className="page">
      <PageHeader
        title="الحسابات والأدوار"
        description="كل من يسجّل ببريد مطابق لبطاقة عضو يصير «عضواً» تلقائياً. أدوار المسؤولين تُمنح من هنا."
      >
        <button
          type="button"
          className="btn btn--ghost"
          onClick={accounts.refresh}
          disabled={accounts.loading}
        >
          تحديث
        </button>
      </PageHeader>

      <ErrorBanner message={accounts.error} />

      <div className="card">
        <h3 className="card__title">الأدوار الخمسة</h3>
        <ul className="detail-card__list">
          {ALL_ROLES.map((role) => (
            <li key={role}>
              <span>
                <strong>{roleLabel(role)}</strong> — {ROLE_HINTS[role]}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {pending.length > 0 ? (
        <div className="banner banner--warn">
          {pending.length} حساباً بلا دور، فلا يرى أي بيانات:{' '}
          {pending.map((account) => account.email || account.full_name).join('، ')}. إن كان أحدهم
          عضواً، أضف بريده في بطاقته بصفحة «الأعضاء» ثم امنحه دور «عضو» هنا.
        </div>
      ) : null}

      {accounts.loading ? <Loading /> : null}

      {!accounts.loading && list.length === 0 ? (
        <EmptyState
          title="لا توجد حسابات بعد"
          hint="سجّل الأعضاء بأنفسهم من التطبيق ببريدهم الإلكتروني."
        />
      ) : null}

      {list.length > 0 ? (
        <div className="table-wrap">
          <table className="sheet">
            <thead>
              <tr>
                <th className="sheet__col-name">الحساب</th>
                <th>البطاقة</th>
                {ALL_ROLES.map((role) => (
                  <th key={role}>{roleLabel(role)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((account) => (
                <tr key={account.id}>
                  <td className="sheet__name">
                    {account.full_name || '—'}
                    <span className="sheet__hint" dir="ltr">
                      {account.email}
                    </span>
                  </td>
                  <td>
                    {account.member ? (
                      <span className="pill pill--good">{account.member.full_name}</span>
                    ) : (
                      <span className="pill pill--neutral">غير مرتبط</span>
                    )}
                  </td>
                  {ALL_ROLES.map((role) => (
                    <td key={role}>
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={account.roles.includes(role)}
                          disabled={busy === `${account.id}:${role}`}
                          onChange={(event) => void toggle(account, role, event.target.checked)}
                        />
                      </label>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <p className="legend">
        الحساب بلا دور لا يصل إلى أي جدول: هذه قاعدة في قاعدة البيانات نفسها (RLS)، لا في الواجهة.
        سحب الدور يقطع الوصول فوراً عند أول طلب جديد.
      </p>
    </section>
  )
}
