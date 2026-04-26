/**
 * detectMixes
 *
 * Analyses a user's recent plays and returns up to 5 "mix" definitions.
 * Priority:
 *   1. Artist mixes  — artists with 2+ plays get their own mix card
 *   2. Genre mixes   — keyword matching on title + artist text
 *
 * Each mix has:
 *   { id, label, sublabel, emoji, query, seeds }
 *   seeds = up to 4 songs from recents used to build the cover grid
 *   query = YouTube search string used when the mix is played
 */

const GENRE_RULES = [
  {
    id: 'hiphop', label: 'Hip-Hop Mix', emoji: '🎤',
    terms: [
      'hip hop', 'hip-hop', 'rap', 'trap', 'drill', 'freestyle', 'bars',
      'lil ', 'yeat', 'drake', 'kendrick', 'travis scott', '21 savage',
      'metro boomin', 'gunna', 'future', 'juice wrld', 'polo g', 'nba youngboy',
      'a$ap', 'asap', 'playboi', 'carti', 'uzi', 'young thug', 'offset',
    ],
  },
  {
    id: 'rnb', label: 'R&B Mix', emoji: '🎵',
    terms: [
      'r&b', 'rnb', 'soul', 'the weeknd', 'frank ocean', 'sza', 'usher',
      'beyoncé', 'beyonce', 'jhene aiko', 'daniel caesar', 'khalid',
      'h.e.r', 'giveon', 'brent faiyaz', 'summer walker',
    ],
  },
  {
    id: 'pop', label: 'Pop Mix', emoji: '🌟',
    terms: [
      'pop', 'taylor swift', 'ariana grande', 'billie eilish', 'dua lipa',
      'harry styles', 'olivia rodrigo', 'ed sheeran', 'doja cat', 'selena gomez',
      'charlie puth', 'shawn mendes', 'camila cabello', 'post malone',
    ],
  },
  {
    id: 'rock', label: 'Rock Mix', emoji: '🎸',
    terms: [
      'rock', 'metal', 'punk', 'guitar', 'metallica', 'linkin park', 'nirvana',
      'arctic monkeys', 'imagine dragons', 'queen', 'acdc', 'ac/dc',
      'foo fighters', 'green day', 'the strokes', 'radiohead', 'coldplay',
    ],
  },
  {
    id: 'edm', label: 'EDM Mix', emoji: '🎧',
    terms: [
      'edm', 'electronic', 'house', 'techno', 'dj', 'remix', 'bass',
      'dubstep', 'marshmello', 'martin garrix', 'alan walker', 'avicii',
      'calvin harris', 'tiësto', 'tiesto', 'zedd', 'skrillex', 'diplo',
    ],
  },
  {
    id: 'latin', label: 'Latin Mix', emoji: '🌴',
    terms: [
      'latin', 'reggaeton', 'bad bunny', 'j balvin', 'maluma', 'ozuna',
      'shakira', 'daddy yankee', 'karol g', 'anuel', 'rauw alejandro', 'myke towers',
    ],
  },
  {
    id: 'kpop', label: 'K-Pop Mix', emoji: '✨',
    terms: [
      'kpop', 'k-pop', 'bts', 'blackpink', 'twice', 'stray kids',
      'aespa', 'nct', 'got7', 'exo', 'txt', 'ive', 'itzy', 'enhypen',
    ],
  },
  {
    id: 'chill', label: 'Chill Mix', emoji: '🌙',
    terms: [
      'chill', 'lofi', 'lo-fi', 'acoustic', 'calm', 'relax', 'study',
      'ambient', 'sleep', 'coffee', 'rainy', 'soft', 'slow',
    ],
  },
]

export function detectMixes(recents) {
  if (!recents || recents.length === 0) return []

  const mixes = []
  const usedIds = new Set()

  // ── 1. Artist mixes ──────────────────────────────────────────────────────
  const byArtist = {}
  for (const song of recents) {
    const artist = (song.artist || '').trim()
    if (!artist || artist.toLowerCase() === 'unknown') continue
    if (!byArtist[artist]) byArtist[artist] = []
    byArtist[artist].push(song)
  }

  const topArtists = Object.entries(byArtist)
    .filter(([, songs]) => songs.length >= 2)
    .sort(([, a], [, b]) => b.length - a.length)
    .slice(0, 2)

  for (const [artist, songs] of topArtists) {
    // Deduplicate seeds by song id
    const seeds = []
    const seen = new Set()
    for (const s of songs) {
      if (!seen.has(s.id)) { seen.add(s.id); seeds.push(s) }
      if (seeds.length === 4) break
    }
    mixes.push({
      id: `artist__${artist}`,
      label: `${artist} Mix`,
      sublabel: `${songs.length} recent plays`,
      emoji: '🎵',
      query: `${artist} music`,
      seeds,
    })
    songs.forEach((s) => usedIds.add(s.id))
  }

  // ── 2. Genre mixes ───────────────────────────────────────────────────────
  for (const rule of GENRE_RULES) {
    if (mixes.length >= 5) break

    const matched = recents.filter((song) => {
      const text = `${song.title} ${song.artist}`.toLowerCase()
      return rule.terms.some((term) => text.includes(term))
    })

    if (matched.length === 0) continue

    // Prefer songs not already consumed by an artist mix
    const fresh = matched.filter((s) => !usedIds.has(s.id))
    const pool  = fresh.length > 0 ? fresh : matched

    const seeds = []
    const seen  = new Set()
    for (const s of pool) {
      if (!seen.has(s.id)) { seen.add(s.id); seeds.push(s) }
      if (seeds.length === 4) break
    }

    mixes.push({
      id: rule.id,
      label: rule.label,
      sublabel: 'Based on your history',
      emoji: rule.emoji,
      query: `best ${rule.label.replace(' Mix', '').toLowerCase()} music`,
      seeds,
    })
  }

  return mixes.slice(0, 5)
}
