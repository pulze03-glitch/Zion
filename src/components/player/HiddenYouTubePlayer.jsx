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
    currentSong,
    isPlaying,
    nextTrack,
    prevTrack,
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

  // Keep a stable ref so MediaSession handlers never go stale
  const msRef = useRef({ nextTrack, prevTrack, play, pause })
  useEffect(() => {
    msRef.current = { nextTrack, prevTrack, play, pause }
  }, [nextTrack, prevTrack, play, pause])

  // Update lock-screen / notification metadata when the song changes
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentSong) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title:  currentSong.title  ?? '',
      artist: currentSong.artist ?? '',
      artwork: currentSong.thumbnail
        ? [{ src: currentSong.thumbnail, sizes: '256x256', type: 'image/jpeg' }]
        : [],
    })
  }, [currentSong])

  // Sync playback state so the OS knows whether we're playing or paused
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
  }, [isPlaying])

  // Register lock-screen transport controls once the player is ready
  useEffect(() => {
    if (!isBootstrapped || !('mediaSession' in navigator)) return
    navigator.mediaSession.setActionHandler('play',          () => msRef.current.play?.())
    navigator.mediaSession.setActionHandler('pause',         () => msRef.current.pause?.())
    navigator.mediaSession.setActionHandler('nexttrack',     () => msRef.current.nextTrack?.())
    navigator.mediaSession.setActionHandler('previoustrack', () => msRef.current.prevTrack?.())
    return () => {
      for (const action of ['play', 'pause', 'nexttrack', 'previoustrack']) {
        try { navigator.mediaSession.setActionHandler(action, null) } catch (_) {}
      }
    }
  }, [isBootstrapped])

  return (
    <div className="youtube-container" aria-hidden="true">
      <div ref={containerRef} />
    </div>
  )
}
