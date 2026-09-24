import { lazy, Suspense, useMemo } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { useAuth, useDisplayName } from '../auth/AuthProvider'
import { AccessDenied } from '../auth/Guards'
import { Loading } from '../components/Feedback'
import type { AppRole } from '../lib/types'
import { BooksListPage } from './BooksListPage'
import { CouncilPage } from './CouncilPage'
import { HomePage } from './HomePage'
import { MemorizationOfficerPage } from './MemorizationOfficerPage'
import { MyProgressPage } from './MyProgressPage'
import { MyTasksPage } from './MyTasksPage'
import { QuranPage } from './QuranPage'
import { TasksOfficerPage } from './TasksOfficerPage'

// Le lecteur PDF embarque pdf.js : il n'est téléchargé qu'à l'ouverture d'un livre.
const BookReaderPage = lazy(() =>
  import('./BookReaderPage').then((module) => ({ default: module.BookReaderPage })),
)

interface Tab {
  to: string
  label: string
  icon: string
  roles: AppRole[] | null
  end?: boolean
}

const TABS: Tab[] = [
  { to: '/app', label: 'الرئيسية', icon: '⌂', roles: null, end: true },
  { to: '/app/quran', label: 'المصحف', icon: '📖', roles: null },
  { to: '/app/tasks', label: 'واجباتي', icon: '✓', roles: ['member'] },
  { to: '/app/progress', label: 'تقدّمي', icon: '↗', roles: ['member'] },
  { to: '/app/books', label: 'الكتب', icon: '▤', roles: null },
  { to: '/app/council', label: 'مجلسي', icon: '◎', roles: ['majlis_leader'] },
  { to: '/app/officer/tasks', label: 'المتابعة', icon: '◫', roles: ['tasks_officer'] },
  { to: '/app/officer/memorization', label: 'الحفظ', icon: '☾', roles: ['memorization_officer'] },
]

function Guard({ roles, children }: { roles: AppRole[]; children: React.ReactNode }) {
  const { has } = useAuth()
  return has(...roles) ? <>{children}</> : <AccessDenied needed={roles} />
}

export default function MemberApp() {
  const { has, signOut } = useAuth()
  const name = useDisplayName()

  const tabs = useMemo(
    () => TABS.filter((tab) => tab.roles === null || has(...tab.roles)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [has],
  )

  return (
    <div className="mobile">
      <header className="mobile__header">
        <div>
          <h1 className="mobile__title">متابعة الحلقة</h1>
          <p className="mobile__user">{name}</p>
        </div>
        <div className="row-actions">
          {has('supervisor') ? (
            <a className="btn btn--ghost btn--sm" href="#/admin">
              الإدارة
            </a>
          ) : null}
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => void signOut()}>
            خروج
          </button>
        </div>
      </header>

      <main className="mobile__main">
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route index element={<HomePage />} />
            <Route path="quran" element={<QuranPage />} />
            <Route
              path="tasks"
              element={
                <Guard roles={['member']}>
                  <MyTasksPage />
                </Guard>
              }
            />
            <Route
              path="progress"
              element={
                <Guard roles={['member']}>
                  <MyProgressPage />
                </Guard>
              }
            />
            <Route path="books" element={<BooksListPage />} />
            <Route path="books/:bookId" element={<BookReaderPage />} />
            <Route
              path="council"
              element={
                <Guard roles={['majlis_leader']}>
                  <CouncilPage />
                </Guard>
              }
            />
            <Route
              path="officer/tasks"
              element={
                <Guard roles={['tasks_officer']}>
                  <TasksOfficerPage />
                </Guard>
              }
            />
            <Route
              path="officer/memorization"
              element={
                <Guard roles={['memorization_officer']}>
                  <MemorizationOfficerPage />
                </Guard>
              }
            />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </Suspense>
      </main>

      <nav className="mobile__tabs" aria-label="التنقل">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) => `mobile-tab${isActive ? ' is-active' : ''}`}
          >
            <span className="mobile-tab__icon" aria-hidden="true">
              {tab.icon}
            </span>
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
