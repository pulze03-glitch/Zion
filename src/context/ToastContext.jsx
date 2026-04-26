import { createContext, useCallback, useRef, useState } from 'react'

export const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const showToast = useCallback((message) => {
    const id = crypto.randomUUID()
    setToasts((t) => [...t, { id, message }])
    timers.current[id] = setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
      delete timers.current[id]
    }, 2400)
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, showToast }}>
      {children}
    </ToastContext.Provider>
  )
}
