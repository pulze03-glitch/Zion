import { useEffect, useRef } from 'react'
import { useWallpaper } from '../../hooks/useWallpaper'

export function WallpaperLayer() {
  const { blobUrl, applyColor } = useWallpaper()
  const videoRef = useRef(null)

  // iOS Safari won't autoplay even muted videos without a prior user gesture.
  // On first tap/click anywhere, attempt to play the video.
  useEffect(() => {
    if (!blobUrl) return
    const tryPlay = () => {
      videoRef.current?.play().catch(() => {})
    }
    window.addEventListener('touchstart', tryPlay, { once: true, passive: true })
    window.addEventListener('click', tryPlay, { once: true })
    return () => {
      window.removeEventListener('touchstart', tryPlay)
      window.removeEventListener('click', tryPlay)
    }
  }, [blobUrl])

  if (!blobUrl) return null

  return (
    <div className="wallpaper-layer" aria-hidden="true">
      <video
        ref={videoRef}
        className="wallpaper-video"
        src={blobUrl}
        autoPlay
        loop
        muted
        playsInline
        disablePictureInPicture
        onLoadedData={() => {
          videoRef.current?.play().catch(() => {})
          applyColor(videoRef.current)
        }}
      />
      <div className="wallpaper-overlay" />
    </div>
  )
}
