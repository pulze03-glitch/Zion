import { useRef, useCallback } from 'react'
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { usePlayer } from '../../context/usePlayer'
import { SongImage } from '../shared/SongImage'

// iOS requires a touchstart handler on the element for :active CSS to fire
const noop = () => {}

export function NowPlayingDock({ onExpand }) {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    togglePlayPause,
    nextTrack,
    prevTrack,
    seekTo,
  } = usePlayer()

  const progressRef = useRef(null)
  const isDragging  = useRef(false)

  const safeDur = duration > 0 ? duration : 0
  const pct     = safeDur > 0 ? Math.min((currentTime / safeDur) * 100, 100) : 0

  const seekFromPointer = useCallback((e) => {
    const bar = progressRef.current
    if (!bar || !safeDur) return
    const rect = bar.getBoundingClientRect()
    const x    = (e.clientX ?? e.touches?.[0]?.clientX ?? 0) - rect.left
    const frac = Math.max(0, Math.min(1, x / rect.width))
    seekTo(frac * safeDur)
  }, [safeDur, seekTo])

  const handlePointerDown = useCallback((e) => {
    e.stopPropagation()
    isDragging.current = true
    seekFromPointer(e)

    const onMove = (ev) => { if (isDragging.current) seekFromPointer(ev) }
    const onUp   = () => {
      isDragging.current = false
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup',   onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup',   onUp)
  }, [seekFromPointer])

  if (!currentSong) return null

  return (
    <section
      className="mini-player"
      aria-label="Mini player — tap to expand"
      onClick={onExpand}
      onTouchStart={noop}
    >
      {/* Blurred thumbnail backdrop */}
      <div className="mini-bg" aria-hidden="true">
        <SongImage song={currentSong} className="mini-bg-img" />
        <div className="mini-bg-tint" />
      </div>

      {/* Album art */}
      <SongImage
        song={currentSong}
        className="mini-art"
        alt={currentSong.title}
      />

      {/* Track info */}
      <div className="mini-meta">
        <p className="mini-title">{currentSong.title}</p>
        <p className="mini-artist">{currentSong.artist}</p>
      </div>

      {/* Controls */}
      <div className="mini-controls">
        <button
          type="button"
          className="mini-ctrl"
          aria-label="Previous"
          onTouchStart={noop}
          onClick={(e) => { e.stopPropagation(); prevTrack() }}
        >
          <SkipBack size={16} fill="currentColor" />
        </button>
        <button
          type="button"
          className="mini-ctrl mini-ctrl--play"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          onTouchStart={noop}
          onClick={(e) => { e.stopPropagation(); togglePlayPause() }}
        >
          {isPlaying
            ? <Pause size={20} fill="currentColor" />
            : <Play  size={20} fill="currentColor" style={{ marginLeft: 2 }} />}
        </button>
        <button
          type="button"
          className="mini-ctrl"
          aria-label="Next"
          onTouchStart={noop}
          onClick={(e) => { e.stopPropagation(); nextTrack() }}
        >
          <SkipForward size={16} fill="currentColor" />
        </button>
      </div>

      {/* Seekable progress strip at bottom edge */}
      <div
        ref={progressRef}
        className="mini-progress"
        onPointerDown={handlePointerDown}
        onClick={(e) => e.stopPropagation()}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(safeDur)}
        aria-valuenow={Math.round(currentTime)}
      >
        <div className="mini-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </section>
  )
}
