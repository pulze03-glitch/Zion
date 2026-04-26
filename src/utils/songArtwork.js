export function getFallbackArtwork(songId) {
  if (!songId) return 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
  return `https://img.youtube.com/vi/${songId}/hqdefault.jpg`
}

export function getSongArtwork(song) {
  if (!song) return getFallbackArtwork('')
  // Try maxresdefault (1280×720) — caller must handle placeholder fallback
  if (song.id) return `https://img.youtube.com/vi/${song.id}/maxresdefault.jpg`
  return song.thumbnail || getFallbackArtwork('')
}
