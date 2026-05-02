import { useEffect, useState } from 'react'
import { useClickEffect } from './hooks/useClickEffect'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { Check, Download, X } from 'lucide-react'
import { AppShell }        from './components/layout/AppShell'
import { HomePage }        from './pages/HomePage'
import { SearchPage }      from './pages/SearchPage'
import { LibraryPage }     from './pages/LibraryPage'
import { PlaylistDetailPage } from './pages/PlaylistDetailPage'
import { StatsPage }          from './pages/StatsPage'
import { LoginPage }       from './pages/LoginPage'
import { SignupPage }      from './pages/SignupPage'
import { SettingsModal }   from './components/shared/SettingsModal'
import { Toaster }         from './components/shared/Toaster'
import { useLibrary }      from './context/useLibrary'
import { useAuth }         from './context/useAuth'
import { decodePlaylist, readShareParam } from './utils/playlistShare'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="auth-loading"><span className="auth-loading-dot" /></div>
  if (!user)   return <Navigate to="/login" replace />
  return children
}

function PlaylistImportBanner() {
  const { createPlaylistWithSongs } = useLibrary()
  const navigate = useNavigate()
  const [pending, setPending] = useState(null)
  const [done, setDone]       = useState(false)

  useEffect(() => {
    const encoded = readShareParam()
    if (!encoded) return
    const decoded = decodePlaylist(encoded)
    if (decoded?.name && Array.isArray(decoded.songs)) {
      setPending(decoded)
      // Clean the URL without reloading
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  if (!pending || done) return null

  const handleImport = async () => {
    const pl = await createPlaylistWithSongs(pending.name, pending.songs)
    setDone(true)
    setTimeout(() => {
      setPending(null)
      navigate(`/playlist/${pl.id}`)
    }, 1000)
  }

  return (
    <div className="import-banner glass">
      <div className="import-banner-info">
        <Download size={16} />
        <span>
          <strong>{pending.name}</strong> — {pending.songs.length} songs shared with you
        </span>
      </div>
      <div className="import-banner-actions">
        <button type="button" className="import-banner-btn import-banner-btn--accept" onClick={handleImport}>
          {done ? <Check size={14} /> : 'Import'}
        </button>
        <button type="button" className="import-banner-btn import-banner-btn--dismiss" onClick={() => setPending(null)}>
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

function App() {
  useClickEffect()
  return (
    <>
      <Routes>
        <Route path="/login"  element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route element={<RequireAuth><AppShell /></RequireAuth>}>
          <Route path="/"          element={<HomePage />} />
          <Route path="/search"    element={<SearchPage />} />
          <Route path="/library"   element={<LibraryPage />} />
          <Route path="/playlist/:id" element={<PlaylistDetailPage />} />
          <Route path="/stats"        element={<StatsPage />} />
          <Route path="*"          element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <SettingsModal />
      <PlaylistImportBanner />
      <Toaster />
    </>
  )
}

export default App
