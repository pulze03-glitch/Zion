/**
 * WallpaperContext — single shared state for the live wallpaper.
 * Both WallpaperLayer and SettingsModal read/write through this context
 * so they always stay in sync.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { wallpaperDb } from '../services/db'

export const WallpaperContext = createContext(null)

function extractColor(videoEl) {
  return new Promise((resolve) => {
    const grab = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 64; canvas.height = 64
        const ctx = canvas.getContext('2d')
        ctx.drawImage(videoEl, 0, 0, 64, 64)
        const { data } = ctx.getImageData(0, 0, 64, 64)
        let rSum = 0, gSum = 0, bSum = 0, count = 0
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2]
          if (r + g + b < 60) continue
          rSum += r; gSum += g; bSum += b; count++
        }
        if (!count) { resolve(null); return }
        const r = Math.round(rSum / count), g = Math.round(gSum / count), b = Math.round(bSum / count)
        // rgb → hsl
        const rn = r/255, gn = g/255, bn = b/255
        const max = Math.max(rn,gn,bn), min = Math.min(rn,gn,bn), l = (max+min)/2
        const d = max - min
        const s = d === 0 ? 0 : d / (1 - Math.abs(2*l - 1))
        let h = 0
        if (d !== 0) {
          if (max === rn) h = ((gn - bn) / d) % 6
          else if (max === gn) h = (bn - rn) / d + 2
          else h = (rn - gn) / d + 4
          h = ((h * 60) + 360) % 360
        }
        resolve({ h, s, l })
      } catch { resolve(null) }
    }
    if (videoEl.readyState >= 2) { grab(); return }
    videoEl.addEventListener('loadeddata', grab, { once: true })
  })
}

export function WallpaperProvider({ children }) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [color,   setColor]   = useState(null)
  const blobRef = useRef(null)

  // Load persisted wallpaper on mount
  useEffect(() => {
    wallpaperDb.get().then((entry) => {
      if (entry?.blob) {
        const url = URL.createObjectURL(entry.blob)
        blobRef.current = url
        setBlobUrl(url)
      }
    }).catch(() => {})

    return () => { if (blobRef.current) URL.revokeObjectURL(blobRef.current) }
  }, [])

  // Write color CSS vars to <html> whenever color changes
  useEffect(() => {
    const root = document.documentElement
    if (color) {
      root.style.setProperty('--wp-h', String(Math.round(color.h)))
      root.style.setProperty('--wp-s', `${Math.round(color.s * 100)}%`)
      root.style.setProperty('--wp-l', `${Math.round(color.l * 100)}%`)
      root.setAttribute('data-wallpaper', 'true')
    } else {
      root.style.removeProperty('--wp-h')
      root.style.removeProperty('--wp-s')
      root.style.removeProperty('--wp-l')
      root.removeAttribute('data-wallpaper')
    }
  }, [color])

  const applyColor = useCallback((videoEl) => {
    extractColor(videoEl).then((c) => { if (c) setColor(c) })
  }, [])

  const setWallpaper = useCallback(async (file) => {
    if (blobRef.current) URL.revokeObjectURL(blobRef.current)
    await wallpaperDb.put(file)
    const url = URL.createObjectURL(file)
    blobRef.current = url
    setBlobUrl(url)
  }, [])

  const clearWallpaper = useCallback(async () => {
    if (blobRef.current) { URL.revokeObjectURL(blobRef.current); blobRef.current = null }
    await wallpaperDb.remove()
    setBlobUrl(null)
    setColor(null)
  }, [])

  return (
    <WallpaperContext.Provider value={{ blobUrl, color, applyColor, setWallpaper, clearWallpaper }}>
      {children}
    </WallpaperContext.Provider>
  )
}

export function useWallpaper() {
  const ctx = useContext(WallpaperContext)
  if (!ctx) throw new Error('useWallpaper must be used within WallpaperProvider')
  return ctx
}
