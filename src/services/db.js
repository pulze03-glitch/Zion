const DB_NAME = 'liena-music'
const DB_VERSION = 2

let dbPromise = null

function getDb() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('favorites')) {
        db.createObjectStore('favorites', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('playlists')) {
        db.createObjectStore('playlists', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('recents')) {
        db.createObjectStore('recents', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('wallpaper')) {
        db.createObjectStore('wallpaper', { keyPath: 'key' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      dbPromise = null
      reject(request.error)
    }
  })
  return dbPromise
}

async function tx(storeName, mode, callback) {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode)
    const store = transaction.objectStore(storeName)
    const request = callback(store)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export const favoritesDb = {
  getAll: () => tx('favorites', 'readonly', (s) => s.getAll()),
  put: (song) => tx('favorites', 'readwrite', (s) => s.put(song)),
  remove: (id) => tx('favorites', 'readwrite', (s) => s.delete(id)),
}

export const playlistsDb = {
  getAll: () => tx('playlists', 'readonly', (s) => s.getAll()),
  get: (id) => tx('playlists', 'readonly', (s) => s.get(id)),
  put: (playlist) => tx('playlists', 'readwrite', (s) => s.put(playlist)),
  remove: (id) => tx('playlists', 'readwrite', (s) => s.delete(id)),
}

export const recentsDb = {
  getAll: () => tx('recents', 'readonly', (s) => s.getAll()),
  put: (song) => tx('recents', 'readwrite', (s) => s.put(song)),
}

export const wallpaperDb = {
  get: () => tx('wallpaper', 'readonly', (s) => s.get('current')),
  put: (blob) => tx('wallpaper', 'readwrite', (s) => s.put({ key: 'current', blob })),
  remove: () => tx('wallpaper', 'readwrite', (s) => s.delete('current')),
}
