import { useEffect } from 'react'

export function useClickEffect() {
  useEffect(() => {
    function pop(e) {
      if (e.detail === 0) return
      const target = e.target.closest('button, [role="button"], a')
      if (!target) return
      // Remove existing class to re-trigger if double-clicked fast
      target.classList.remove('btn-pop')
      void target.offsetWidth
      target.classList.add('btn-pop')
      target.addEventListener('animationend', () => target.classList.remove('btn-pop'), { once: true })
    }

    window.addEventListener('click', pop)
    return () => window.removeEventListener('click', pop)
  }, [])
}
