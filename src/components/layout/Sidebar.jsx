import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { navItems } from './navItems'
import { getLastLibraryPath } from '../../utils/libraryHistory'

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const isLibraryActive =
    location.pathname === '/library' || location.pathname.startsWith('/playlist/')

  return (
    <aside className="sidebar">
      {/* Frost brand — snowflake always visible, wordmark fades on hover */}
      <NavLink to="/" className="frost-brand" aria-label="Frost — go to home">
        <span className="frost-snowflake" aria-hidden>❄</span>
        <span className="frost-wordmark">Frost</span>
        <span className="frost-tag">by Liena</span>
      </NavLink>

      <nav className="layout-nav-list" aria-label="Navigation">
        {navItems.map((item) => {
          const Icon = item.icon
          const isLibrary = item.to === '/library'

          if (isLibrary) {
            return (
              <button
                key={item.to}
                type="button"
                className={`layout-link${isLibraryActive ? ' active' : ''}`}
                onClick={() => navigate(getLastLibraryPath())}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            )
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive ? 'layout-link active' : 'layout-link'
              }
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
