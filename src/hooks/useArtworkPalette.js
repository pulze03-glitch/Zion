/**
 * useArtworkPalette
 *
 * Extracts 2–4 dominant, visually distinct HSL colors from a song thumbnail.
 * Uses the same CORS-fetch→blob pattern as useArtworkColor so we never taint
 * the canvas. Colors are deduplicated by hue distance so the palette contains
 * meaningfully different shades.
 */
import { useEffect, useRef, useState } from 'react'

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

function hueDist(a, b) {
  const d = Math.abs(a - b)
  return Math.min(d, 360 - d)
}

function extractPalette(imageData, count) {
  const { data } = imageData
  // 24 buckets × 15° each — finer than useArtworkColor so we can separate
  // neighboring hues into distinct palette entries
  const N = 24
  const buckets = Array.from({ length: N }, () => ({ weight: 0, h: 0, s: 0, l: 0 }))

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255
    const { h, s, l } = rgbToHsl(r, g, b)
    // Skip near-black, near-white, near-grey
    if (l < 0.05 || l > 0.94 || s < 0.08) continue
    // Weight: prefer vivid mid-lightness pixels
    const weight = s * (1 - Math.abs(l - 0.46) * 1.3)
    if (weight <= 0) continue
    const bi = Math.floor((h / 360) * N) % N
    buckets[bi].weight += weight
    buckets[bi].h      += h * weight
    buckets[bi].s      += s * weight
    buckets[bi].l      += l * weight
  }

  const sorted = buckets
    .filter((b) => b.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .map((b) => ({
      h: b.h / b.weight,
      s: Math.min(1, (b.s / b.weight) * 1.18),
      l: b.l / b.weight,
      weight: b.weight,
    }))

  // Greedy pick: each new color must be >35° away in hue from all picked colors
  const picked = []
  for (const c of sorted) {
    if (picked.length >= count) break
    if (!picked.some((p) => hueDist(p.h, c.h) < 35)) {
      picked.push(c)
    }
  }

  // If still short (monochrome art), relax hue constraint to 15°
  if (picked.length < 2) {
    for (const c of sorted) {
      if (picked.length >= count) break
      if (!picked.some((p) => hueDist(p.h, c.h) < 15)) {
        picked.push(c)
      }
    }
  }

  return picked
}

async function fetchPalette(song, count) {
  const urls = [song?.thumbnail, song?.thumbnailMax].filter(Boolean)
  for (const url of urls) {
    try {
      const res = await fetch(url, { mode: 'cors', credentials: 'omit' })
      if (!res.ok) continue
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const colors = await new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas')
            canvas.width = canvas.height = 64
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0, 64, 64)
            resolve(extractPalette(ctx.getImageData(0, 0, 64, 64), count))
          } catch (e) { reject(e) }
          finally { URL.revokeObjectURL(blobUrl) }
        }
        img.onerror = reject
        img.src = blobUrl
      })
      if (colors.length > 0) return colors
    } catch {
      // try next URL
    }
  }
  return []
}

/**
 * Returns an array of up to `count` HSL colors for the song thumbnail.
 * The array is stable (doesn't clear on song change) — it shows the previous
 * song's colors until the new ones are ready, enabling smooth CSS transitions.
 */
export function useArtworkPalette(song, count = 3) {
  const [palette, setPalette] = useState([])
  const stableRef = useRef([]) // never goes empty — keeps last good palette
  const prevIdRef = useRef(null)

  useEffect(() => {
    if (!song?.id) return
    if (song.id === prevIdRef.current) return
    prevIdRef.current = song.id

    let cancelled = false
    fetchPalette(song, count).then((colors) => {
      if (cancelled) return
      if (colors.length > 0) {
        stableRef.current = colors
        setPalette(colors)
      }
    })
    return () => { cancelled = true }
  }, [song, count])

  return palette.length > 0 ? palette : stableRef.current
}
