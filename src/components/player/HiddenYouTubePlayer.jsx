import { useEffect, useRef } from 'react'
import { usePlayer } from '../../context/usePlayer'
import { useYouTubePlayer } from '../../hooks/useYouTubePlayer'

export function HiddenYouTubePlayer() {
  const {
    setPlayerApi,
    onPlayerReady,
    onPlaying,
    onPaused,
    onEnded,
    onTimeUpdate,
    onDurationUpdate,
    onPlayerError,
  } = usePlayer()
  const containerRef = useRef(null)

  const { isBootstrapped, loadVideo, play, pause, seekTo, setVolume } =
    useYouTubePlayer({
      containerRef,
      onReady: onPlayerReady,
      onPlaying,
      onPaused,
      onEnded,
      onTimeUpdate,
      onDurationUpdate,
      onError: onPlayerError,
    })

  useEffect(() => {
    if (!isBootstrapped) return

    setPlayerApi({
      loadVideo,
      play,
      pause,
      seekTo,
      setVolume,
    })
  }, [
    isBootstrapped,
    loadVideo,
    pause,
    play,
    seekTo,
    setVolume,
    setPlayerApi,
  ])

  return (
    <div className="youtube-container" aria-hidden="true">
      <div ref={containerRef} />
    </div>
  )
}
