import { useContext } from 'react'
import { Check } from 'lucide-react'
import { ToastContext } from '../../context/ToastContext'

export function Toaster() {
  const { toasts } = useContext(ToastContext)
  if (!toasts.length) return null
  return (
    <div className="toaster" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <span className="toast-icon"><Check size={14} strokeWidth={3} /></span>
          <span className="toast-msg">{t.message}</span>
        </div>
      ))}
    </div>
  )
}
