import { createContext } from 'react'

export const PlayerContext = createContext(null)

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export function generateShuffleOrder(length, currentIndex) {
  if (length <= 0) return []
  const indices = Array.from({ length }, (_, i) => i)
  const safeCurrentIndex = clamp(currentIndex, 0, length - 1)
  const filtered = indices.filter((index) => index !== safeCurrentIndex)

  for (let index = filtered.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[filtered[index], filtered[randomIndex]] = [filtered[randomIndex], filtered[index]]
  }

  return [safeCurrentIndex, ...filtered]
}
