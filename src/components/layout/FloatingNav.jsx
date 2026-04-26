import { useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { navItems } from './navItems'
import { getLastLibraryPath } from '../../utils/libraryHistory'

function navTarget(item) {
  return item.to === '/library' ? getLastLibraryPath() : item.to
}

export function FloatingNav() {
  const [open, setOpen] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const holdTimer = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

  const handleTouchStart = () => {
    holdTimer.current = setTimeout(() => setOpen(true), 180)
  }

  const handleTouchEnd = () => {
    clearTimeout(holdTimer.current)
    if (hoveredIndex !== null) {
      navigate(navTarget(navItems[hoveredIndex]))
    }
    setOpen(false)
    setHoveredIndex(null)
  }

  const handleTouchMove = (e) => {
    if (!open) return
    const touch = e.touches[0]
    const els = document.elementsFromPoint(touch.clientX, touch.clientY)
    const hit = els.find((el) => el.dataset.navIndex !== undefined)
    setHoveredIndex(hit ? Number(hit.dataset.navIndex) : null)
  }

  const handleTap = () => {
    if (!open) setOpen((v) => !v)
    else setOpen(false)
  }

  // Library area includes /playlist/:id
  const isLibraryPath = (path) =>
    path === '/library' || path.startsWith('/playlist/')

  const currentItem = navItems.find((item) =>
    item.to === '/library'
      ? isLibraryPath(location.pathname)
      : item.end
        ? location.pathname === item.to
        : location.pathname.startsWith(item.to)
  ) || navItems[0]
  const Icon = currentItem.icon

  return (
    <>
      {/* Backdrop — tap to close */}
      {open && (
        <div
          className="fnav-backdrop"
          onTouchEnd={() => { setOpen(false); setHoveredIndex(null) }}
          onClick={() => { setOpen(false); setHoveredIndex(null) }}
        />
      )}

      {/* Nav items — appear above button on open */}
      <div className={`fnav-items${open ? ' is-open' : ''}`}>
        {navItems.map((item, i) => {
          const ItemIcon = item.icon
          const isActive = item.to === '/library'
            ? isLibraryPath(location.pathname)
            : item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to)
          const isHovered = hoveredIndex === i
          return (
            <button
              key={item.to}
              type="button"
              data-nav-index={i}
              className={`fnav-item${isActive ? ' is-active' : ''}${isHovered ? ' is-hover' : ''}`}
              style={{ '--i': i }}
              onTouchStart={() => {}}
              onClick={() => { navigate(navTarget(item)); setOpen(false) }}
            >
              <ItemIcon size={18} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>

      {/* The floating button */}
      <button
        type="button"
        className={`fnav-btn${open ? ' is-open' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onClick={handleTap}
        aria-label="Navigation"
      >
        <Icon size={18} />
      </button>
    </>
  )
}
