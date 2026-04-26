/**
 * useArtworkColor
 *
 * Extracts the dominant HSL color from the song's YouTube thumbnail.
 *
 * WHY FETCH + BLOB instead of img.crossOrigin:
 *   The browser's image cache stores responses from <img> without CORS headers.
 *   A later crossOrigin='anonymous' request hits the same cache entry — which lacks
 *   CORS headers — and the canvas is immediately tainted.
 *   fetch() has its own separate cache, so it makes a fresh CORS request and
 *   i.ytimg.com (the YouTube API thumbnail CDN) DOES serve Access-Control-Allow-Origin: *.
 *   We then create a blob URL (always same-origin) so getImageData() works cleanly.
 */
import { useEffect, useRef, useState } from 'react'

/** Convert r,g,b ∈ [0,1] to { h°, s, l } ∈ [0–360, 0–1, 0–1]. */
function rgbToHsl(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const delta = max - min
  const l = (max + min) / 2
  if (delta === 0) return { h: 0, s: 0, l }
  const s = delta / (1 - Math.abs(2 * l - 1))
  let h
  if (max === r)      h = ((g - b) / delta) % 6
  else if (max === g) h = (b - r) / delta + 2
  else                h = (r - g) / delta + 4
  return { h: ((h * 60) + 360) % 360, s, l }
}

/**
 * Sample a 64×64 downscale of the image.
 * Returns the dominant { h, s, l } — the hue bucket with most weighted votes.
 * Skips near-black, near-white, and near-grey pixels (low saturation).
 */
function extractDominantColor(imageData) {
  const { data } = imageData
  // 36 buckets × 10° each
  const buckets = Array.from({ length: 36 }, () => ({ weight: 0, s: 0, l: 0 }))

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255
    const { h, s, l } = rgbToHsl(r, g, b)

    // Skip near-black, near-white, and unsaturated (grey) pixels
    if (l < 0.08 || l > 0.93 || s < 0.12) continue

    // Weight: prefer vivid mid-lightness colours
    const weight = s * (1 - Math.abs(l - 0.5) * 1.6)
    if (weight <= 0) continue

    const b_ = Math.floor(h / 10) // bucket index
    buckets[b_].weight += weight
    buckets[b_].s += s * weight
    buckets[b_].l += l * weight
  }

  // Find the heaviest bucket
  let best = null
  for (let i = 0; i < buckets.length; i++) {
    if (!best || buckets[i].weight > best.weight) best = { i, ...buckets[i] }
  }
  if (!best || best.weight === 0) return null

  return {
    h: best.i * 10 + 5,
    s: Math.min(1, (best.s / best.weight) * 1.15), // slight saturation boost
    l: best.l / best.weight,
  }
}

/** Draw image to an offscreen 64×64 canvas and extract dominant colour. */
function extractFromBlobUrl(blobUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        const c = document.createElement('canvas')
        c.width = c.height = 64
        const ctx = c.getContext('2d')
        ctx.drawImage(img, 0, 0, 64, 64)
        resolve(extractDominantColor(ctx.getImageData(0, 0, 64, 64)))
      } catch (e) { reject(e) }
      finally { URL.revokeObjectURL(blobUrl) }
    }
    img.onerror = reject
    img.src = blobUrl
  })
}

/**
 * Try fetching the thumbnail as a CORS blob.
 * Prefers i.ytimg.com (API thumbnail) over img.youtube.com (maxres) since
 * i.ytimg.com reliably serves Access-Control-Allow-Origin: *.
 */
async function fetchColor(song) {
  // Prefer the i.ytimg.com URL served by the YouTube API
  const urls = [song?.thumbnail, song?.thumbnailMax].filter(Boolean)

  for (const url of urls) {
    try {
      const res = await fetch(url, { mode: 'cors', credentials: 'omit' })
      if (!res.ok) continue
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const color = await extractFromBlobUrl(blobUrl)
      if (color) return color
    } catch {
      // Try next URL
    }
  }
  return null
}

/**
 * Returns { h, s, l } dominant colour of the current song's thumbnail, or null.
 * Re-extracts whenever the song ID changes.
 */
export function useArtworkColor(song) {
  const [color, setColor] = useState(null)
  const prevId = useRef(null)

  useEffect(() => {
    if (!song?.id) { setColor(null); prevId.current = null; return }
    if (song.id === prevId.current) return
    prevId.current = song.id
    setColor(null) // clear while loading

    let cancelled = false
    fetchColor(song).then((c) => {
      if (!cancelled) setColor(c)
    })
    return () => { cancelled = true }
  }, [song])

  return color
}
