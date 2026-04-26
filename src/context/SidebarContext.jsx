import { createContext, useContext, useState } from 'react'

const SidebarCtx = createContext(null)

export function SidebarProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <SidebarCtx.Provider value={{
      isOpen,
      toggle: () => setIsOpen((o) => !o),
      close:  () => setIsOpen(false),
    }}>
      {children}
    </SidebarCtx.Provider>
  )
}

export function useSidebar() {
  return useContext(SidebarCtx)
}
