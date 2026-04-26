import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { navItems } from './navItems'
import { getLastLibraryPath } from '../../utils/libraryHistory'
import { ChrysanthemumIcon } from '../shared/ChrysanthemumIcon'

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const isLibraryActive =
    location.pathname === '/library' || location.pathname.startsWith('/playlist/')

  return (
    <aside className="sidebar">
      {/* Zion brand — snowflake always visible, wordmark fades on hover */}
      <NavLink to="/" className="frost-brand" aria-label="Zion — go to home">
        <ChrysanthemumIcon size={28} className="frost-snowflake" />
        <span className="frost-wordmark">Zion</span>
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
