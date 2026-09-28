import { useState } from 'react'
import { EmptyState, ErrorBanner, Loading } from '../components/Feedback'
import { PageHeader } from '../components/PageHeader'
import { useToast } from '../components/Toast'
import { useAppSettings } from '../hooks/useAppSettings'
import { useAsync, unwrap } from '../hooks/useAsync'
import { ASSIGNABLE_ROLES, ROLE_HINTS, roleLabel } from '../lib/roles'
import { errorMessage, supabase } from '../lib/supabase'
import type { AppRole, Member, Profile } from '../lib/types'

interface Account extends Profile {
  roles: AppRole[]
  member: Member | null
}

async function loadAccounts(): Promise<Account[]> {
  const [profileResult, roleResult, memberResult] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email, phone').order('full_name'),
    supabase.from('user_roles').select('user_id, role, majlis_id'),
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
  const { settings, loading: settingsLoading, updating: settingsUpdating, setAutoApprove } = useAppSettings()
  const accounts = useAsync(loadAccounts, [])
  const [busy, setBusy] = useState<string | null>(null)

  const hasRole = (account: Account, role: AppRole) => {
    if (role === 'supervisor' || role === 'super_admin') {
      return account.roles.includes('supervisor') || account.roles.includes('super_admin')
    }
    return account.roles.includes(role)
  }

  const toggle = async (account: Account, role: AppRole, next: boolean) => {
    setBusy(`${account.id}:${role}`)

    const roleMajlisId =
      role === 'supervisor' || role === 'super_admin'
        ? null
        : (account.member?.majlis_id ?? null)

    let error = null
    if (next) {
      const res = await supabase.from('user_roles').insert({
        user_id: account.id,
        role,
        majlis_id: roleMajlisId,
      })
      error = res.error
    } else {
      let query = supabase.from('user_roles').delete().eq('user_id', account.id)
      if (role === 'supervisor' || role === 'super_admin') {
        query = query.in('role', ['supervisor', 'super_admin'])
      } else {
        query = query.eq('role', role)
      }
      const res = await query
      error = res.error
    }

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
        description="صلاحيات مطلقة للمشرف العام: يمكنك إسناد أي دور لأي مستخدم (بما في ذلك الترقية لمشرف عام)، والتحكم في تفعيل الحسابات المعلقة."
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

      {/* Auto-Approval Setting Toggle */}
      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.4rem' }}>⚙️</span>
          <div>
            <h4 style={{ margin: 0, fontWeight: 600, fontSize: '15px' }}>
              الموافقة التلقائية على انضمام الأعضاء الجدد
            </h4>
            <p className="card__hint" style={{ margin: '2px 0 0 0', fontSize: '13px' }}>
              {settings?.auto_approve_members
                ? 'مفعل: يحصل العضو الجديد على دور «عضو» تلقائياً فور تسجيل حسابه.'
                : 'معطل: يبقى الحساب الجديد معلقاً بدون أي دور في انتظار تفعيله يدوياً أدناه.'}
            </p>
          </div>
        </div>
        <label className="toggle-switch" title="تبديل الموافقة التلقائية">
          <input
            type="checkbox"
            checked={settings?.auto_approve_members ?? true}
            disabled={settingsLoading || settingsUpdating}
            onChange={async (e) => {
              const nextVal = e.target.checked
              const ok = await setAutoApprove(nextVal)
              if (ok) {
                toast(
                  nextVal
                    ? 'تم تفعيل الموافقة التلقائية على الأعضاء الجدد'
                    : 'تم تعطيل الموافقة التلقائية — الحسابات الجديدة ستكون في الانتظار',
                  'ok',
                )
              }
            }}
          />
          <span className="toggle-slider" />
        </label>
      </div>

      <div className="card">
        <h3 className="card__title">أدوار المنظومة</h3>
        <ul className="detail-card__list">
          {ASSIGNABLE_ROLES.map((role) => (
            <li key={role}>
              <span>
                <strong>{roleLabel(role)}</strong> — {ROLE_HINTS[role]}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {pending.length > 0 ? (
        <div className="banner banner--warn" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <strong>{pending.length} حساب(ات) في الانتظار بدون أي دور:</strong> لا يمكنهم تصفح أي بيانات حتى يتم تفعيلهم. يمكنك تفعيلهم كأعضاء مباشرة بضغطة زر:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {pending.map((account) => (
              <div
                key={account.id}
                className="pill pill--neutral"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem' }}
              >
                <span>{account.full_name || account.email}</span>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  style={{ padding: '0.2rem 0.6rem', fontSize: '12px' }}
                  disabled={busy === `${account.id}:member`}
                  onClick={() => void toggle(account, 'member', true)}
                >
                  {busy === `${account.id}:member` ? 'جارٍ…' : '✓ تفعيل كعضو'}
                </button>
              </div>
            ))}
          </div>
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
                {ASSIGNABLE_ROLES.map((role) => (
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
                  {ASSIGNABLE_ROLES.map((role) => (
                    <td key={role}>
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={hasRole(account, role)}
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
