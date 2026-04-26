import { useState, useEffect } from 'react'
import {
  Loader2,
  MoreHorizontal,
  Play,
  RefreshCw,
  Search,
  Settings,
} from 'lucide-react'
import { usePlayer }           from '../context/usePlayer'
import { useLibrary }          from '../context/useLibrary'
import { useSettings }         from '../context/useSettings'
import { useSearch }           from '../hooks/useSearch'
import { useFeaturedSongs }    from '../hooks/useFeaturedSongs'
import { useMixes }            from '../hooks/useMixes'
import { useArtworkPalette }   from '../hooks/useArtworkPalette'
import { SongImage }           from '../components/shared/SongImage'
import { SongActionsMenu }     from '../components/shared/SongActionsMenu'
import { DynamicBackground }   from '../components/shared/DynamicBackground'
import { ChrysanthemumIcon }   from '../components/shared/ChrysanthemumIcon'


function getGreeting() {
  const h = new Date().getHours()
  if (h < 5)  return 'Up late?'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Good night'
}

function formatClock(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(date) {
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
}

export function HomePage() {
  const [menuSong, setMenuSong] = useState(null)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const { query, setQuery, results, isLoading, error }                          = useSearch({ persistKey: 'home-search-query' })
  const { songs: featured, isLoading: featLoading, error: featError, reload }   = useFeaturedSongs()
  const { openSettings, liveBg }                                                 = useSettings()
  const { currentSong, isPlaying, playFromList }                                = usePlayer()
  const palette  = useArtworkPalette(currentSong, 3)
  const { recents } = useLibrary()
  const { mixes, playMix, loadingId } = useMixes()

  const hasQuery  = query.trim().length >= 2

  return (
    <div className="hub-view">

      {/* Album-art ambient background — toggled in Settings */}
      {liveBg && <DynamicBackground palette={palette} fixed bright />}

      {/* ═══════════════════════════ SEARCH BAR ═════════════════ */}
      <div className="hub-search-bar glass">
        <span className="hub-bar-brand" aria-hidden>
          <ChrysanthemumIcon size={14} className="hub-bar-snowflake" />
          <span className="hub-bar-wordmark">Zion</span>
        </span>
        <span className="hub-bar-sep" aria-hidden />
        <Search size={17} className="hub-search-icon" aria-hidden />
        <input
          type="search"
          className="hub-search-input"
          placeholder="Search any song, artist…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="Search songs"
        />
        {isLoading && <Loader2 size={16} className="hub-spin" aria-label="Searching" />}
        <button
          type="button"
          className="hub-settings-btn np-icon-btn"
          onClick={(e) => { e.stopPropagation(); openSettings() }}
          aria-label="Open settings"
          title="API Key Settings"
        >
          <Settings size={17} />
        </button>
      </div>

      {/* ═══════════════════════════ GREETING + CLOCK ═══════════ */}
      {!hasQuery && (
        <div className="hub-greeting-bar">
          <div className="hub-greeting-left">
            <p className="hub-greeting-label">{getGreeting()}</p>
            <p className="hub-greeting-date">{formatDate(now)}</p>
          </div>
          <div className="hub-clock" aria-live="polite" aria-label={`Current time ${formatClock(now)}`}>
            {formatClock(now)}
          </div>
        </div>
      )}

      {/* ═══════════════════════════ YOUR MIXES ═════════════════ */}
      {!hasQuery && mixes.length > 0 && (
        <div className="hub-section-block">
          <div className="hub-section-hdr">
            <span className="hub-section-label">Your Mixes</span>
          </div>
          <div className="hub-mixes-rail">
            {mixes.map((mix) => (
              <button
                key={mix.id}
                type="button"
                className="hub-mix-card"
                onClick={() => playMix(mix)}
                aria-label={`Play ${mix.label}`}
                disabled={loadingId === mix.id}
              >
                <div className="hub-mix-grid">
                  {Array.from({ length: 4 }).map((_, i) => {
                    const seed = mix.seeds[i]
                    return seed
                      ? <SongImage key={i} song={seed} className="hub-mix-thumb" alt="" />
                      : <div key={i} className="hub-mix-thumb hub-mix-thumb--empty" />
                  })}
                </div>
                <div className="hub-mix-info">
                  <span className="hub-mix-emoji">{mix.emoji}</span>
                  <p className="hub-mix-label">{mix.label}</p>
                  <p className="hub-mix-sub">{mix.sublabel}</p>
                </div>
                {loadingId === mix.id && (
                  <div className="hub-mix-loading" aria-hidden>
                    <Loader2 size={20} className="hub-spin" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════ FEATURED CARDS ══════════════ */}
      {!hasQuery && (
        <div className="hub-section-block">
          <div className="hub-section-hdr">
            <span className="hub-section-label">Featured</span>
            <button
              type="button"
              className="hub-refresh-btn np-icon-btn"
              onClick={(e) => { e.stopPropagation(); reload() }}
              aria-label="Refresh featured"
            >
              <RefreshCw size={13} />
            </button>
          </div>

          {featError && (
            <div className="placeholder-item">{featError}</div>
          )}
          {featLoading && (
            <div className="hub-loading-row">
              <Loader2 size={18} className="hub-spin" /><span>Loading…</span>
            </div>
          )}

          {!featLoading && !featError && featured.length > 0 && (
            <div className="hub-featured-rail">
              {featured.map((song, i) => (
                <button
                  key={song.id}
                  type="button"
                  className={`hub-featured-card ${currentSong?.id === song.id ? 'is-current' : ''}`}
                  onClick={() => playFromList(featured, i)}
                  aria-label={`Play ${song.title}`}
                >
                  <div className="hub-featured-art-wrap">
                    <SongImage song={song} className="hub-featured-art" alt={song.title} />
                    <div className="hub-feat-play-overlay" aria-hidden>
                      <Play size={28} fill="currentColor" strokeWidth={0} />
                    </div>
                    {currentSong?.id === song.id && (
                      <span className="hub-featured-playing" aria-hidden>▶</span>
                    )}
                  </div>
                  <p className="hub-featured-title">{song.title}</p>
                  <p className="hub-featured-artist">{song.artist}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════ RECENTLY PLAYED ════════════ */}
      {!hasQuery && recents.length > 0 && (
        <div className="hub-section-block">
          <div className="hub-section-hdr">
            <span className="hub-section-label">Recently Played</span>
          </div>

          {recents.slice(0, 8).map((song, i) => {
            const isCurrent = currentSong?.id === song.id
            return (
              <article
                key={song.id}
                className={`hub-recent-row ${isCurrent ? 'is-current' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => playFromList(recents, i)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' && e.key !== ' ') return
                  e.preventDefault()
                  playFromList(recents, i)
                }}
              >
                <span className="hub-recent-num">
                  {isCurrent && isPlaying ? '▶' : i + 1}
                </span>
                <SongImage song={song} className="hub-recent-art" alt={song.title} />
                <div className="hub-recent-meta">
                  <h3>{song.title}</h3>
                  <p>{song.artist}</p>
                </div>
                <button
                  type="button"
                  className="song-queue-btn"
                  aria-label="More options"
                  onClick={(e) => { e.stopPropagation(); setMenuSong(song) }}
                >
                  <MoreHorizontal size={16} />
                </button>
              </article>
            )
          })}
        </div>
      )}

      {/* ═══════════════════════════ SEARCH RESULTS ══════════════ */}
      {hasQuery && (
        <div className="hub-results">
          {error && (
            <div className="placeholder-item">{error}</div>
          )}
          {!isLoading && !error && results.length === 0 && (
            <div className="placeholder-item">No results for "{query}"</div>
          )}

          {results.map((song, index) => (
            <article
              key={song.id}
              className={`song-row glass ${currentSong?.id === song.id ? 'is-current' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => playFromList(results, index)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return
                e.preventDefault()
                playFromList(results, index)
              }}
            >
              <SongImage song={song} alt={song.title} className="song-thumb" />
              <div className="song-meta">
                <h3>{song.title}</h3>
                <p>{song.artist}</p>
              </div>
              <div className="song-row-actions">
                <button
                  type="button"
                  className="song-queue-btn"
                  aria-label="More options"
                  onClick={(e) => { e.stopPropagation(); setMenuSong(song) }}
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ─── Song actions bottom sheet ─────────────────────────── */}
      {menuSong && (
        <SongActionsMenu song={menuSong} onClose={() => setMenuSong(null)} />
      )}

    </div>
  )
}
