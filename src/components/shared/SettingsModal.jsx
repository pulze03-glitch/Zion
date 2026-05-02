import { useRef, useState } from 'react'
import { Eye, EyeOff, Film, LogIn, LogOut, Save, Sparkles, Trash2, User, UserPlus, Wind, X, Palette } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSettings } from '../../context/useSettings'
import { useWallpaper } from '../../hooks/useWallpaper'
import { useAuth } from '../../context/useAuth'

const SEASON_OPTIONS = [
  { value: 'off',    label: 'Off',    emoji: '✕' },
  { value: 'winter', label: 'Winter', emoji: '❄' },
  { value: 'spring', label: 'Spring', emoji: '✿' },
  { value: 'summer', label: 'Summer', emoji: '✦' },
  { value: 'autumn', label: 'Autumn', emoji: '🍂' },
]

function SettingsModalContent({ aiApiKey, closeSettings, setAiApiKey }) {
  const [aiDraft, setAiDraft] = useState(aiApiKey)
  const [showAi,  setShowAi]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const { blobUrl, setWallpaper, clearWallpaper } = useWallpaper()
  const { season, setSeason, liveBg, setLiveBg } = useSettings()
  const { user, logout } = useAuth()
  const fileRef = useRef(null)

  const handleLogout = () => {
    logout()
    closeSettings()
  }

  const handleSave = () => {
    setAiApiKey(aiDraft)
    setSaved(true)
    setTimeout(() => { setSaved(false); closeSettings() }, 900)
  }

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) closeSettings()
  }

  return (
    <div className="settings-backdrop" onClick={handleBackdrop}>
      <div className="settings-modal glass" role="dialog" aria-modal="true" aria-label="Settings">
        <div className="settings-header">
          <h2 className="settings-title">Settings</h2>
          <button
            type="button"
            className="np-icon-btn"
            onClick={closeSettings}
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        {/* Account */}
        {user ? (
          <div className="settings-field settings-account-row">
            <div className="settings-account-info">
              <User size={14} />
              <span className="settings-account-email">{user.displayName || user.email}</span>
            </div>
            <button type="button" className="settings-signout-btn" onClick={handleLogout}>
              <LogOut size={13} /> Sign out
            </button>
          </div>
        ) : (
          <div className="settings-field settings-auth-row">
            <p className="settings-auth-label">Save playlists across devices</p>
            <div className="settings-auth-btns">
              <Link to="/login" className="settings-auth-btn" onClick={closeSettings}>
                <LogIn size={14} /> Sign in
              </Link>
              <Link to="/signup" className="settings-auth-btn settings-auth-btn--primary" onClick={closeSettings}>
                <UserPlus size={14} /> Create account
              </Link>
            </div>
          </div>
        )}

        {/* AI DJ key */}
        <div className="settings-field">
          <label className="settings-label" htmlFor="ai-key-input">
            <Sparkles size={14} /> Anthropic API Key <span className="settings-badge">AI DJ</span>
          </label>
          <p className="settings-hint">
            Optional. Get a key at <span className="settings-link">console.anthropic.com</span>.
            Used only to generate AI playlist names — never sent to any third party.
          </p>
          <div className="settings-input-row">
            <input
              id="ai-key-input"
              type={showAi ? 'text' : 'password'}
              className="settings-input"
              placeholder="sk-ant-..."
              value={aiDraft}
              onChange={(e) => setAiDraft(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              className="np-icon-btn"
              onClick={() => setShowAi((v) => !v)}
              aria-label={showAi ? 'Hide key' : 'Show key'}
            >
              {showAi ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Season effect */}
        <div className="settings-field">
          <label className="settings-label">
            <Wind size={14} /> Seasonal Atmosphere
          </label>
          <p className="settings-hint">
            Ambient particles that set the mood. Winter snow, spring blossoms, summer fireflies, autumn leaves.
          </p>
          <div className="season-picker">
            {SEASON_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`season-btn${season === opt.value ? ' is-active' : ''}`}
                onClick={() => setSeason(opt.value)}
              >
                <span className="season-btn-emoji">{opt.emoji}</span>
                <span className="season-btn-label">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic background */}
        <div className="settings-field">
          <div className="settings-toggle-row">
            <div>
              <label className="settings-label">
                <Palette size={14} /> Album Art Background
              </label>
              <p className="settings-hint">
                Home screen background shifts to colors from the playing song's artwork.
              </p>
            </div>
            <button
              type="button"
              className={`settings-toggle ${liveBg ? 'is-on' : ''}`}
              onClick={() => setLiveBg(!liveBg)}
              aria-pressed={liveBg}
              aria-label={liveBg ? 'Disable album art background' : 'Enable album art background'}
            >
              <span className="settings-toggle-thumb" />
            </button>
          </div>
        </div>

        {/* Wallpaper */}
        <div className="settings-field">
          <label className="settings-label">
            <Film size={14} /> Live Wallpaper
          </label>
          <p className="settings-hint">
            Upload a video (MP4, WebM) up to 4K. It plays silently in the background
            and its colors theme the app's accent buttons.
          </p>
          <div className="wallpaper-controls">
            {blobUrl ? (
              <>
                <video className="wallpaper-preview" src={blobUrl} autoPlay loop muted playsInline />
                <button type="button" className="wallpaper-clear-btn" onClick={clearWallpaper}>
                  <Trash2 size={14} /> Remove wallpaper
                </button>
              </>
            ) : (
              <button type="button" className="wallpaper-upload-btn" onClick={() => fileRef.current?.click()}>
                <Film size={16} /> Choose video
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              style={{ display: 'none' }}
              onChange={(e) => { if (e.target.files[0]) setWallpaper(e.target.files[0]) }}
            />
          </div>
        </div>

        <button
          type="button"
          className={`settings-save-btn ${saved ? 'is-saved' : ''}`}
          onClick={handleSave}
        >
          {saved ? 'Saved ✓' : <><Save size={15} /> Save</>}
        </button>
      </div>
    </div>
  )
}

export function SettingsModal() {
  const { aiApiKey, settingsOpen, closeSettings, setAiApiKey } = useSettings()
  if (!settingsOpen) return null
  return (
    <SettingsModalContent
      key={aiApiKey}
      aiApiKey={aiApiKey}
      closeSettings={closeSettings}
      setAiApiKey={setAiApiKey}
    />
  )
}
