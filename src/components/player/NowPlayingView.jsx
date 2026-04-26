import { useState } from 'react'
import {
  BookOpen,
  ChevronDown,
  Heart,
  Loader2,
  MoreHorizontal,
  Pause,
  Play,
  Repeat,
  Repeat1,
  SkipBack,
  SkipForward,
  Shuffle,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { usePlayer }           from '../../context/usePlayer'
import { useLibrary }          from '../../context/useLibrary'
import { useArtworkPalette }   from '../../hooks/useArtworkPalette'
import { useLyrics }           from '../../hooks/useLyrics'
import { formatTime }          from '../../utils/formatTime'
import { SongImage }           from '../shared/SongImage'
import { SongActionsMenu }     from '../shared/SongActionsMenu'
import { SnowMeltVisualizer }  from './SnowMeltVisualizer'
import { DynamicBackground }   from '../shared/DynamicBackground'

export function NowPlayingView({ isOpen, onClose }) {
  const [lyricsOpen, setLyricsOpen] = useState(false)
  const [menuOpen,   setMenuOpen]   = useState(false)

  const { favorites, addFavorite, removeFavorite } = useLibrary()
  const {
    currentSong, queue, queueIndex,
    currentTime, duration, isPlaying,
    shuffle, shuffleOrder, shufflePointer, repeat, volume,
    togglePlayPause, nextTrack, prevTrack,
    seekTo, setVolume, toggleShuffle, cycleRepeat,
    playQueueIndex, removeFromQueue,
  } = usePlayer()

  const palette = useArtworkPalette(currentSong, 3)
  const color   = palette[0] ?? null
  const { lyrics, loading: lyricsLoading, error: lyricsError } = useLyrics(currentSong)

  if (!currentSong) return null

  const safeDur    = duration > 0 ? duration : 0
  const safeTime   = Math.min(currentTime, safeDur || currentTime)
  const seekPct    = safeDur > 0 ? (safeTime / safeDur) * 100 : 0
  const isFav      = favorites.some((s) => s.id === currentSong.id)
  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat

  const toggleFav = () =>
    isFav ? removeFavorite(currentSong.id) : addFavorite(currentSong)

  /* ── Queue split ── */
  const remaining      = queue.slice(queueIndex + 1)
  const manualNext     = remaining.filter(s => s._queuedManually)
  const manualStartIdx = queueIndex + 1

  let autoNext = []
  let autoNextIndices = []
  if (shuffle && shuffleOrder.length > 0) {
    const futureShuffleIdxs = shuffleOrder
      .slice(shufflePointer + 1)
      .filter(i => queue[i] && !queue[i]._queuedManually)
    autoNextIndices = futureShuffleIdxs
    autoNext        = autoNextIndices.map(i => queue[i]).filter(Boolean)
  } else {
    const autoRemaining = remaining.filter(s => !s._queuedManually)
    autoNext            = autoRemaining
    autoNextIndices     = autoNext.map((_, i) => queueIndex + 1 + manualNext.length + i)
  }

  /* ── Art color CSS variables ── */
  const artStyle = color
    ? {
        '--art-h': color.h,
        '--art-s': `${Math.round(color.s * 100)}%`,
        '--art-l': `${Math.round(color.l * 100)}%`,
      }
    : {}

  return (
    <section
      className={`now-playing-view ${isOpen ? 'open' : ''}`}
      style={artStyle}
      aria-label="Now playing"
    >
      <DynamicBackground palette={palette} />

      {/* Header */}
      <header className="npv-header">
        <button className="npv-icon-btn" type="button" onClick={onClose} aria-label="Close">
          <ChevronDown size={20} />
        </button>
        <div className="npv-header-center">
          <span className="npv-header-label">NOW PLAYING</span>
          {queue.length > 0 && (
            <p className="npv-header-queue">{queueIndex + 1} / {queue.length}</p>
          )}
        </div>
        <div className="npv-header-actions">
          <button
            type="button"
            className={`npv-icon-btn${lyricsOpen ? ' is-active' : ''}`}
            onClick={() => setLyricsOpen((v) => !v)}
            aria-label={lyricsOpen ? 'Close lyrics' : 'Show lyrics'}
          >
            <BookOpen size={18} />
          </button>
        </div>
      </header>

      {/* Art panel */}
      <div className="npv-art-panel">
        <div className="npv-art-stage">
          <SnowMeltVisualizer isPlaying={isPlaying} />
          <div className="npv-art-center">
            <SongImage song={currentSong} className="npv-art-glow" aria-hidden draggable={false} />
            <SongImage
              song={currentSong}
              className={`npv-art-img${isPlaying ? ' is-playing' : ''}`}
              alt={`${currentSong.title} album art`}
              onClick={togglePlayPause}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && togglePlayPause()}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            />
          </div>
        </div>
      </div>

      {/* Controls panel */}
      <div className="npv-controls-panel">

        {/* Track info + actions */}
        <div className="npv-track-row">
          <div className="npv-track-info">
            <h2 className="npv-title">{currentSong.title}</h2>
            <p className="npv-artist">{currentSong.artist}</p>
          </div>
          <div className="npv-track-actions">
            <button
              type="button"
              className="npv-icon-btn"
              onClick={() => setMenuOpen(true)}
              aria-label="More options"
            >
              <MoreHorizontal size={20} />
            </button>
            <button
              type="button"
              className={`npv-fav-btn${isFav ? ' is-active' : ''}`}
              onClick={toggleFav}
              aria-label={isFav ? 'Unfavourite' : 'Favourite'}
            >
              <Heart size={20} fill={isFav ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>

        {/* Seek bar */}
        <div className="npv-seek">
          <input
            className="npv-seek-input"
            type="range"
            min="0"
            max={safeDur || 0}
            value={safeTime}
            style={{ '--pct': `${seekPct}%` }}
            onChange={(e) => seekTo(Number(e.target.value))}
            aria-label="Seek"
          />
          <div className="npv-seek-labels">
            <span>{formatTime(safeTime)}</span>
            <span>{formatTime(safeDur)}</span>
          </div>
        </div>

        {/* Main controls */}
        <div className="npv-main-controls">
          <button
            type="button"
            className={`npv-ctrl-side${shuffle ? ' is-on' : ''}`}
            onClick={toggleShuffle}
            onTouchStart={() => {}}
            aria-label="Shuffle"
          >
            <Shuffle size={18} />
          </button>
          <button
            type="button"
            className="npv-ctrl-skip"
            onClick={prevTrack}
            aria-label="Previous"
          >
            <SkipBack size={26} fill="currentColor" />
          </button>
          <button
            type="button"
            className="npv-ctrl-play"
            onClick={togglePlayPause}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            <span className="npv-play-ring npv-play-ring--outer" />
            <span className="npv-play-ring npv-play-ring--inner" />
            <span className="npv-play-icon">
              {isPlaying
                ? <Pause size={28} fill="currentColor" />
                : <Play size={28} fill="currentColor" style={{ marginLeft: 3 }} />}
            </span>
          </button>
          <button
            type="button"
            className="npv-ctrl-skip"
            onClick={nextTrack}
            aria-label="Next"
          >
            <SkipForward size={26} fill="currentColor" />
          </button>
          <button
            type="button"
            className={`npv-ctrl-side${repeat !== 'off' ? ' is-on' : ''}`}
            onClick={cycleRepeat}
            aria-label={`Repeat: ${repeat}`}
          >
            <RepeatIcon size={18} />
          </button>
        </div>

        {/* Volume */}
        <div className="npv-volume">
          <button
            type="button"
            className="npv-icon-btn"
            onClick={() => setVolume(volume === 0 ? 70 : 0)}
            aria-label={volume === 0 ? 'Unmute' : 'Mute'}
          >
            {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            className="npv-vol-input"
            type="range"
            min="0"
            max="100"
            step="1"
            value={volume}
            style={{ '--pct': `${volume}%` }}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Volume"
          />
          <span className="npv-vol-label">{volume}%</span>
        </div>

        {/* Queue panel — always visible below controls */}
        {(manualNext.length > 0 || autoNext.length > 0) && (
          <div className="npv-queue-panel">

            {manualNext.length > 0 && (
              <div className="npv-queue-section">
                <p className="npv-queue-section-label">Next in Queue</p>
                {manualNext.map((song, i) => {
                  const realIdx = manualStartIdx + i
                  return (
                    <div key={`manual-${song.id}-${i}`} className="npv-queue-item-wrap">
                      <SongImage song={song} className="npv-queue-thumb" alt="" />
                      <div
                        className="npv-queue-meta"
                        onClick={() => playQueueIndex(realIdx)}
                        style={{ flex: 1, cursor: 'pointer' }}
                      >
                        <p className="npv-queue-title">{song.title}</p>
                        <p className="npv-queue-artist">{song.artist}</p>
                      </div>
                      <div className="npv-queue-item-actions">
                        <button
                          type="button"
                          className="npv-queue-rm-btn"
                          onClick={() => removeFromQueue(realIdx)}
                          aria-label="Remove from queue"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {autoNext.length > 0 && (
              <div className="npv-queue-section">
                <p className="npv-queue-section-label">
                  {shuffle ? 'Up Next (Shuffled)' : 'Up Next'}
                </p>
                {autoNext.map((song, i) => {
                  const realIdx = autoNextIndices[i]
                  return (
                    <div
                      key={`auto-${song.id}-${i}`}
                      className="npv-queue-item-wrap"
                      style={{ cursor: 'pointer' }}
                      onClick={() => playQueueIndex(realIdx)}
                    >
                      <SongImage song={song} className="npv-queue-thumb" alt="" />
                      <div className="npv-queue-meta">
                        <p className="npv-queue-title">{song.title}</p>
                        <p className="npv-queue-artist">{song.artist}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

          </div>
        )}

      </div>

      {/* Lyrics overlay */}
      <div
        className={`npv-lyrics-overlay${lyricsOpen ? ' is-open' : ''}`}
        role="region"
        aria-label="Lyrics"
        aria-hidden={!lyricsOpen}
      >
        <div className="npv-lyrics-head">
          <span className="npv-lyrics-label">Lyrics</span>
          <div className="npv-lyrics-meta">
            <span className="npv-lyrics-song">{currentSong.title}</span>
            <span className="npv-lyrics-artist">{currentSong.artist}</span>
          </div>
          <button
            type="button"
            className="npv-icon-btn"
            onClick={() => setLyricsOpen(false)}
            aria-label="Close lyrics"
          >
            <X size={18} />
          </button>
        </div>

        <div className="npv-lyrics-body">
          {lyricsLoading && (
            <div className="npv-lyrics-status">
              <Loader2 size={24} className="npv-spin" />
              <span>Loading lyrics…</span>
            </div>
          )}
          {lyricsError && !lyricsLoading && (
            <div className="npv-lyrics-status">
              <p>{lyricsError}</p>
            </div>
          )}
          {lyrics && !lyricsLoading && (
            <p className="npv-lyrics-text">{lyrics}</p>
          )}
        </div>
      </div>

      {/* Song actions menu */}
      {menuOpen && (
        <SongActionsMenu
          song={currentSong}
          onClose={() => setMenuOpen(false)}
          showPlayActions={false}
        />
      )}

    </section>
  )
}
