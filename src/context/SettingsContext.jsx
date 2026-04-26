import { useCallback, useEffect, useMemo, useState } from 'react'
import { SettingsContext, AI_LS_KEY, SEASON_LS_KEY, LIVE_BG_LS_KEY } from './settingsStore'

export function SettingsProvider({ children }) {
  const [aiApiKey, setAiKeyState] = useState(
    () => localStorage.getItem(AI_LS_KEY) ?? '',
  )
  const [season, setSeasonState] = useState(
    () => localStorage.getItem(SEASON_LS_KEY) ?? 'winter',
  )
  const [liveBg, setLiveBgState] = useState(
    () => localStorage.getItem(LIVE_BG_LS_KEY) !== 'false',
  )
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Clear any old YouTube key that was stored client-side — no longer needed
  useEffect(() => {
    localStorage.removeItem('liena-yt-key')
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
