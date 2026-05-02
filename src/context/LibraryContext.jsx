import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { favoritesDb, playlistsDb, recentsDb } from '../services/db'
import { LibraryContext } from './libraryStore'
import { useAuth } from './useAuth'

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
        recents: [action.payload, ...state.recents.filter((s) => s.id !== action.payload.id)].slice(0, 50),
      }

    default:
      return state
  }
}

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

export function LibraryProvider({ children }) {
  const { user, token } = useAuth()
  const [state, dispatch] = useReducer(reducer, initialState)

  // Reload whenever auth state changes (login / logout)
  useEffect(() => {
    const load = async () => {
      const [favorites, localPlaylists, recents] = await Promise.all([
        favoritesDb.getAll(), playlistsDb.getAll(), recentsDb.getAll(),
      ])

      let playlists = localPlaylists

      if (user && token) {
        try {
          const res = await fetch('/api/playlists', { headers: authHeaders(token) })
          if (res.ok) {
            const serverPlaylists = await res.json()
            const serverIds = new Set(serverPlaylists.map(p => p.id))

            // Migrate any local playlists that aren't on the server yet
            for (const pl of localPlaylists) {
              if (!serverIds.has(pl.id)) {
                fetch('/api/playlists', {
                  method: 'POST',
                  headers: authHeaders(token),
                  body: JSON.stringify(pl),
                }).catch(() => {})
              }
            }

            // Server is source of truth + append any local-only ones
            playlists = [
              ...serverPlaylists,
              ...localPlaylists.filter(p => !serverIds.has(p.id)),
            ]
          }
        } catch {
          // Network failure — keep local playlists as fallback
        }
      }

      dispatch({
        type: 'LOADED',
        payload: {
          favorites: favorites.sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0)),
          playlists: playlists.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)),
          recents: recents.sort((a, b) => (b.playedAt ?? 0) - (a.playedAt ?? 0)).slice(0, 50),
        },
      })
    }
    load().catch(console.error)
  }, [user, token])

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
    const playlist = { id: crypto.randomUUID(), name: name.trim(), songs: [], createdAt: Date.now() }
    if (user && token) {
      fetch('/api/playlists', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(playlist) }).catch(console.error)
    } else {
      await playlistsDb.put(playlist)
    }
    dispatch({ type: 'ADD_PLAYLIST', payload: playlist })
    return playlist
  }, [user, token])

  const createPlaylistWithSongs = useCallback(async (name, songs) => {
    const playlist = { id: crypto.randomUUID(), name: name.trim(), songs: songs ?? [], createdAt: Date.now() }
    if (user && token) {
      fetch('/api/playlists', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(playlist) }).catch(console.error)
    } else {
      await playlistsDb.put(playlist)
    }
    dispatch({ type: 'ADD_PLAYLIST', payload: playlist })
    return playlist
  }, [user, token])

  const deletePlaylist = useCallback((id) => {
    if (user && token) {
      fetch(`/api/playlists/${id}`, { method: 'DELETE', headers: authHeaders(token) }).catch(console.error)
    } else {
      playlistsDb.remove(id).catch(console.error)
    }
    dispatch({ type: 'REMOVE_PLAYLIST', payload: id })
  }, [user, token])

  const addSongToPlaylist = useCallback(async (playlistId, song) => {
    const playlist = state.playlists.find(p => p.id === playlistId)
    if (!playlist || playlist.songs.some((s) => s.id === song.id)) return
    const updated = { ...playlist, songs: [...playlist.songs, song] }
    if (user && token) {
      fetch(`/api/playlists/${playlistId}`, { method: 'PUT', headers: authHeaders(token), body: JSON.stringify({ songs: updated.songs }) }).catch(console.error)
    } else {
      await playlistsDb.put(updated)
    }
    dispatch({ type: 'UPDATE_PLAYLIST', payload: updated })
  }, [state.playlists, user, token])

  const removeSongFromPlaylist = useCallback(async (playlistId, songId) => {
    const playlist = state.playlists.find(p => p.id === playlistId)
    if (!playlist) return
    const updated = { ...playlist, songs: playlist.songs.filter((s) => s.id !== songId) }
    if (user && token) {
      fetch(`/api/playlists/${playlistId}`, { method: 'PUT', headers: authHeaders(token), body: JSON.stringify({ songs: updated.songs }) }).catch(console.error)
    } else {
      await playlistsDb.put(updated)
    }
    dispatch({ type: 'UPDATE_PLAYLIST', payload: updated })
  }, [state.playlists, user, token])

  const renamePlaylist = useCallback(async (playlistId, name) => {
    const playlist = state.playlists.find(p => p.id === playlistId)
    if (!playlist) return
    const updated = { ...playlist, name: name.trim() }
    if (user && token) {
      fetch(`/api/playlists/${playlistId}`, { method: 'PUT', headers: authHeaders(token), body: JSON.stringify({ name: updated.name }) }).catch(console.error)
    } else {
      await playlistsDb.put(updated)
    }
    dispatch({ type: 'UPDATE_PLAYLIST', payload: updated })
  }, [state.playlists, user, token])

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
