import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { navItems } from './navItems'
import { getLastLibraryPath } from '../../utils/libraryHistory'

export function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const isLibraryActive =
    location.pathname === '/library' || location.pathname.startsWith('/playlist/')

  return (
    <nav className="mobile-nav glass" aria-label="Mobile navigation">
      <div className="mobile-nav-list">
        {navItems.map((item) => {
          const Icon = item.icon
          const isLibrary = item.to === '/library'

          if (isLibrary) {
            return (
              <button
                key={item.to}
                type="button"
                onTouchStart={() => {}}
                className={`mobile-link${isLibraryActive ? ' active' : ''}`}
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
              onTouchStart={() => {}}
              className={({ isActive }) =>
                isActive ? 'mobile-link active' : 'mobile-link'
              }
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
