/**
 * PiPPlayer — renders the mini player inside the Document PiP window.
 * Uses createPortal so it shares the main page's React context tree
 * (PlayerContext, LibraryContext, etc.) perfectly.
 */
import { createPortal } from 'react-dom'
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { usePlayer } from '../../context/usePlayer'
import { SongImage } from '../shared/SongImage'

function PiPContent() {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    togglePlayPause,
    nextTrack,
    prevTrack,
  } = usePlayer()

  if (!currentSong) return null

  const safeDur = duration > 0 ? duration : 0
  const pct     = safeDur > 0 ? Math.min((currentTime / safeDur) * 100, 100) : 0

  return (
    <div className="pip-player">

      {/* Square album art with blurred backdrop */}
      <div className="pip-art-wrap">
        <SongImage song={currentSong} className="pip-art-bg"  aria-hidden="true" />
        <SongImage song={currentSong} className="pip-art"     alt={currentSong.title} />
        {/* Gradient fade into body */}
        <div className="pip-art-fade" aria-hidden="true" />
      </div>

      {/* Controls section */}
      <div className="pip-body">
        <div className="pip-meta">
          <p className="pip-title">{currentSong.title}</p>
          <p className="pip-artist">{currentSong.artist}</p>
        </div>

        <div className="pip-controls">
          <button
            type="button"
            className="pip-ctrl"
            aria-label="Previous"
            onClick={prevTrack}
          >
            <SkipBack size={18} fill="currentColor" />
          </button>

          <button
            type="button"
            className="pip-ctrl pip-ctrl--play"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            onClick={togglePlayPause}
          >
            {isPlaying
              ? <Pause size={24} fill="currentColor" />
              : <Play  size={24} fill="currentColor" style={{ marginLeft: 2 }} />}
          </button>

          <button
            type="button"
            className="pip-ctrl"
            aria-label="Next"
            onClick={nextTrack}
          >
            <SkipForward size={18} fill="currentColor" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="pip-progress" aria-hidden="true">
          <div className="pip-progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

    </div>
  )
}

export function PiPPlayer({ pipWindow }) {
  if (!pipWindow) return null
  return createPortal(<PiPContent />, pipWindow.document.body)
}
