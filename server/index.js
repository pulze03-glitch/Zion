/* global process */

import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import { Readable } from 'stream'

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.env') })

process.on('unhandledRejection', (reason) => {
  console.error('[error] Unhandled promise rejection:', reason)
})

process.on('uncaughtException', (err) => {
  console.error('[error] Uncaught exception:', err)
  process.exit(1)
})

const app  = express()
const PORT = process.env.PORT || 3001
const YT_KEY  = process.env.YOUTUBE_API_KEY
const YT_BASE = 'https://www.googleapis.com/youtube/v3'

if (!YT_KEY) {
  console.warn('[warn] YOUTUBE_API_KEY is not set. Routes that call YouTube will return 503 until the key is configured.')
}

/* ── Simple in-memory cache ───────────────────────────────── */
const _cache = new Map()
function cacheGet(k) {
  const e = _cache.get(k)
  if (!e) return null
  if (Date.now() > e.exp) { _cache.delete(k); return null }
  return e.v
}
function cacheSet(k, v, ms) {
  _cache.set(k, { v, exp: Date.now() + ms })
}

/* ── Middleware ───────────────────────────────────────────── */
app.use(cors())
app.use(express.json())
// Trust the first hop proxy (Render, Railway, Vercel, nginx, etc.) so that
// req.ip is the real client IP from X-Forwarded-For, not 127.0.0.1.
// Without this, every user on the deployed site shares one rate-limit bucket.
app.set('trust proxy', 1)

// Rate limit /api routes per real client IP.
// In dev, traffic comes through the Vite proxy as 127.0.0.1 — skip loopback
// so phone + desktop don't share one tiny bucket during development.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
  skip: (req) => {
    const ip = req.ip ?? ''
    return ip === '127.0.0.1' || ip === '::1' || ip.endsWith(':127.0.0.1')
  },
})
app.use('/api', limiter)

function getYouTubeErrorMessage(data) {
  const reason = data?.error?.errors?.[0]?.reason ?? ''
  const message = data?.error?.message ?? ''

  if (reason === 'quotaExceeded' || /quota/i.test(message)) {
    return 'Searches are done for now. Try again after the daily reset.'
  }

  return message || 'YouTube API error'
}

function normalizeRegion(value) {
  const region = String(value ?? '').trim().toUpperCase()
  return /^[A-Z]{2}$/.test(region) ? region : 'US'
}

function isRegionPlayable(item, region) {
  const allowed = item?.contentDetails?.regionRestriction?.allowed
  const blocked = item?.contentDetails?.regionRestriction?.blocked

  if (Array.isArray(allowed)) {
    return allowed.includes(region)
  }

  if (Array.isArray(blocked)) {
    return !blocked.includes(region)
  }

  return true
}

function isAgeRestricted(item) {
  return item?.contentDetails?.contentRating?.ytRating === 'ytAgeRestricted'
}

function isPlayableVideo(item, region, options = {}) {
  const { minDuration = 0, excludeShorts = false } = options
  const uploadStatus = item?.status?.uploadStatus
  const duration = parseDuration(item?.contentDetails?.duration)

  if (!item?.id) return false
  if (item?.status?.embeddable === false) return false
  if (item?.status?.privacyStatus === 'private') return false
  if (uploadStatus && ['deleted', 'failed', 'rejected'].includes(uploadStatus)) return false
  if (isAgeRestricted(item)) return false
  if (!isRegionPlayable(item, region)) return false
  if (duration < minDuration) return false
  if (excludeShorts && isShorts(item)) return false

  return true
}

/* ── YouTube helper ───────────────────────────────────────── */
async function ytFetch(endpoint, params) {
  if (!YT_KEY) {
    const err = new Error('YouTube API key is not configured on the server.')
    err.status = 503
    throw err
  }
  const url = new URL(`${YT_BASE}/${endpoint}`)
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') url.searchParams.set(k, String(v))
  }
  url.searchParams.set('key', YT_KEY)

  const res = await fetch(url, {
    signal: AbortSignal.timeout(12_000),
    // Send Referer so browser-restricted API keys (HTTP referrer restriction) work
    headers: { 'Referer': 'http://localhost:5173/', 'Origin': 'http://localhost:5173' },
  })
  const data = await res.json()
  if (!res.ok || data.error) {
    const msg = getYouTubeErrorMessage(data)
    const err = new Error(msg)
    err.status = res.status >= 500 ? 502 : res.status
    throw err
  }
  return data
}

