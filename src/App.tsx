import { HashRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { PasswordGate } from './components/PasswordGate'
import { ToastProvider } from './components/Toast'
import { isSupabaseConfigured } from './lib/supabase'
import { AttendancePage } from './pages/AttendancePage'
import { BooksPage } from './pages/BooksPage'
import { CouncilPage } from './pages/CouncilPage'
import { DashboardPage } from './pages/DashboardPage'
import { MembersPage } from './pages/MembersPage'
import { MemorizationPage } from './pages/MemorizationPage'
import { PreparationPage } from './pages/PreparationPage'
import { QuranPage } from './pages/QuranPage'
import { TasksPage } from './pages/TasksPage'

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

export default function App() {
  if (!isSupabaseConfigured) return <ConfigurationError />

  return (
    <PasswordGate>
      <ToastProvider>
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="members" element={<MembersPage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="preparation" element={<PreparationPage />} />
              <Route path="memorization" element={<MemorizationPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="quran" element={<QuranPage />} />
              <Route path="council" element={<CouncilPage />} />
              <Route path="books" element={<BooksPage />} />
              <Route path="*" element={<DashboardPage />} />
            </Route>
          </Routes>
        </HashRouter>
      </ToastProvider>
    </PasswordGate>
  )
}
