import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Copy, Play, Share2, Trash2, X } from 'lucide-react'
import { useLibrary }    from '../context/useLibrary'
import { usePlayer }     from '../context/usePlayer'
import { SongImage }     from '../components/shared/SongImage'
import { PlaylistCover } from '../components/shared/PlaylistCover'
import { PageTopBar }    from '../components/layout/PageTopBar'
import { buildShareUrl } from '../utils/playlistShare'
import { setLastLibraryPath } from '../utils/libraryHistory'

export function PlaylistDetailPage() {
  const { id } = useParams()
  const { playlists, removeSongFromPlaylist, deletePlaylist } = useLibrary()
  const { playFromList } = usePlayer()
  const navigate = useNavigate()
  const [shareOpen, setShareOpen] = useState(false)
  const [copied, setCopied]       = useState(false)

  const playlist = playlists.find((p) => p.id === id)

  // Save this playlist page as the last library location
  useEffect(() => {
    if (playlist) setLastLibraryPath(`/playlist/${id}`)
  }, [id, playlist])

  if (!playlist) {
    return (
      <section className="glass page-card">
        <h1 className="page-title">Playlist not found</h1>
        <p className="page-subtitle">It may have been deleted.</p>
      </section>
    )
  }

  const handleDelete = () => {
    deletePlaylist(id)
    navigate('/library')
  }

  const shareUrl = playlist ? buildShareUrl(playlist) : ''

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <section className="library-view">
      <PageTopBar title="Playlist" />

      <header className="playlist-detail-header-wrap">
        <div className="playlist-detail-header">
          <button
            type="button"
            className="np-icon-btn"
            onClick={() => navigate('/library')}
            aria-label="Back to library"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="playlist-detail-cover">
            <PlaylistCover songs={playlist.songs} />
          </div>
          <div className="playlist-detail-meta">
            <h1 className="page-title">{playlist.name}</h1>
            <p className="page-subtitle">
              {playlist.songs.length} song{playlist.songs.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="playlist-detail-actions">
            {playlist.songs.length > 0 && (
              <button
                type="button"
                className="song-play-btn"
                onClick={() => playFromList(playlist.songs, 0)}
                aria-label="Play all"
              >
                <Play size={16} />
              </button>
            )}
            <button
              type="button"
              className="queue-action-btn"
              onClick={() => setShareOpen(true)}
              aria-label="Share playlist"
            >
              <Share2 size={14} />
            </button>
            <button
              type="button"
              className="queue-action-btn danger"
              onClick={handleDelete}
              aria-label="Delete playlist"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </header>

      <div className="page-section">
        {playlist.songs.length === 0 && (
          <div className="placeholder-item">No songs yet. Add songs from Search.</div>
        )}
        {playlist.songs.map((song, index) => (
          <article className="song-row glass" key={song.id}>
            <SongImage song={song} alt={song.title} className="song-thumb" />
            <div className="song-meta">
              <h3>{song.title}</h3>
              <p>{song.artist}</p>
            </div>
            <div className="song-row-actions">
              <button
                type="button"
                className="song-play-btn"
                onClick={() => playFromList(playlist.songs, index)}
                aria-label={`Play ${song.title}`}
              >
                <Play size={16} />
              </button>
              <button
                type="button"
                className="queue-action-btn danger"
                onClick={() => removeSongFromPlaylist(id, song.id)}
                aria-label={`Remove ${song.title}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </article>
        ))}
      </div>
      {shareOpen && (
        <div className="share-backdrop" onClick={() => setShareOpen(false)}>
          <div className="share-modal glass" onClick={(e) => e.stopPropagation()}>
            <div className="share-modal-header">
              <h2 className="share-modal-title">Share Playlist</h2>
              <button type="button" className="np-icon-btn" onClick={() => setShareOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <p className="share-modal-hint">
              Send this link to a friend. When they open it, Frost will offer to import the playlist.
            </p>
            <div className="share-url-row">
              <input
                className="share-url-input"
                readOnly
                value={shareUrl}
                onFocus={(e) => e.target.select()}
              />
              <button type="button" className={`share-copy-btn${copied ? ' is-copied' : ''}`} onClick={handleCopy}>
                {copied ? <Check size={15} /> : <Copy size={15} />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