function mapVideo(item) {
  const id = item?.id?.videoId ?? item?.id
  const s  = item?.snippet ?? {}
  return {
    id,
    title:        s.title ?? 'Untitled',
    artist:       s.channelTitle ?? 'Unknown',
    thumbnail:    s.thumbnails?.medium?.url ?? s.thumbnails?.default?.url ?? '',
    thumbnailMax: id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '',
  }
}

// Filter music videos: embeddable, >= 60 seconds (excludes Shorts), no #shorts in title
async function fetchMusicVideos(videoIds, region) {
  if (!videoIds.length) return []
  const data = await ytFetch('videos', {
    part: 'snippet,status,contentDetails',
    id: videoIds.join(','),
  })
  const order = new Map(videoIds.map((id, i) => [id, i]))
  return (data.items ?? [])
    .filter((item) => isPlayableVideo(item, region, { minDuration: 60, excludeShorts: true }))
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
}

// Alias used by the playlist import route (embeddability only, no duration gate)
async function filterEmbeddable(videoIds, region) {
  if (!videoIds.length) return []
  const data = await ytFetch('videos', {
    part: 'snippet,status,contentDetails',
    id: videoIds.join(','),
  })
  const order = new Map(videoIds.map((id, i) => [id, i]))
  return (data.items ?? [])
    .filter((item) => isPlayableVideo(item, region))
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
}

/* ── Routes ───────────────────────────────────────────────── */

app.get('/api/health', (_req, res) => res.json({ ok: true }))

