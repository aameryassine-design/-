import { NavLink, Outlet } from 'react-router-dom'
import { NAV_ITEMS } from '../lib/constants'
import { lockApp, passwordRequired } from './PasswordGate'

export function Layout() {
  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <span className="app__logo" aria-hidden="true">
            ح
          </span>
          <div>
            <h1 className="app__title">متابعة الحلقة</h1>
            <p className="app__subtitle">سجلّ المتابعة الأسبوعية للمجموعة</p>
          </div>
        </div>

        {passwordRequired ? (
          <button type="button" className="btn btn--ghost app__lock" onClick={lockApp}>
            قفل
          </button>
        ) : null}
      </header>

      <nav className="app__nav" aria-label="التنقل بين الصفحات">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <main className="app__main">
        <Outlet />
      </main>
    </div>
  )
}
