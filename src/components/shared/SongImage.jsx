import { useEffect, useState } from 'react'
import { getFallbackArtwork, getSongArtwork } from '../../utils/songArtwork'

export function SongImage({ song, className, alt = '', ...rest }) {
  const [src, setSrc] = useState(() => getSongArtwork(song))

  // Reset to maxresdefault attempt whenever the song changes
  useEffect(() => {
    setSrc(getSongArtwork(song))
  }, [song?.id]) // eslint-disable-line

  const handleLoad = (e) => {
    // YouTube returns a 120×90 gray placeholder when maxresdefault doesn't exist
    const img = e.currentTarget
    if (img.naturalWidth === 120 && img.naturalHeight === 90) {
      setSrc(getFallbackArtwork(song?.id))
    }
  }

  const handleError = () => {
    setSrc(getFallbackArtwork(song?.id))
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onLoad={handleLoad}
      onError={handleError}
      {...rest}
    />
  )
}