// Search songs
app.get('/api/search', async (req, res) => {
  const q     = (req.query.q ?? '').trim()
  const limit = Math.min(50, parseInt(req.query.limit) || 20)
  const region = normalizeRegion(req.query.region)
  if (q.length < 2) return res.json([])

  const key = `search:${region}:${q.toLowerCase()}:${limit}`
  const hit = cacheGet(key)
  if (hit) return res.json(hit)

  try {
    const data = await ytFetch('search', {
      part: 'snippet', q, type: 'video',
      videoCategoryId: '10',
      videoEmbeddable: 'true',
      videoSyndicated: 'true',
      regionCode: region,
      maxResults: String(limit),
    })
    const ids  = (data.items ?? []).map(i => i?.id?.videoId).filter(Boolean)
    const vids = await fetchMusicVideos(ids, region)
    const songs = vids.map(mapVideo).filter(s => s.id)
    cacheSet(key, songs, 5 * 60_000) // 5 min
    res.json(songs)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

// Parse ISO 8601 duration string → total seconds (used to filter out Shorts)
function parseDuration(iso = '') {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return 0
  return (parseInt(m[1] || 0) * 3600) + (parseInt(m[2] || 0) * 60) + parseInt(m[3] || 0)
}

// Return true if item looks like a YouTube Short
function isShorts(item) {
  const title = (item?.snippet?.title ?? '').toLowerCase()
  return title.includes('#shorts') || title.includes(' shorts')
}

// Featured — YouTube Music trending chart only (mostPopular, music category)
app.get('/api/featured', async (req, res) => {
  const region = normalizeRegion(req.query.region)
  const key    = `featured:${region}`
  const hit    = cacheGet(key)
  if (hit) return res.json(hit)

  try {
    const data = await ytFetch('videos', {
      part: 'snippet,status,contentDetails',
      chart: 'mostPopular',
      regionCode: region,
      videoCategoryId: '10',
      maxResults: '50',
    })
    const songs = (data.items ?? [])
      .filter((item) => isPlayableVideo(item, region, { minDuration: 60, excludeShorts: true }))
      .map(mapVideo)
      .filter(s => s.id)
    cacheSet(key, songs, 15 * 60_000) // 15 min
    res.json(songs)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

// Import YouTube playlist by URL
app.post('/api/playlist', async (req, res) => {
  const url = (req.body.url ?? '').trim()
  const region = normalizeRegion(req.body.region ?? req.query.region)
  if (!url) return res.status(400).json({ error: 'url is required' })
  const match = url.match(/[?&]list=([^&\s#]+)/)
  if (!match) return res.status(400).json({ error: 'No playlist ID found in that URL.' })
  const playlistId = match[1]

  const key = `playlist:${region}:${playlistId}`
  const hit = cacheGet(key)
  if (hit) return res.json(hit)

  try {
    const meta  = await ytFetch('playlists', { part: 'snippet', id: playlistId })
    const title = meta.items?.[0]?.snippet?.title ?? 'YouTube Playlist'
    const songs = []
    let pageToken

    for (let page = 0; page < 4; page++) {
      const params = { part: 'snippet', playlistId, maxResults: '50' }
      if (pageToken) params.pageToken = pageToken
      const data = await ytFetch('playlistItems', params)
      const ids  = (data.items ?? []).map(i => i?.snippet?.resourceId?.videoId).filter(Boolean)
      if (ids.length) {
        const vids = await filterEmbeddable(ids, region)
        songs.push(...vids.map(mapVideo).filter(s => s.id))
      }
      if (!data.nextPageToken) break
      pageToken = data.nextPageToken
    }

    if (!songs.length) return res.status(404).json({ error: 'No playable songs found in this playlist.' })
    const result = { title, songs }
    cacheSet(key, result, 60 * 60_000) // 1 hr
    res.json(result)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})


/* ── Audio stream proxy (iOS native <audio> player) ──────────
   Resolution order:
     1. YouTube InnerTube ANDROID client  — no third-party SSL,
        returns pre-signed CDN URLs directly from YouTube.
     2. Piped open instances (parallel)  — fallback when InnerTube
        is blocked or returns signatureCipher-only formats.
   The route contract (GET /api/audio/:videoId → audio bytes with
   Range support) is stable regardless of which method resolves.  */

// ── InnerTube extraction ───────────────────────────────────────
const INNERTUBE_ANDROID_VERSION = '19.09.37'

function pickBestAudioUrl(formats = []) {
  // Only use formats that already have a direct unsigned URL
  const audio = formats
    .filter(f => f.url && f.mimeType?.startsWith('audio/'))
    .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))
  // Prefer M4A/AAC — required for iOS Safari (WebM/Opus unsupported)
  return (audio.find(f => f.mimeType?.includes('mp4')) ?? audio[0])?.url ?? null
}

async function resolveViaInnerTube(videoId) {
  const res = await fetch('https://www.youtube.com/youtubei/v1/player', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-YouTube-Client-Name': '3',
      'X-YouTube-Client-Version': INNERTUBE_ANDROID_VERSION,
      'User-Agent': `com.google.android.youtube/${INNERTUBE_ANDROID_VERSION} (Linux; U; Android 11) gzip`,
      'Origin': 'https://www.youtube.com',
    },
    body: JSON.stringify({
      videoId,
      context: {
        client: {
          clientName: 'ANDROID',
          clientVersion: INNERTUBE_ANDROID_VERSION,
          androidSdkVersion: 30,
          userAgent: `com.google.android.youtube/${INNERTUBE_ANDROID_VERSION} (Linux; U; Android 11) gzip`,
          hl: 'en',
        },
      },
    }),
    signal: AbortSignal.timeout(8_000),
  })

  if (!res.ok) throw new Error(`InnerTube HTTP ${res.status}`)
  const data = await res.json()

  const status = data?.playabilityStatus?.status
  if (status !== 'OK') {
    throw new Error(`Not playable: ${data?.playabilityStatus?.reason ?? status}`)
  }

  const url = pickBestAudioUrl(data?.streamingData?.adaptiveFormats)
  if (!url) throw new Error('InnerTube: no direct audio URL in response')
  return url
}

// ── Piped extraction (parallel across all instances) ──────────
const PIPED_INSTANCES = (process.env.PIPED_INSTANCES ?? '')
  .split(',').map(s => s.trim()).filter(Boolean)
  .concat([
    'https://pipedapi.kavin.rocks',
    'https://api.piped.projectsegfau.lt',
    'https://piped-api.garudalinux.org',
  ])
  .slice(0, 4)

async function resolveViaPiped(videoId) {
  // Race all instances — first successful response wins
  return Promise.any(
    PIPED_INSTANCES.map(async (base) => {
      const res = await fetch(`${base}/streams/${videoId}`, {
        signal: AbortSignal.timeout(7_000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ZionPlayer/1.0)' },
      })
      if (!res.ok) throw new Error(`${base}: HTTP ${res.status}`)
      const data = await res.json()
      const streams = (data.audioStreams ?? []).filter(s => s.url)
        .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))
      const m4a = streams.find(s =>
        s.mimeType?.includes('audio/mp4') || s.format === 'M4A' || s.codec?.includes('mp4a'),
      )
      const best = m4a ?? streams[0]
      if (!best?.url) throw new Error(`${base}: no usable stream`)
      return best.url
    }),
  )
}

// ── Unified resolver (InnerTube → Piped) ──────────────────────
async function getAudioStreamURL(videoId) {
  const cached = cacheGet(`yturl:${videoId}`)
  if (cached) return cached

  let url = null

  // ① InnerTube — direct YouTube API, no third-party SSL
  try {
    url = await resolveViaInnerTube(videoId)
    console.log('[audio] resolved via InnerTube:', videoId)
  } catch (err) {
    console.warn('[audio] InnerTube failed, trying Piped:', err.message)
  }

  // ② Piped — parallel race across instances
  if (!url) {
    try {
      url = await resolveViaPiped(videoId)
      console.log('[audio] resolved via Piped:', videoId)
    } catch (err) {
      const msg = err?.errors?.map(e => e.message).join('; ') ?? err.message
      console.error('[audio] All sources failed for', videoId, '—', msg)
      const e = new Error('Audio stream unavailable — all extraction sources failed.')
      e.status = 503
      throw e
    }
  }

  cacheSet(`yturl:${videoId}`, url, 55 * 60_000) // CDN URLs expire in ~1 h
  return url
}

app.get('/api/audio/:videoId', async (req, res) => {
  const { videoId } = req.params
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({ error: 'Invalid video ID' })
  }

  let audioUrl
  try {
    audioUrl = await getAudioStreamURL(videoId)
  } catch (err) {
    console.error('[audio] Extraction error:', err?.message)
    return res.status(err.status ?? 503).json({ error: 'Audio unavailable for this track.' })
  }

  try {
    const upHeaders = {}
    if (req.headers.range) upHeaders['Range'] = req.headers.range

    const upstream = await fetch(audioUrl, {
      headers: upHeaders,
      signal: AbortSignal.timeout(20_000),
    })

    // Expired CDN URL — bust cache so the next request re-resolves
    if (upstream.status === 403 || upstream.status === 410) {
      _cache.delete(`yturl:${videoId}`)
      return res.status(503).json({ error: 'Audio stream expired — retry the track.' })
    }

    if ((!upstream.ok && upstream.status !== 206) || !upstream.body) {
      console.error('[audio] Upstream error:', upstream.status, videoId)
      return res.status(503).json({ error: 'Audio stream unavailable.' })
    }

    res.status(upstream.status)
    res.setHeader('Accept-Ranges', 'bytes')

    const ct = upstream.headers.get('content-type')
    const cl = upstream.headers.get('content-length')
    const cr = upstream.headers.get('content-range')
    if (ct) res.setHeader('Content-Type', ct)
    if (cl) res.setHeader('Content-Length', cl)
    if (cr) res.setHeader('Content-Range', cr)

    req.on('close', () => {
      try { upstream.body.cancel() } catch (_) {}
    })

    Readable.fromWeb(upstream.body)
      .on('error', (streamErr) => {
        console.error('[audio] Stream error:', streamErr?.message)
        if (!res.headersSent) res.status(503).json({ error: 'Audio stream failed.' })
        else res.end()
      })
      .pipe(res)
  } catch (err) {
    console.error('[audio] Proxy error:', err?.message)
    if (!res.headersSent) res.status(503).json({ error: 'Audio stream failed.' })
  }
})

/* ── Serve built frontend in production ───────────────────── */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dist = path.resolve(__dirname, '..', 'dist')
const distIndex = path.join(dist, 'index.html')
const distExists = fs.existsSync(distIndex)

if (distExists) {
  app.use(express.static(dist))
  app.get('*', (_req, res) => res.sendFile(distIndex))
} else {
  console.warn('[warn] dist/index.html not found — frontend static serving is disabled. Run "npm run build" first.')
  app.get('/', (_req, res) => res.json({ ok: true, note: 'API server is running. Frontend not built.' }))
}

app.listen(PORT, () => {
  console.log(`[info] Zion API listening on port ${PORT}`)
  console.log(`[info] YouTube key: ${YT_KEY ? 'loaded' : 'MISSING — set YOUTUBE_API_KEY env var'}`)
  console.log(`[info] Frontend dist: ${distExists ? dist : 'NOT FOUND (run npm run build)'}`)
})
