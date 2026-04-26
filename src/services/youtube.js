/**
 * All YouTube API calls go through the secure backend (/api/*).
 * No API key is needed or stored in the frontend.
 */

function getRegionCode() {
  const locale = navigator.language?.split('-')?.[1]
  return locale && locale.length === 2 ? locale.toUpperCase() : 'US'
}

async function apiFetch(url, options = {}) {
  if (!navigator.onLine) {
    throw new Error('You are offline. Reconnect to search songs.')
  }
  let res
  try {
    res = await fetch(url, options)
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new Error('Network error. Unable to reach the server.')
  }
  const text = await res.text()
  if (!text.trim()) throw new Error('Server returned an empty response.')
  let data
  try { data = JSON.parse(text) } catch { throw new Error('Invalid response from server.') }
  if (!res.ok) throw new Error(data?.error || 'Request failed.')
  return data
}

export async function searchSongs(query, options = {}) {
  const { limit = 25, signal, region = getRegionCode() } = options
  const q = query.trim()
  if (!q) return []
  return apiFetch(
    `/api/search?q=${encodeURIComponent(q)}&limit=${limit}&region=${region}`,
    { signal },
  )
}

export async function getFeaturedSongs(signal) {
  const region = getRegionCode()
  return apiFetch(`/api/featured?region=${region}`, { signal })
}

export async function importYouTubePlaylist(url, signal) {
  return apiFetch('/api/playlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, region: getRegionCode() }),
    signal,
  })
}
