import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { HomeRedirect, RequireAuth, RequireRole } from './auth/Guards'
import { LoginPage } from './auth/LoginPage'
import { Loading } from './components/Feedback'
import { ToastProvider } from './components/Toast'
import { isSupabaseConfigured } from './lib/supabase'

/**
 * Les deux moitiés de l'application sont chargées à la demande : l'APK d'un
 * simple عضو ne télécharge jamais le code de l'administration, et inversement.
 */
const AdminApp = lazy(() => import('./admin/AdminApp'))
const MemberApp = lazy(() => import('./app/MemberApp'))

function ConfigurationError() {
  return (
    <div className="gate">
      <div className="gate__card">
        <h1 className="gate__title">الإعداد غير مكتمل</h1>
        <p className="gate__hint">
          لم يتم ضبط متغيّرات Supabase. أنشئ ملف <code>.env</code> انطلاقاً من{' '}
          <code>.env.example</code> ثم أعد تشغيل التطبيق.
        </p>
      </div>
    </div>
  )
}

/** Un utilisateur déjà connecté n'a rien à faire sur l'écran de connexion. */
function LoginRoute() {
  const { loading, session } = useAuth()
  if (loading) return <Loading label="جارٍ التحقق…" />
  if (session) return <Navigate to="/" replace />
  return <LoginPage />
}

export default function App() {
  if (!isSupabaseConfigured) return <ConfigurationError />

  return (
    <AuthProvider>
      <ToastProvider>
        <HashRouter>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/login" element={<LoginRoute />} />

              <Route
                path="/admin/*"
                element={
                  <RequireRole roles={['supervisor']}>
                    <AdminApp />
                  </RequireRole>
                }
              />

              <Route
                path="/app/*"
                element={
                  <RequireAuth>
                    <MemberApp />
                  </RequireAuth>
                }
              />

              <Route path="*" element={<HomeRedirect />} />
            </Routes>
          </Suspense>
        </HashRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
