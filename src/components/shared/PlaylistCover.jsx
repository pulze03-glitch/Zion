import { ListMusic } from 'lucide-react'
import { SongImage } from './SongImage'

/**
 * Shows up to 4 song thumbnails in a 2×2 mosaic.
 * Falls back to a music icon if the playlist is empty.
 */
export function PlaylistCover({ songs, className = '' }) {
  const covers = songs.slice(0, 4)

  if (covers.length === 0) {
    return (
      <div className={`playlist-cover-empty ${className}`}>
        <ListMusic size={22} />
      </div>
    )
  }

  if (covers.length === 1) {
    return (
      <SongImage
        song={covers[0]}
        alt=""
        className={`playlist-row-cover ${className}`}
      />
    )
  }

  return (
    <div className={`playlist-mosaic ${className}`}>
      {[0, 1, 2, 3].map((i) =>
        covers[i] ? (
          <SongImage key={i} song={covers[i]} alt="" className="mosaic-thumb" />
        ) : (
          <div key={i} className="mosaic-placeholder" />
        ),
      )}
    </div>
  )
}
