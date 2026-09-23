import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Loading } from '../components/Feedback'
import { roleLabel } from '../lib/roles'
import type { AppRole } from '../lib/types'
import { useAuth } from './AuthProvider'

/**
 * Compte créé mais rattaché à aucun membre : c'est ce que voit quelqu'un qui
 * s'est inscrit avec un e-mail inconnu du مشرف عام. Il n'a aucun rôle, donc
 * aucune policy ne lui ouvre quoi que ce soit — l'écran ne fait que l'expliquer.
 */
export function PendingPage() {
  const { user, signOut } = useAuth()

  return (
    <div className="gate">
      <div className="gate__card">
        <span className="app__logo gate__logo" aria-hidden="true">
          ح
        </span>
        <h1 className="gate__title">حسابك في انتظار التفعيل</h1>
        <p className="gate__hint">
          تم إنشاء حسابك بنجاح، لكنه غير مرتبط بعدُ ببطاقة عضو. تواصل مع المشرف العام
          ليضيف بريدك الإلكتروني إلى بطاقتك، ثم أعد تسجيل الدخول.
        </p>
        <p className="gate__mail" dir="ltr">
          {user?.email}
        </p>
        <button type="button" className="btn btn--ghost gate__button" onClick={() => void signOut()}>
          خروج
        </button>
      </div>
    </div>
  )
}

export function AccessDenied({ needed }: { needed: readonly AppRole[] }) {
  const { signOut } = useAuth()

  return (
    <div className="gate">
      <div className="gate__card">
        <h1 className="gate__title">لا صلاحية</h1>
        <p className="gate__hint">
          هذه الصفحة مخصّصة لـ: {needed.map(roleLabel).join('، ')}.
        </p>
        <a className="btn btn--primary gate__button" href="#/">
          العودة
        </a>
        <button type="button" className="btn btn--ghost gate__button" onClick={() => void signOut()}>
          خروج
        </button>
      </div>
    </div>
  )
}

/** Exige une session valide et au moins un rôle. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { loading, session, roles } = useAuth()

  if (loading) return <Loading label="جارٍ التحقق…" />
  if (!session) return <Navigate to="/login" replace />
  if (roles.length === 0) return <PendingPage />
  return <>{children}</>
}

/** Exige en plus l'un des rôles donnés. */
export function RequireRole({
  roles: needed,
  children,
}: {
  roles: readonly AppRole[]
  children: ReactNode
}) {
  const { has } = useAuth()

  return (
    <RequireAuth>
      {has(...needed) ? children : <AccessDenied needed={needed} />}
    </RequireAuth>
  )
}

/** Aiguillage de la racine : le site pour le مشرف عام, l'app pour les autres. */
export function HomeRedirect() {
  const { loading, session, roles, has } = useAuth()

  if (loading) return <Loading label="جارٍ التحقق…" />
  if (!session) return <Navigate to="/login" replace />
  if (roles.length === 0) return <PendingPage />
  return <Navigate to={has('supervisor') ? '/admin' : '/app'} replace />
}
