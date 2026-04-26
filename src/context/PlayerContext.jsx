import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react'
import { PlayerContext, generateShuffleOrder } from './playerStore'
import { searchSongs } from '../services/youtube'

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function loadResumeState() {
  try {
    const saved = localStorage.getItem('player-resume')
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

const resume = loadResumeState()

const initialState = {
  currentSong: resume?.queue?.[resume?.queueIndex] ?? null,
  queue: resume?.queue ?? [],
  queueIndex: resume?.queueIndex ?? -1,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 80,
  isPlayerReady: false,
  error: '',
  shuffle: false,
  shuffleOrder: [],
  shufflePointer: 0,
  repeat: 'off',
}

function reorderList(list, fromIndex, toIndex) {
  const nextList = [...list]
  const [item] = nextList.splice(fromIndex, 1)
  nextList.splice(toIndex, 0, item)
  return nextList
}

function getPlaybackErrorMessage(code) {
  switch (code) {
    case 2:
      return 'This track could not be loaded because YouTube rejected the request.'
    case 5:
      return 'This track is unavailable in the current player. Skipping to the next song.'
    case 100:
      return 'This track is no longer available on YouTube. Skipping to the next song.'
    case 101:
    case 150:
      return 'This track cannot play inside the embedded player. Skipping to the next song.'
    default:
      return 'Playback failed for this track.'
  }
}

function buildFallbackQuery(song) {
  return [song?.artist, song?.title].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

function playerReducer(state, action) {
  switch (action.type) {
    case 'SET_QUEUE_AND_INDEX': {
      const { queue, queueIndex, shuffleOrder, shufflePointer } = action.payload
      return {
        ...state,
        queue,
        queueIndex,
        currentSong: queue[queueIndex] ?? null,
        currentTime: 0,
        duration: 0,
        error: '',
        shuffleOrder: shuffleOrder ?? state.shuffleOrder,
        shufflePointer: shufflePointer ?? state.shufflePointer,
      }
    }

    case 'SET_CURRENT_INDEX': {
      const queueIndex = action.payload.queueIndex
      const nextSong = state.queue[queueIndex] ?? null
      return {
        ...state,
        queueIndex,
        currentSong: nextSong,
        currentTime: 0,
        duration: 0,
        error: '',
        shufflePointer:
          action.payload.shufflePointer !== undefined
            ? action.payload.shufflePointer
            : state.shufflePointer,
      }
    }

    case 'REPLACE_QUEUE_SONG': {
      const { queueIndex, song } = action.payload
      if (queueIndex < 0 || queueIndex >= state.queue.length) return state

      const nextQueue = [...state.queue]
      nextQueue[queueIndex] = song

      return {
        ...state,
        queue: nextQueue,
        currentSong: state.queueIndex === queueIndex ? song : state.currentSong,
        currentTime: state.queueIndex === queueIndex ? 0 : state.currentTime,
        duration: state.queueIndex === queueIndex ? 0 : state.duration,
        error: '',
      }
    }

    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload }

    case 'SET_TIME':
      return { ...state, currentTime: action.payload }

    case 'SET_DURATION':
      return { ...state, duration: action.payload }

    case 'SET_VOLUME':
      return { ...state, volume: action.payload }

    case 'SET_READY':
      return { ...state, isPlayerReady: action.payload }

    case 'SET_ERROR':
      return { ...state, error: action.payload }

    case 'SET_SHUFFLE': {
      const { enabled, order, pointer } = action.payload
      return {
        ...state,
        shuffle: enabled,
        shuffleOrder: order,
        shufflePointer: pointer,
      }
    }

    case 'SET_REPEAT':
      return { ...state, repeat: action.payload }

    case 'PLAY_NEXT': {
      const song = { ...action.payload, _queuedManually: true }
      const insertAt = state.queueIndex === -1 ? 0 : state.queueIndex + 1
      const nextQueue = [
        ...state.queue.slice(0, insertAt),
        song,
        ...state.queue.slice(insertAt),
      ]
      if (state.queueIndex === -1) {
        return { ...state, queue: nextQueue, queueIndex: 0, currentSong: nextQueue[0] }
      }
      return { ...state, queue: nextQueue }
    }

    case 'ADD_TO_QUEUE': {
      const song = { ...action.payload, _queuedManually: true }
      // Append after all existing manual songs (so manual queue stays grouped)
      let insertAt = state.queueIndex === -1 ? 0 : state.queueIndex + 1
      while (insertAt < state.queue.length && state.queue[insertAt]?._queuedManually) insertAt++
      const nextQueue = [
        ...state.queue.slice(0, insertAt),
        song,
        ...state.queue.slice(insertAt),
      ]
      if (state.queueIndex === -1) {
        return { ...state, queue: nextQueue, queueIndex: 0, currentSong: nextQueue[0] }
      }
      return { ...state, queue: nextQueue }
    }

    case 'REMOVE_FROM_QUEUE': {
      const removeIndex = action.payload
      if (removeIndex < 0 || removeIndex >= state.queue.length) return state

      const nextQueue = state.queue.filter((_, index) => index !== removeIndex)
      const nextQueueIndex =
        nextQueue.length === 0
          ? -1
          : removeIndex < state.queueIndex
            ? state.queueIndex - 1
            : state.queueIndex >= nextQueue.length
              ? nextQueue.length - 1
              : state.queueIndex

      const nextCurrentSong = nextQueue[nextQueueIndex] ?? null

      const adjustedOrder = state.shuffleOrder
        .filter((index) => index !== removeIndex)
        .map((index) => (index > removeIndex ? index - 1 : index))

      const nextPointer = Math.max(0, adjustedOrder.indexOf(nextQueueIndex))

      return {
        ...state,
        queue: nextQueue,
        queueIndex: nextQueueIndex,
        currentSong: nextCurrentSong,
        isPlaying: nextQueueIndex === -1 ? false : state.isPlaying,
        shuffleOrder: adjustedOrder,
        shufflePointer: nextPointer,
      }
    }

    case 'REORDER_QUEUE': {
      const { fromIndex, toIndex } = action.payload
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= state.queue.length ||
        toIndex >= state.queue.length ||
        fromIndex === toIndex
      ) {
        return state
      }

      const nextQueue = reorderList(state.queue, fromIndex, toIndex)
      let nextQueueIndex = state.queueIndex

      if (state.queueIndex === fromIndex) {
        nextQueueIndex = toIndex
      } else if (fromIndex < state.queueIndex && toIndex >= state.queueIndex) {
        nextQueueIndex -= 1
      } else if (fromIndex > state.queueIndex && toIndex <= state.queueIndex) {
        nextQueueIndex += 1
      }

      const nextCurrentSong = nextQueue[nextQueueIndex] ?? null
      const nextOrder =
        state.shuffle && nextQueue.length
          ? generateShuffleOrder(nextQueue.length, nextQueueIndex)
          : state.shuffleOrder

      return {
        ...state,
        queue: nextQueue,
        queueIndex: nextQueueIndex,
        currentSong: nextCurrentSong,
        shuffleOrder: nextOrder,
        shufflePointer: 0,
      }
    }

    default:
      return state
  }
}

export function PlayerProvider({ children }) {
  const [state, dispatch] = useReducer(playerReducer, initialState)
  const playerApiRef = useRef(null)
  // false when queue was restored from localStorage but no video loaded into YT player yet
  const isVideoLoadedRef = useRef(resume === null)
  const pendingAutoplayRef = useRef(false)

  const queueRef = useRef(state.queue)
  const queueIndexRef = useRef(state.queueIndex)
  const currentTimeRef = useRef(state.currentTime)
  const shuffleEnabledRef = useRef(state.shuffle)
  const shuffleOrderRef = useRef(state.shuffleOrder)
  const shufflePointerRef = useRef(state.shufflePointer)
  const repeatRef = useRef(state.repeat)
  const retryCountRef = useRef(0)
  const retryTimeoutRef = useRef(null)
  const fallbackAbortRef = useRef(null)
  const fallbackAttemptKeyRef = useRef('')

  useEffect(() => {
    queueRef.current = state.queue
    queueIndexRef.current = state.queueIndex
    currentTimeRef.current = state.currentTime
    shuffleEnabledRef.current = state.shuffle
    shuffleOrderRef.current = state.shuffleOrder
    shufflePointerRef.current = state.shufflePointer
    repeatRef.current = state.repeat
  }, [state])

  useEffect(() => {
    if (state.queue.length > 0) {
      localStorage.setItem(
        'player-resume',
        JSON.stringify({ queue: state.queue, queueIndex: state.queueIndex }),
      )
    }
  }, [state.queue, state.queueIndex])

  useEffect(() => () => {
    clearTimeout(retryTimeoutRef.current)
    fallbackAbortRef.current?.abort()
  }, [])

  const resetRecoveryState = useCallback(() => {
    clearTimeout(retryTimeoutRef.current)
    retryTimeoutRef.current = null
    retryCountRef.current = 0
    fallbackAttemptKeyRef.current = ''
    fallbackAbortRef.current?.abort()
    fallbackAbortRef.current = null
  }, [])

  const setPlayerApi = useCallback(
    (api) => {
      playerApiRef.current = api
      dispatch({ type: 'SET_READY', payload: true })
      api.setVolume(state.volume)

      const queuedSong = queueRef.current[queueIndexRef.current]
      if (pendingAutoplayRef.current && queuedSong?.id) {
        pendingAutoplayRef.current = false
        isVideoLoadedRef.current = true
        resetRecoveryState()
        api.loadVideo(queuedSong.id)
      }
    },
    [resetRecoveryState, state.volume],
  )

  const playFromQueueIndex = useCallback((index, options = {}) => {
    const queue = queueRef.current
    if (!queue[index]) return

    resetRecoveryState()
    queueIndexRef.current = index
    currentTimeRef.current = 0
    if (options.shufflePointer !== undefined) {
      shufflePointerRef.current = options.shufflePointer
    }

    dispatch({
      type: 'SET_CURRENT_INDEX',
      payload: {
        queueIndex: index,
        shufflePointer: options.shufflePointer,
      },
    })

    const nextSong = queue[index]
    if (playerApiRef.current) {
      pendingAutoplayRef.current = false
      isVideoLoadedRef.current = true
      playerApiRef.current.loadVideo(nextSong.id)
      return
    }

    pendingAutoplayRef.current = true
    isVideoLoadedRef.current = false
  }, [resetRecoveryState])

  const playFromList = useCallback((songs, startIndex = 0) => {
    if (!songs?.length) return

    const queue = songs.filter((song) => Boolean(song?.id))
    if (!queue.length) return

    resetRecoveryState()
    const queueIndex = clamp(startIndex, 0, queue.length - 1)

    const shuffleEnabled = shuffleEnabledRef.current
    const shuffleOrder = shuffleEnabled
      ? generateShuffleOrder(queue.length, queueIndex)
      : []

    queueRef.current = queue
    queueIndexRef.current = queueIndex
    currentTimeRef.current = 0
    shuffleOrderRef.current = shuffleOrder
    shufflePointerRef.current = 0

    dispatch({
      type: 'SET_QUEUE_AND_INDEX',
      payload: {
        queue,
        queueIndex,
        shuffleOrder,
        shufflePointer: 0,
      },
    })

    const nextSong = queue[queueIndex]
    if (playerApiRef.current) {
      pendingAutoplayRef.current = false
      isVideoLoadedRef.current = true
      playerApiRef.current.loadVideo(nextSong.id)
      return
    }

    pendingAutoplayRef.current = true
    isVideoLoadedRef.current = false
  }, [resetRecoveryState])

  const playSong = useCallback((song) => {
    if (!song?.id) return
    playFromList([song], 0)
  }, [playFromList])

  const togglePlayPause = useCallback(() => {
    if (!queueRef.current.length) return
    if (state.isPlaying) {
      playerApiRef.current?.pause()
      return
    }
    // First play after restoring from saved session — load the video (auto-plays)
    if (!isVideoLoadedRef.current) {
      const song = queueRef.current[queueIndexRef.current]
      if (song && playerApiRef.current) {
        isVideoLoadedRef.current = true
        resetRecoveryState()
        playerApiRef.current.loadVideo(song.id)
      }
      // If API not ready yet, pendingAutoplayRef will handle it once ready
      return
    }
    playerApiRef.current?.play()
  }, [resetRecoveryState, state.isPlaying])

  const nextTrack = useCallback(() => {
    const queue = queueRef.current
    if (!queue.length) return

    const repeatMode = repeatRef.current
    if (repeatMode === 'one') {
      playFromQueueIndex(queueIndexRef.current, {
        shufflePointer: shufflePointerRef.current,
      })
      return
    }

    // Manually queued songs always play first, before shuffle kicks in
    const nextIdx = queueIndexRef.current + 1
    if (nextIdx < queue.length && queue[nextIdx]?._queuedManually) {
      playFromQueueIndex(nextIdx)
      return
    }

    if (shuffleEnabledRef.current) {
      let order = shuffleOrderRef.current
      let pointer = shufflePointerRef.current

      if (!order.length || !order.includes(queueIndexRef.current)) {
        order = generateShuffleOrder(queue.length, queueIndexRef.current)
        pointer = 0
        dispatch({
          type: 'SET_SHUFFLE',
          payload: { enabled: true, order, pointer },
        })
      }

      let nextPointer = pointer + 1
      if (nextPointer >= order.length) {
        if (repeatMode === 'all') {
          nextPointer = 0
        } else {
          dispatch({ type: 'SET_PLAYING', payload: false })
          return
        }
      }

      playFromQueueIndex(order[nextPointer], { shufflePointer: nextPointer })
      return
    }

    let nextIndex = queueIndexRef.current + 1
    if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0
      } else {
        dispatch({ type: 'SET_PLAYING', payload: false })
        return
      }
    }

    playFromQueueIndex(nextIndex)
  }, [playFromQueueIndex])

  const prevTrack = useCallback(() => {
    const queue = queueRef.current
    if (!queue.length) return

    if (currentTimeRef.current > 3) {
      playerApiRef.current?.seekTo(0)
      return
    }

    if (shuffleEnabledRef.current) {
      const order = shuffleOrderRef.current
      let prevPointer = shufflePointerRef.current - 1

      if (prevPointer < 0) {
        if (repeatRef.current === 'all') {
          prevPointer = Math.max(0, order.length - 1)
        } else {
          return
        }
      }

      playFromQueueIndex(order[prevPointer], { shufflePointer: prevPointer })
      return
    }

    let prevIndex = queueIndexRef.current - 1
    if (prevIndex < 0) {
      if (repeatRef.current === 'all') {
        prevIndex = queue.length - 1
      } else {
        return
      }
    }

    playFromQueueIndex(prevIndex)
  }, [playFromQueueIndex])

  const seekTo = useCallback((seconds) => {
    if (!Number.isFinite(seconds)) return
    dispatch({ type: 'SET_TIME', payload: seconds })
    playerApiRef.current?.seekTo(seconds)
  }, [])

  const setVolume = useCallback((volumeValue) => {
    const nextVolume = clamp(Math.round(volumeValue), 0, 100)
    dispatch({ type: 'SET_VOLUME', payload: nextVolume })
    playerApiRef.current?.setVolume(nextVolume)
  }, [])

  const toggleShuffle = useCallback(() => {
    const queue = queueRef.current
    if (!queue.length) return

    if (shuffleEnabledRef.current) {
      dispatch({
        type: 'SET_SHUFFLE',
        payload: { enabled: false, order: [], pointer: 0 },
      })
      return
    }

    const order = generateShuffleOrder(queue.length, queueIndexRef.current)
    dispatch({
      type: 'SET_SHUFFLE',
      payload: { enabled: true, order, pointer: 0 },
    })
  }, [])

  const cycleRepeat = useCallback(() => {
    const sequence = ['off', 'all', 'one']
    const nextIndex = (sequence.indexOf(repeatRef.current) + 1) % sequence.length
    dispatch({ type: 'SET_REPEAT', payload: sequence[nextIndex] })
  }, [])

  const playNext = useCallback((song) => {
    if (!song?.id) return
    dispatch({ type: 'PLAY_NEXT', payload: song })
  }, [])

  const addToQueue = useCallback((song) => {
    if (!song?.id) return
    dispatch({ type: 'ADD_TO_QUEUE', payload: song })
  }, [])

  const removeFromQueue = useCallback((index) => {
    dispatch({ type: 'REMOVE_FROM_QUEUE', payload: index })
  }, [])

  const reorderQueue = useCallback((fromIndex, toIndex) => {
    dispatch({ type: 'REORDER_QUEUE', payload: { fromIndex, toIndex } })
  }, [])

  const playQueueIndex = useCallback((index) => {
    if (shuffleEnabledRef.current) {
      const pointer = Math.max(0, shuffleOrderRef.current.indexOf(index))
      playFromQueueIndex(index, { shufflePointer: pointer })
      return
    }

    playFromQueueIndex(index)
  }, [playFromQueueIndex])

  const onPlayerReady = useCallback(() => {
    dispatch({ type: 'SET_READY', payload: true })
  }, [])

  const onPlaying = useCallback(() => {
    dispatch({ type: 'SET_PLAYING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: '' })
  }, [])

  const onPaused = useCallback(() => {
    dispatch({ type: 'SET_PLAYING', payload: false })
  }, [])

  const onEnded = useCallback(() => {
    nextTrack()
  }, [nextTrack])

  const onTimeUpdate = useCallback((seconds) => {
    dispatch({ type: 'SET_TIME', payload: seconds })
  }, [])

  const onDurationUpdate = useCallback((seconds) => {
    dispatch({ type: 'SET_DURATION', payload: seconds })
  }, [])

  const replaceQueueSong = useCallback((queueIndex, song) => {
    const currentSong = queueRef.current[queueIndex]
    if (!currentSong) return null

    const nextSong = {
      ...currentSong,
      ...song,
      _queuedManually: currentSong._queuedManually,
    }
    const nextQueue = [...queueRef.current]
    nextQueue[queueIndex] = nextSong
    queueRef.current = nextQueue

    dispatch({
      type: 'REPLACE_QUEUE_SONG',
      payload: { queueIndex, song: nextSong },
    })

    return nextSong
  }, [])

  const tryResolveBrokenSong = useCallback(async (song) => {
    const queueIndex = queueIndexRef.current
    const currentSong = queueRef.current[queueIndex]
    if (!song?.id || currentSong?.id !== song.id) return true

    const attemptKey = `${queueIndex}:${song.id}`
    if (fallbackAttemptKeyRef.current === attemptKey) return false
    fallbackAttemptKeyRef.current = attemptKey

    fallbackAbortRef.current?.abort()
    const controller = new AbortController()
    fallbackAbortRef.current = controller

    try {
      const query = buildFallbackQuery(song)
      if (query.length < 2) return false

      const matches = await searchSongs(query, { limit: 10, signal: controller.signal })

      if (queueRef.current[queueIndexRef.current]?.id !== song.id) {
        return true
      }

      const replacement = matches.find((candidate) => candidate?.id && candidate.id !== song.id)
      if (!replacement) return false

      const nextSong = replaceQueueSong(queueIndexRef.current, replacement)
      if (!nextSong) return true

      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
      retryCountRef.current = 0
      playerApiRef.current?.loadVideo(nextSong.id)
      return true
    } catch (error) {
      if (error.name === 'AbortError') {
        return queueRef.current[queueIndexRef.current]?.id !== song.id
      }
      return false
    } finally {
      if (fallbackAbortRef.current === controller) {
        fallbackAbortRef.current = null
      }
    }
  }, [replaceQueueSong])

  const onPlayerError = useCallback(
    (event) => {
      const code = event?.data
      const song = queueRef.current[queueIndexRef.current]

      const skipToNext = () => {
        retryCountRef.current = 0
        const q = queueRef.current
        if (queueIndexRef.current < q.length - 1) {
          nextTrack()
        } else {
          const message = code ? getPlaybackErrorMessage(code) : 'Playback failed.'
          dispatch({ type: 'SET_ERROR', payload: message })
          dispatch({ type: 'SET_PLAYING', payload: false })
        }
      }

      const recoverOrSkip = () => {
        void tryResolveBrokenSong(song).then((resolved) => {
          if (!resolved) skipToNext()
        })
      }

      // 100/101/150 = definitively unavailable or embed-blocked — no point retrying
      if (code === 100 || code === 101 || code === 150) {
        recoverOrSkip()
        return
      }

      // For all other codes (incl. 5 = spurious mobile HTML5 error): retry up to 5×
      // with progressive delays. If still failing after retries, skip directly —
      // do NOT call recoverOrSkip/tryResolveBrokenSong here because that fires a
      // /api/search call for every broken song, burns through the rate-limit quota,
      // and when that itself fails the song skips anyway. Reserve fallback search
      // only for definitively-broken videos (100/101/150 above).
      const maxRetries = 5
      if (retryCountRef.current < maxRetries && song?.id && playerApiRef.current) {
        const attempt = retryCountRef.current
        retryCountRef.current += 1
        const delay = attempt < 2 ? 1200 : attempt < 4 ? 2000 : 3000
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = setTimeout(() => {
          if (queueRef.current[queueIndexRef.current]?.id !== song.id) return
          playerApiRef.current?.loadVideo(song.id)
        }, delay)
        return
      }

      skipToNext()
    },
    [nextTrack, tryResolveBrokenSong],
  )

  const value = useMemo(
    () => ({
      ...state,
      playSong,
      playFromList,
      playQueueIndex,
      togglePlayPause,
      nextTrack,
      prevTrack,
      seekTo,
      setVolume,
      setPlayerApi,
      toggleShuffle,
      cycleRepeat,
      playNext,
      addToQueue,
      removeFromQueue,
      reorderQueue,
      onPlayerReady,
      onPlaying,
      onPaused,
      onEnded,
      onTimeUpdate,
      onDurationUpdate,
      onPlayerError,
    }),
    [
      state,
      playSong,
      playFromList,
      playQueueIndex,
      togglePlayPause,
      nextTrack,
      prevTrack,
      seekTo,
      setVolume,
      setPlayerApi,
      toggleShuffle,
      cycleRepeat,
      playNext,
      addToQueue,
      removeFromQueue,
      reorderQueue,
      onPlayerReady,
      onPlaying,
      onPaused,
      onEnded,
      onTimeUpdate,
      onDurationUpdate,
      onPlayerError,
    ],
  )

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}
