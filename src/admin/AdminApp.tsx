import { NavLink, Route, Routes } from 'react-router-dom'
import { useAuth, useDisplayName } from '../auth/AuthProvider'
import { BooksPage } from './BooksPage'
import { DashboardPage } from './DashboardPage'
import { MajalisPage } from './MajalisPage'
import { MembersPage } from './MembersPage'
import { MemorizationPage } from './MemorizationPage'
import { AttendancePage, PreparationPage, TextsPage } from './SheetPages'
import { TasksDetailPage } from './TasksDetailPage'
import { UsersPage } from './UsersPage'

const NAV = [
  { to: '/admin', label: 'البيان', end: true },
  { to: '/admin/members', label: 'الأعضاء' },
  { to: '/admin/majalis', label: 'المجالس' },
  { to: '/admin/attendance', label: 'الحضور الأسبوعي' },
  { to: '/admin/preparation', label: 'مسألة التحضير' },
  { to: '/admin/texts', label: 'حفظ النصوص' },
  { to: '/admin/tasks', label: 'الواجبات الفردية' },
  { to: '/admin/memorization', label: 'برنامج الحفظ' },
  { to: '/admin/books', label: 'الكتب' },
  { to: '/admin/users', label: 'الحسابات' },
]

export default function AdminApp() {
  const { has, signOut } = useAuth()
  const name = useDisplayName()

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <span className="app__logo" aria-hidden="true">
            ح
          </span>
          <div>
            <h1 className="app__title">متابعة الحلقة</h1>
            <p className="app__subtitle">لوحة المشرف العام — {name}</p>
          </div>
        </div>

        <div className="row-actions">
          {has('member', 'tasks_officer', 'memorization_officer', 'majlis_leader') ? (
            <a className="btn btn--ghost" href="#/app">
              واجهة الأعضاء
            </a>
          ) : null}
          <button type="button" className="btn btn--ghost" onClick={() => void signOut()}>
            خروج
          </button>
        </div>
      </header>

      <nav className="app__nav" aria-label="التنقل بين الصفحات">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <main className="app__main">
        <Routes>
          <Route index element={<DashboardPage />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="majalis" element={<MajalisPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="preparation" element={<PreparationPage />} />
          <Route path="texts" element={<TextsPage />} />
          <Route path="tasks" element={<TasksDetailPage />} />
          <Route path="memorization" element={<MemorizationPage />} />
          <Route path="books" element={<BooksPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="*" element={<DashboardPage />} />
        </Routes>
      </main>
    </div>
  )
}
