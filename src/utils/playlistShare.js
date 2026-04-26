/**
 * Playlist share/import via URL.
 * Encodes a playlist (name + songs) as a base64 URL parameter.
 * No backend required — the whole playlist travels in the link.
 */

export function encodePlaylist(playlist) {
  const payload = {
    name: playlist.name,
    songs: playlist.songs.map((s) => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      thumbnail: s.thumbnail ?? '',
    })),
  }
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
}

export function decodePlaylist(encoded) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(encoded))))
  } catch {
    return null
  }
}

export function buildShareUrl(playlist) {
  const base = `${window.location.origin}${window.location.pathname}`
  return `${base}?pl=${encodePlaylist(playlist)}`
}

export function readShareParam() {
  return new URLSearchParams(window.location.search).get('pl')
}
