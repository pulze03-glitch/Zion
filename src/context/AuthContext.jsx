import { createContext, useCallback, useEffect, useState } from 'react'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(() => {
    try { return JSON.parse(localStorage.getItem('auth-user')) } catch { return null }
  })
  const [token, setToken]     = useState(() => localStorage.getItem('auth-token') || null)
  const [loading, setLoading] = useState(!!localStorage.getItem('auth-token'))

  useEffect(() => {
    if (!token) { setLoading(false); return }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.user) {
          setUser(data.user)
          localStorage.setItem('auth-user', JSON.stringify(data.user))
        } else {
          setUser(null); setToken(null)
          localStorage.removeItem('auth-token')
          localStorage.removeItem('auth-user')
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  const persist = (tokenValue, userValue) => {
    localStorage.setItem('auth-token', tokenValue)
    localStorage.setItem('auth-user', JSON.stringify(userValue))
    setToken(tokenValue)
    setUser(userValue)
  }

  const login = useCallback(async (email, password) => {
    const res  = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed')
    persist(data.token, data.user)
    return data.user
  }, [])

  const register = useCallback(async (email, password, displayName) => {
    const res  = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Registration failed')
    persist(data.token, data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('auth-token')
    localStorage.removeItem('auth-user')
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
