import { useCallback, useEffect, useMemo, useState } from 'react'
import { SettingsContext, AI_LS_KEY, SEASON_LS_KEY, LIVE_BG_LS_KEY } from './settingsStore'

export function SettingsProvider({ children }) {
  const [aiApiKey, setAiKeyState] = useState(
    () => localStorage.getItem(AI_LS_KEY) ?? '',
  )
  const [season, setSeasonState] = useState(
    () => localStorage.getItem(SEASON_LS_KEY) ?? 'off',
  )
  const [liveBg, setLiveBgState] = useState(
    () => localStorage.getItem(LIVE_BG_LS_KEY) !== 'false',
  )
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Clear any old YouTube key that was stored client-side — no longer needed
  useEffect(() => {
    localStorage.removeItem('liena-yt-key')
    // One-time migration: reset season to off for all existing users
    if (!localStorage.getItem('zion-season-reset-v1')) {
      localStorage.setItem(SEASON_LS_KEY, 'off')
      setSeasonState('off')
      localStorage.setItem('zion-season-reset-v1', '1')
    }
  }, [])

  const setAiApiKey = useCallback((key) => {
    const trimmed = key.trim()
    localStorage.setItem(AI_LS_KEY, trimmed)
    setAiKeyState(trimmed)
  }, [])

  const setSeason = useCallback((s) => {
    localStorage.setItem(SEASON_LS_KEY, s)
    setSeasonState(s)
  }, [])

  const setLiveBg = useCallback((val) => {
    localStorage.setItem(LIVE_BG_LS_KEY, String(val))
    setLiveBgState(val)
  }, [])

  const value = useMemo(
    () => ({
      aiApiKey,
      season,
      liveBg,
      settingsOpen,
      setAiApiKey,
      setSeason,
      setLiveBg,
      openSettings:  () => setSettingsOpen(true),
      closeSettings: () => setSettingsOpen(false),
    }),
    [aiApiKey, season, liveBg, settingsOpen, setAiApiKey, setSeason, setLiveBg],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
