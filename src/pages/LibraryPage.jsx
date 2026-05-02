import { useEffect, useState } from 'react'
import { Download, Link, Loader2, MoreHorizontal, Music, Play, Plus, Search, Sparkles, Trash2, X } from 'lucide-react'
import { useToast } from '../hooks/useToast'
import { useNavigate }   from 'react-router-dom'
import { useLibrary }    from '../context/useLibrary'
import { usePlayer }     from '../context/usePlayer'
import { useSettings }   from '../context/useSettings'
import { SongImage }       from '../components/shared/SongImage'
import { PlaylistCover }   from '../components/shared/PlaylistCover'
import { SongActionsMenu } from '../components/shared/SongActionsMenu'
import { generatePlaylistName } from '../services/anthropic'
import { importYouTubePlaylist, importSpotifyPlaylist } from '../services/youtube'
import { PageTopBar } from '../components/layout/PageTopBar'
import { decodePlaylist } from '../utils/playlistShare'
import { getLastLibraryTab, setLastLibraryPath, setLastLibraryTab } from '../utils/libraryHistory'

const TABS = ['favorites', 'playlists', 'recents']

export function LibraryPage() {
  const [activeTab,        setActiveTab]        = useState(() => getLastLibraryTab())
  const [newName,          setNewName]          = useState('')
  const [filterQuery,      setFilterQuery]      = useState('')
  const [aiLoading,        setAiLoading]        = useState(false)
  const [aiError,          setAiError]          = useState('')
  const [menuSong,         setMenuSong]         = useState(null)
  const [importOpen,       setImportOpen]       = useState(false)   // 'youtube' | 'spotify' | false
  const [importUrl,        setImportUrl]        = useState('')
  const [importLoading,    setImportLoading]    = useState(false)
  const [importError,      setImportError]      = useState('')
  const [importSuccess,    setImportSuccess]    = useState('')
  const [shareLink,        setShareLink]        = useState('')
  const [shareLinkError,   setShareLinkError]   = useState('')

  const {
    favorites, playlists, recents,
    removeFavorite, createPlaylist, createPlaylistWithSongs, deletePlaylist, addFavorite,
  } = useLibrary()
  const { playFromList, currentSong, isPlaying } = usePlayer()
  const { aiApiKey, openSettings } = useSettings()
  const showToast                = useToast()
  const navigate                 = useNavigate()

  // Persist library location so nav restores correctly
  useEffect(() => {
    setLastLibraryPath('/library')
  }, [])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setLastLibraryTab(tab)
  }

  // ── filtered lists ───────────────────────────────────────
  const q                 = filterQuery.toLowerCase()
  const filteredFavs      = q ? favorites.filter((s) => `${s.title} ${s.artist}`.toLowerCase().includes(q)) : favorites
  const filteredPlaylists = q ? playlists.filter((p) => p.name.toLowerCase().includes(q)) : playlists
  const filteredRecents   = q ? recents.filter((s) => `${s.title} ${s.artist}`.toLowerCase().includes(q)) : recents

  // ── create playlist ──────────────────────────────────────
  const handleCreate = () => {
    if (!newName.trim()) return
    createPlaylist(newName)
    setNewName('')
  }

  // ── AI DJ ────────────────────────────────────────────────
  const handleAiName = async () => {
    if (!aiApiKey) { openSettings(); return }
    setAiLoading(true)
    setAiError('')
    try {
      const name = await generatePlaylistName(favorites.slice(0, 8), aiApiKey)
      setNewName(name)
    } catch (err) {
      setAiError(err.message || 'AI failed. Check your Anthropic key in Settings.')
    } finally {
      setAiLoading(false)
    }
  }

  // ── Playlist import (YouTube or Spotify) ─────────────────
  const openImport = (type) => {
    setImportOpen(type)
    setImportUrl('')
    setImportError('')
    setImportSuccess('')
  }

  const handleImport = async () => {
    if (!importUrl.trim()) return
    setImportLoading(true)
    setImportError('')
    setImportSuccess('')
    try {
      const fn = importOpen === 'spotify' ? importSpotifyPlaylist : importYouTubePlaylist
      const { title, songs } = await fn(importUrl)
      await createPlaylistWithSongs(title, songs)
      setImportSuccess(`Imported "${title}" — ${songs.length} songs added.`)
      setImportUrl('')
      setActiveTab('playlists')
    } catch (err) {
      setImportError(err.message || 'Import failed.')
    } finally {
      setImportLoading(false)
    }
  }

  // ── import shared playlist link ─────────────────────────
  const handleShareLinkImport = async () => {
    setShareLinkError('')
    const trimmed = shareLink.trim()
    if (!trimmed) return
    try {
      const encoded = new URL(trimmed).searchParams.get('pl')
      if (!encoded) throw new Error('No playlist data found in this link.')
      const decoded = decodePlaylist(encoded)
      if (!decoded?.name || !Array.isArray(decoded.songs)) throw new Error('Invalid playlist link.')
      const pl = await createPlaylistWithSongs(decoded.name, decoded.songs)
      setShareLink('')
      setActiveTab('playlists')
      navigate(`/playlist/${pl.id}`)
    } catch (err) {
      setShareLinkError(err.message || 'Could not import this link.')
    }
  }

  return (
    <section className="library-view">

      <PageTopBar title="Library" />

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="lib-header">
        <h1 className="lib-page-title">Library</h1>
        <div className="lib-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`lib-tab ${activeTab === tab ? 'is-active' : ''}`}
              onClick={() => handleTabChange(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        <div className="lib-filter-row">
          <Search size={15} className="lib-filter-icon" />
          <input
            type="search"
            className="lib-filter-input"
            placeholder={`Filter ${activeTab}…`}
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            aria-label={`Filter ${activeTab}`}
          />
          {filterQuery && (
            <button
              type="button"
              className="np-icon-btn lib-filter-clear"
              onClick={() => setFilterQuery('')}
              aria-label="Clear filter"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </header>

      <div className="page-section">

        {/* ══════════════════════════════ FAVOURITES ═══════ */}
        {activeTab === 'favorites' && (
          <>
            {filteredFavs.length === 0 && (
              <div className="placeholder-item">
                {filterQuery
                  ? `No favourites match "${filterQuery}".`
                  : 'No favourites yet. Heart a song to save it.'}
              </div>
            )}
            {filteredFavs.map((song, index) => {
              const isCurrent = currentSong?.id === song.id
              return (
                <article
                  className={`song-row glass${isCurrent ? ' is-current' : ''}`}
                  key={song.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => playFromList(filteredFavs, index)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playFromList(filteredFavs, index) } }}
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
                      aria-label="More options"
                      onClick={(e) => { e.stopPropagation(); setMenuSong(song) }}
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    <button
                      type="button"
                      className="song-play-btn"
                      onClick={(e) => { e.stopPropagation(); playFromList(filteredFavs, index) }}
                      aria-label={`Play ${song.title}`}
                    >
                      <Play size={16} />
                    </button>
                  </div>
                </article>
              )
            })}

            {filteredFavs.length > 1 && (
              <div className="lib-play-all-row">
                <button
                  type="button"
                  className="lib-play-all-btn"
                  onClick={() => playFromList(filteredFavs, 0)}
                >
                  <Play size={15} fill="currentColor" /> Play All ({filteredFavs.length})
                </button>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════ PLAYLISTS ════════ */}
        {activeTab === 'playlists' && (
          <>
            <div className="new-playlist-form glass">
              <div className="new-playlist-input-row">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Playlist name…"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
                <button
                  type="button"
                  className="ai-dj-btn"
                  onClick={handleAiName}
                  disabled={aiLoading}
                  title={aiApiKey ? 'AI DJ: generate a name from your favourites' : 'Add Anthropic API key in ⚙ Settings'}
                  aria-label="Generate playlist name with AI"
                >
                  {aiLoading
                    ? <Loader2 size={15} className="hub-spin" />
                    : <Sparkles size={15} />}
                </button>
                <button
                  type="button"
                  className="song-play-btn"
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  aria-label="Create playlist"
                >
                  <Plus size={18} />
                </button>
              </div>
              {aiError && <p className="ai-error-msg">{aiError}</p>}

              {/* Import buttons */}
              <div className="import-btn-group">
                <p className="import-btn-label">Import playlist from</p>
                <div className="import-btn-row">
                  <button
                    type="button"
                    className="import-source-btn"
                    onClick={() => openImport('youtube')}
                  >
                    <Download size={14} />
                    YouTube
                  </button>
                  <button
                    type="button"
                    className="import-source-btn import-source-btn--spotify"
                    onClick={() => openImport('spotify')}
                  >
                    <Music size={14} />
                    Spotify
                  </button>
                </div>
              </div>

              {/* Import from share link */}
              <div className="share-link-import-row">
                <Link size={14} className="share-link-import-icon" />
                <input
                  type="url"
                  className="share-link-import-input"
                  placeholder="Paste a shared playlist link…"
                  value={shareLink}
                  onChange={(e) => { setShareLink(e.target.value); setShareLinkError('') }}
                  onKeyDown={(e) => e.key === 'Enter' && handleShareLinkImport()}
                />
                <button
                  type="button"
                  className="share-link-import-btn"
                  onClick={handleShareLinkImport}
                  disabled={!shareLink.trim()}
                >
                  Import
                </button>
              </div>
              {shareLinkError && <p className="share-link-error">{shareLinkError}</p>}
            </div>

            {/* ── Import modal (YouTube or Spotify) ─────────── */}
            {importOpen && (
              <div className="import-modal-overlay" onClick={() => setImportOpen(false)}>
                <div className="import-modal glass" onClick={(e) => e.stopPropagation()}>
                  <div className="import-modal-header">
                    <h2>
                      {importOpen === 'spotify' ? 'Import Spotify Playlist' : 'Import YouTube Playlist'}
                    </h2>
                    <button type="button" className="np-icon-btn" onClick={() => setImportOpen(false)}>
                      <X size={18} />
                    </button>
                  </div>
                  <p className="import-modal-hint">
                    {importOpen === 'spotify'
                      ? 'Paste a public Spotify playlist link. Tracks are matched to YouTube automatically.'
                      : 'Paste a YouTube playlist URL and it will import automatically.'}
                  </p>
                  <input
                    type="url"
                    className="search-input import-url-input"
                    placeholder={importOpen === 'spotify'
                      ? 'https://open.spotify.com/playlist/…'
                      : 'https://www.youtube.com/playlist?list=…'}
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleImport()}
                    autoFocus
                  />
                  {importError && <p className="import-modal-error">{importError}</p>}
                  {importSuccess && <p className="import-modal-success">{importSuccess}</p>}
                  <div className="import-modal-actions">
                    <button type="button" className="hub-api-error-btn" onClick={() => setImportOpen(false)}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className={`song-play-btn import-confirm-btn${importOpen === 'spotify' ? ' import-confirm-btn--spotify' : ''}`}
                      onClick={handleImport}
                      disabled={importLoading || !importUrl.trim()}
                    >
                      {importLoading
                        ? <><Loader2 size={15} className="hub-spin" /> Importing…</>
                        : <><Download size={15} /> Import</>}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {filteredPlaylists.length === 0 && (
              <div className="placeholder-item">
                {filterQuery
                  ? `No playlists match "${filterQuery}".`
                  : 'No playlists yet. Create one above.'}
              </div>
            )}
            {filteredPlaylists.map((playlist) => (
              <article
                key={playlist.id}
                className="song-row glass playlist-row"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/playlist/${playlist.id}`)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/playlist/${playlist.id}`)}
              >
                <div className="playlist-row-art">
                  <PlaylistCover songs={playlist.songs} />
                </div>
                <div className="song-meta">
                  <h3>{playlist.name}</h3>
                  <p>{playlist.songs.length} song{playlist.songs.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="song-row-actions">
                  {playlist.songs.length > 0 && (
                    <button
                      type="button"
                      className="song-play-btn"
                      onClick={(e) => { e.stopPropagation(); playFromList(playlist.songs, 0) }}
                      aria-label={`Play ${playlist.name}`}
                    >
                      <Play size={16} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="queue-action-btn danger"
                    onClick={(e) => { e.stopPropagation(); deletePlaylist(playlist.id) }}
                    aria-label={`Delete ${playlist.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            ))}
          </>
        )}

        {/* ══════════════════════════════ RECENTS ══════════ */}
        {activeTab === 'recents' && (
          <>
            {filteredRecents.length === 0 && (
              <div className="placeholder-item">
                {filterQuery
                  ? `No recents match "${filterQuery}".`
                  : 'No recently played songs.'}
              </div>
            )}
            {filteredRecents.map((song, index) => {
              const isCurrent = currentSong?.id === song.id
              return (
                <article
                  className={`song-row glass${isCurrent ? ' is-current' : ''}`}
                  key={`${song.id}-${song.playedAt ?? index}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => playFromList(filteredRecents, index)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playFromList(filteredRecents, index) } }}
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
                      aria-label="More options"
                      onClick={(e) => { e.stopPropagation(); setMenuSong(song) }}
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    <button
                      type="button"
                      className="song-play-btn"
                      onClick={(e) => { e.stopPropagation(); playFromList(filteredRecents, index) }}
                      aria-label={`Play ${song.title}`}
                    >
                      <Play size={16} />
                    </button>
                  </div>
                </article>
              )
            })}
            {filteredRecents.length > 1 && (
              <div className="lib-play-all-row">
                <button
                  type="button"
                  className="lib-play-all-btn"
                  onClick={() => playFromList(filteredRecents, 0)}
                >
                  <Play size={15} fill="currentColor" /> Play All
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Song actions bottom sheet ─────────────────────────── */}
      {menuSong && (
        <SongActionsMenu song={menuSong} onClose={() => setMenuSong(null)} />
      )}

    </section>
  )
}
