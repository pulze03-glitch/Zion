import { useRef, useState } from 'react'
import { Clock, MoreHorizontal, Play, Search, X } from 'lucide-react'
import { usePlayer }            from '../context/usePlayer'
import { useSearch }            from '../hooks/useSearch'
import { useSearchSuggestions } from '../hooks/useSearchSuggestions'
import { useSearchHistory }     from '../hooks/useSearchHistory'
import { SongImage }            from '../components/shared/SongImage'
import { SongActionsMenu }      from '../components/shared/SongActionsMenu'
import { PageTopBar }           from '../components/layout/PageTopBar'

export function SearchPage() {
  const { query, setQuery, activeQuery, results, isLoading, error, submitSearch, canSearch } =
    useSearch({ autoSearch: true, resultLimit: 50 })
  const { playFromList, currentSong } = usePlayer()
  const [menuSong,           setMenuSong]           = useState(null)
  const [inputFocused,       setInputFocused]       = useState(false)
  const [suggestionsVisible, setSuggestionsVisible] = useState(false)
  const { history, addEntry, removeEntry, clearAll } = useSearchHistory()
  const inputRef = useRef(null)

  const suggestions   = useSearchSuggestions(suggestionsVisible && query.length >= 2 ? query : '')
  const hasSuggestions = suggestionsVisible && suggestions.length > 0 && query.length >= 2
  const showHistory    = inputFocused && !hasSuggestions && query.trim().length < 2 && history.length > 0
  const hasResults     = results.length > 0
  const isIdle         = !isLoading && !error && !activeQuery && query.trim().length < 2

  const runSearch = (text) => {
    const q = text.trim()
    if (!q) return
    setQuery(q)
    setSuggestionsVisible(false)
    inputRef.current?.blur()
    void submitSearch(q).then(() => addEntry(q))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!canSearch) return
    setSuggestionsVisible(false)
    inputRef.current?.blur()
    void submitSearch().then(() => addEntry(query))
  }

  const handleClear = () => {
    setQuery('')
    setSuggestionsVisible(false)
    inputRef.current?.focus()
  }

  return (
    <section className="search-view">
      <PageTopBar title="Search" />

      {/* ── Hero search bar ─────────────────────────────────── */}
      <div className="srch-hero">
        <h1 className="srch-title">Search</h1>

        <form className="srch-form" onSubmit={handleSubmit}>
          <div className="srch-field-wrap">
            <Search size={17} className="srch-field-icon" aria-hidden />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSuggestionsVisible(true) }}
              onFocus={() => { setInputFocused(true); setSuggestionsVisible(true) }}
              onBlur={() => setTimeout(() => { setInputFocused(false); setSuggestionsVisible(false) }, 150)}
              placeholder="Songs, artists, moods…"
              className="srch-field-input"
              autoComplete="off"
              aria-label="Search songs"
            />
            {query && (
              <button
                type="button"
                className="srch-clear-btn"
                onClick={handleClear}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}

            {/* Suggestions dropdown */}
            {hasSuggestions && (
              <ul className="srch-dropdown" role="listbox" aria-label="Suggestions">
                {suggestions.map((s) => (
                  <li key={s} role="option">
                    <button
                      type="button"
                      className="srch-dropdown-item"
                      onMouseDown={(e) => { e.preventDefault(); runSearch(s) }}
                    >
                      <Search size={13} className="srch-dropdown-icon" />
                      <span>{s}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* History dropdown */}
            {showHistory && (
              <div className="srch-dropdown" role="listbox" aria-label="Recent searches">
                <div className="srch-dropdown-header">
                  <span>Recent searches</span>
                  <button
                    type="button"
                    className="srch-history-clear-all"
                    onMouseDown={(e) => { e.preventDefault(); clearAll() }}
                  >
                    Clear all
                  </button>
                </div>
                {history.map((h) => (
                  <div key={h} className="srch-dropdown-item srch-history-item">
                    <button
                      type="button"
                      className="srch-history-run"
                      onMouseDown={(e) => { e.preventDefault(); runSearch(h) }}
                    >
                      <Clock size={13} className="srch-dropdown-icon" />
                      <span>{h}</span>
                    </button>
                    <button
                      type="button"
                      className="srch-history-remove"
                      onMouseDown={(e) => { e.preventDefault(); removeEntry(h) }}
                      aria-label={`Remove "${h}" from history`}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            className={`srch-submit-btn${!canSearch || isLoading ? ' is-disabled' : ''}`}
            disabled={!canSearch || isLoading}
          >
            Search
          </button>
        </form>
      </div>

      {/* ── Body ────────────────────────────────────────────── */}
      <div className="srch-body">

        {isLoading && (
          <div className="srch-state">
            <div className="srch-spinner" aria-hidden />
            <p>Searching…</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="srch-state srch-state--error">
            <p>{error}</p>
          </div>
        )}

        {!isLoading && !error && activeQuery && results.length === 0 && (
          <div className="srch-state">
            <Search size={36} strokeWidth={1.2} style={{ opacity: 0.2 }} />
            <p>No results for <strong>"{activeQuery}"</strong></p>
            <span className="srch-state-hint">Try a different keyword or artist name.</span>
          </div>
        )}

        {isIdle && !showHistory && (
          <div className="srch-state">
            <Search size={36} strokeWidth={1.2} style={{ opacity: 0.15 }} />
            <p className="srch-state-lead">Find your next song</p>
            <span className="srch-state-hint">Type at least 2 characters to search YouTube.</span>
          </div>
        )}

        {hasResults && !isLoading && (
          <div className="srch-results-bar">
            <span className="srch-results-count">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </span>
            <button
              type="button"
              className="srch-play-all-btn"
              onClick={() => playFromList(results, 0)}
            >
              <Play size={13} fill="currentColor" strokeWidth={0} />
              Play all
            </button>
          </div>
        )}

        {hasResults && results.map((song, index) => {
          const isCurrent = currentSong?.id === song.id
          return (
            <article
              key={song.id}
              className={`song-row glass${isCurrent ? ' is-current' : ''}`}
              role="button"
              tabIndex={0}
              onClick={(e) => { if (!e.target.closest('button')) playFromList(results, index) }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return
                e.preventDefault()
                playFromList(results, index)
              }}
            >
              <SongImage song={song} alt={song.title} className="song-thumb" />
              <div className="song-meta">
                <h3 className={isCurrent ? 'is-playing-text' : ''}>{song.title}</h3>
                <p>{song.artist}</p>
              </div>
              <div className="song-row-actions">
                <button
                  type="button"
                  className="song-queue-btn"
                  onClick={(e) => { e.stopPropagation(); setMenuSong(song) }}
                  aria-label={`More options for ${song.title}`}
                >
                  <MoreHorizontal size={16} />
                </button>
                <button
                  type="button"
                  className="song-play-btn"
                  onClick={(e) => { e.stopPropagation(); playFromList(results, index) }}
                  aria-label={`Play ${song.title}`}
                >
                  <Play size={16} />
                </button>
              </div>
            </article>
          )
        })}
      </div>

      {menuSong && (
        <SongActionsMenu song={menuSong} onClose={() => setMenuSong(null)} />
      )}
    </section>
  )
}
