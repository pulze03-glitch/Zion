import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { favoritesDb, playlistsDb, recentsDb } from '../services/db'
import { LibraryContext } from './libraryStore'

const initialState = {
  favorites: [],
  playlists: [],
  recents: [],
  isLoaded: false,
}

function reducer(state, action) {
  switch (action.type) {
    case 'LOADED':
      return { ...action.payload, isLoaded: true }

    case 'ADD_FAVORITE':
      return {
        ...state,
        favorites: [action.payload, ...state.favorites.filter((s) => s.id !== action.payload.id)],
      }

    case 'REMOVE_FAVORITE':
      return { ...state, favorites: state.favorites.filter((s) => s.id !== action.payload) }

    case 'ADD_PLAYLIST':
      return { ...state, playlists: [...state.playlists, action.payload] }

    case 'REMOVE_PLAYLIST':
      return { ...state, playlists: state.playlists.filter((p) => p.id !== action.payload) }

    case 'UPDATE_PLAYLIST':
      return {
        ...state,
        playlists: state.playlists.map((p) => (p.id === action.payload.id ? action.payload : p)),
      }

    case 'ADD_RECENT':
      return {
        ...state,
        recents: [action.payload, ...state.recents.filter((s) => s.id !== action.payload.id)].slice(
          0,
          50,
        ),
      }

    default:
      return state
  }
}

export function LibraryProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    Promise.all([favoritesDb.getAll(), playlistsDb.getAll(), recentsDb.getAll()])
      .then(([favorites, playlists, recents]) => {
        dispatch({
          type: 'LOADED',
          payload: {
            favorites: favorites.sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0)),
            playlists: playlists.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)),
            recents: recents.sort((a, b) => (b.playedAt ?? 0) - (a.playedAt ?? 0)).slice(0, 50),
          },
        })
      })
      .catch(console.error)
  }, [])

  const addFavorite = useCallback((song) => {
    const entry = { ...song, addedAt: Date.now() }
    favoritesDb.put(entry).catch(console.error)
    dispatch({ type: 'ADD_FAVORITE', payload: entry })
  }, [])

  const removeFavorite = useCallback((id) => {
    favoritesDb.remove(id).catch(console.error)
    dispatch({ type: 'REMOVE_FAVORITE', payload: id })
  }, [])

  const createPlaylist = useCallback(async (name) => {
    const playlist = {
      id: crypto.randomUUID(),
      name: name.trim(),
      songs: [],
      createdAt: Date.now(),
    }
    await playlistsDb.put(playlist)
    dispatch({ type: 'ADD_PLAYLIST', payload: playlist })
    return playlist
  }, [])

  const createPlaylistWithSongs = useCallback(async (name, songs) => {
    const playlist = {
      id: crypto.randomUUID(),
      name: name.trim(),
      songs: songs ?? [],
      createdAt: Date.now(),
    }
    await playlistsDb.put(playlist)
    dispatch({ type: 'ADD_PLAYLIST', payload: playlist })
    return playlist
  }, [])

  const deletePlaylist = useCallback((id) => {
    playlistsDb.remove(id).catch(console.error)
    dispatch({ type: 'REMOVE_PLAYLIST', payload: id })
  }, [])

  const addSongToPlaylist = useCallback(async (playlistId, song) => {
    const playlist = await playlistsDb.get(playlistId)
    if (!playlist || playlist.songs.some((s) => s.id === song.id)) return
    const updated = { ...playlist, songs: [...playlist.songs, song] }
    await playlistsDb.put(updated)
    dispatch({ type: 'UPDATE_PLAYLIST', payload: updated })
  }, [])

  const removeSongFromPlaylist = useCallback(async (playlistId, songId) => {
    const playlist = await playlistsDb.get(playlistId)
    if (!playlist) return
    const updated = { ...playlist, songs: playlist.songs.filter((s) => s.id !== songId) }
    await playlistsDb.put(updated)
    dispatch({ type: 'UPDATE_PLAYLIST', payload: updated })
  }, [])

  const renamePlaylist = useCallback(async (playlistId, name) => {
    const playlist = await playlistsDb.get(playlistId)
    if (!playlist) return
    const updated = { ...playlist, name: name.trim() }
    await playlistsDb.put(updated)
    dispatch({ type: 'UPDATE_PLAYLIST', payload: updated })
  }, [])

  const addRecent = useCallback((song) => {
    if (!song?.id) return
    const entry = { ...song, playedAt: Date.now() }
    recentsDb.put(entry).catch(console.error)
    dispatch({ type: 'ADD_RECENT', payload: entry })
  }, [])

  const value = useMemo(
    () => ({
      ...state,
      addFavorite,
      removeFavorite,
      createPlaylist,
      createPlaylistWithSongs,
      deletePlaylist,
      addSongToPlaylist,
      removeSongFromPlaylist,
      renamePlaylist,
      addRecent,
    }),
    [
      state,
      addFavorite,
      removeFavorite,
      createPlaylist,
      createPlaylistWithSongs,
      deletePlaylist,
      addSongToPlaylist,
      removeSongFromPlaylist,
      renamePlaylist,
      addRecent,
    ],
  )

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}
