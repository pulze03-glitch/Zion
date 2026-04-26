import { useContext } from 'react'
import { SettingsContext } from './settingsStore'

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
