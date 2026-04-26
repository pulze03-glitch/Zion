import { Check, Heart, ListEnd, ListStart, Trash2 } from 'lucide-react'
import { usePlayer }  from '../../context/usePlayer'
import { useLibrary } from '../../context/useLibrary'
import { useToast }   from '../../hooks/useToast'
import { SongImage }  from './SongImage'

export function SongActionsMenu({ song, onClose, showPlayActions = true }) {
  const { playNext, addToQueue }                                        = usePlayer()
  const { favorites, addFavorite, removeFavorite,
          playlists, addSongToPlaylist, removeSongFromPlaylist }         = useLibrary()
  const showToast = useToast()

  const isFav = favorites.some((s) => s.id === song.id)

  const handlePlayNext = () => {
    playNext(song)
    showToast('Playing next')
    onClose()
  }

  const handleAddToQueue = () => {
    addToQueue(song)
    showToast('Added to queue')
    onClose()
  }

  const handleFav = () => {
    if (isFav) {
      removeFavorite(song.id)
      showToast('Removed from Liked Songs')
    } else {
      addFavorite(song)
      showToast('Added to Liked Songs')
    }
    onClose()
  }

  const handlePlaylist = (pl) => {
    const alreadyIn = pl.songs.some((s) => s.id === song.id)
    if (alreadyIn) {
      removeSongFromPlaylist(pl.id, song.id)
      showToast(`Removed from "${pl.name}"`)
    } else {
      addSongToPlaylist(pl.id, song)
      showToast(`Added to "${pl.name}"`)
    }
  }

  return (
    <>
      <div className="song-menu-backdrop" onClick={onClose} />
      <div className="song-menu" role="dialog" aria-modal="true" aria-label="Song actions">
        <div className="song-menu-handle" />

        {/* Header */}
        <div className="song-menu-header">
          <SongImage song={song} className="song-menu-header-thumb" alt="" />
          <div>
            <p className="song-menu-header-title">{song.title}</p>
            <p className="song-menu-header-artist">{song.artist}</p>
          </div>
        </div>

        {/* Play actions */}
        {showPlayActions && (
          <>
            <button type="button" className="song-menu-action" onClick={handlePlayNext}>
              <ListStart size={18} />
              Play Next
            </button>
            <button type="button" className="song-menu-action" onClick={handleAddToQueue}>
              <ListEnd size={18} />
              Add to Queue
            </button>
            <div className="song-menu-divider" />
          </>
        )}

        {/* Favorite */}
        <button
          type="button"
          className={`song-menu-action${isFav ? ' is-danger' : ''}`}
          onClick={handleFav}
        >
          <Heart size={18} fill={isFav ? 'currentColor' : 'none'} />
          {isFav ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
        </button>

        {/* Playlists */}
        {playlists.length > 0 && (
          <>
            <div className="song-menu-divider" />
            <p className="song-menu-section-label">Save to playlist</p>
            {playlists.map((pl) => {
              const alreadyIn = pl.songs.some((s) => s.id === song.id)
              return (
                <div key={pl.id} className="song-menu-playlist-row">
                  <div>
                    <p className="song-menu-pl-name">{pl.name}</p>
                    <p className="song-menu-pl-count">{pl.songs.length} song{pl.songs.length !== 1 ? 's' : ''}</p>
                  </div>
                  <button
                    type="button"
                    className={`song-menu-pl-action${alreadyIn ? ' is-in' : ''}`}
                    onClick={() => handlePlaylist(pl)}
                  >
                    {alreadyIn ? <><Check size={11} /> Added</> : 'Add'}
                  </button>
                </div>
              )
            })}
          </>
        )}

        {/* Extra bottom space */}
        <div style={{ height: 12 }} />
      </div>
    </>
  )
}
