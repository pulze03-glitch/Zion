import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { usePlayer } from '../../context/usePlayer'
import { useLibrary } from '../../context/useLibrary'
import { useSettings } from '../../context/useSettings'
import { useListeningTracker } from '../../hooks/useListeningTracker'
import { BottomNav } from './BottomNav'
import { FloatingNav } from './FloatingNav'
import { NowPlayingDock } from './NowPlayingDock'
import { Sidebar } from './Sidebar'
import { HiddenYouTubePlayer } from '../player/HiddenYouTubePlayer'
import { HiddenAudioPlayer }   from '../player/HiddenAudioPlayer'

// iOS WebKit pauses <video> in the background — use native <audio> for background playback.
// Every browser on iPhone/iPad uses WebKit, so we detect iOS here once.
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
import { NowPlayingView } from '../player/NowPlayingView'
import { SeasonEffect } from '../shared/SeasonEffect'
import { WallpaperLayer } from '../shared/WallpaperLayer'

export function AppShell() {
  const [isNowPlayingOpen, setNowPlayingOpen] = useState(false)
  const { currentSong, error } = usePlayer()
  const { addRecent } = useLibrary()
  const { season } = useSettings()
  useListeningTracker()

  useEffect(() => {
    if (!currentSong) return
    addRecent(currentSong)
  }, [currentSong, addRecent])

  return (
    <div className="app-shell" data-npv-open={isNowPlayingOpen ? 'true' : undefined}>
      <WallpaperLayer />
      <SeasonEffect season={season} />
      {IS_IOS ? <HiddenAudioPlayer /> : <HiddenYouTubePlayer />}
      <Sidebar />
      <main className="main-area">
        <Outlet />
      </main>
      {error && (
        <div
          className={`player-status-banner glass ${currentSong ? 'with-dock' : ''}`}
          role="status"
          aria-live="polite"
        >
          {error}
        </div>
      )}
      <NowPlayingDock onExpand={() => setNowPlayingOpen(true)} />
      <NowPlayingView
        isOpen={isNowPlayingOpen}
        onClose={() => setNowPlayingOpen(false)}
      />
      <BottomNav />
      <FloatingNav />
    </div>
  )
}
