import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export function SignupPage() {
  const { register }      = useAuth()
  const navigate          = useNavigate()
  const [name,  setName]  = useState('')
  const [email, setEmail] = useState('')
  const [pass,  setPass]  = useState('')
  const [error, setError] = useState('')
  const [busy,  setBusy]  = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await register(email.trim(), pass, name.trim())
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card glass">
        <h1 className="auth-title">Zion</h1>
        <p className="auth-sub">Create your account</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label">
            Display name
            <input
              type="text"
              className="auth-input"
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="name"
              placeholder="Optional"
            />
          </label>

          <label className="auth-label">
            Email
            <input
              type="email"
              className="auth-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className="auth-label">
            Password <span className="auth-hint">(min 6 characters)</span>
            <input
              type="password"
              className="auth-input"
              value={pass}
              onChange={e => setPass(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-btn" disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
