export const STATS_KEY = 'frost-stats-v1'

export function getSessions() {
  try { return JSON.parse(localStorage.getItem(STATS_KEY) || '[]') } catch { return [] }
}

export function saveSessions(sessions) {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(sessions.slice(-8000))) } catch {}
}

function mondayOf(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  return d
}

function firstOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function topItemsFixed(list, keyFn, labelFn, n = 5) {
  const totals = {}
  const labels = {}
  const metas  = {}
  for (const s of list) {
    const k = keyFn(s)
    totals[k] = (totals[k] || 0) + (s.seconds || 0)
    labels[k] = labelFn(s)
    if (!metas[k]) metas[k] = s
  }
  return Object.keys(totals)
    .sort((a, b) => totals[b] - totals[a])
    .slice(0, n)
    .map(k => ({ key: k, label: labels[k], totalSeconds: totals[k], meta: metas[k] }))
}

export function computeStats() {
  const sessions = getSessions()
  const now      = new Date()
  const weekTs   = mondayOf(now).getTime()
  const monthTs  = firstOfMonth(now).getTime()

  const weekly  = sessions.filter(s => s.ts >= weekTs)
  const monthly = sessions.filter(s => s.ts >= monthTs)

  const mins = list => Math.round(list.reduce((a, s) => a + (s.seconds || 0), 0) / 60)

  const topSongs   = list => topItemsFixed(list, s => s.songId, s => s.title, 5)
  const topArtists = list => topItemsFixed(list, s => s.artist, s => s.artist, 5)

  // Day-of-week counts for weekly
  const dayLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  const dayCounts = Array(7).fill(0)
  for (const s of weekly) {
    const d = new Date(s.ts).getDay()
    const idx = d === 0 ? 6 : d - 1
    dayCounts[idx] += s.seconds || 0
  }
  const busiestDay = dayCounts.every(v => v === 0)
    ? null
    : dayLabels[dayCounts.indexOf(Math.max(...dayCounts))]

  const monthName = now.toLocaleString('default', { month: 'long' })

  return {
    weekly: {
      minutes:    mins(weekly),
      songCount:  new Set(weekly.map(s => s.songId)).size,
      artistCount:new Set(weekly.map(s => s.artist)).size,
      topSongs:   topSongs(weekly),
      topArtists: topArtists(weekly),
      busiestDay,
      dayCounts,
      dayLabels,
    },
    monthly: {
      name:       monthName,
      minutes:    mins(monthly),
      songCount:  new Set(monthly.map(s => s.songId)).size,
      artistCount:new Set(monthly.map(s => s.artist)).size,
      topSongs:   topSongs(monthly),
      topArtists: topArtists(monthly),
    },
    allTime: {
      minutes:    mins(sessions),
      songCount:  new Set(sessions.map(s => s.songId)).size,
      artistCount:new Set(sessions.map(s => s.artist)).size,
    },
    empty: sessions.length === 0,
  }
}
