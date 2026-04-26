/**
 * GramophoneVisualizer
 *
 * WHY WE SIMULATE:
 * YouTube IFrame is cross-origin — createMediaElementSource() throws SecurityError.
 * We use a multi-oscillator signal model (bass/mid/treble) with per-bar smoothing.
 *
 * KEY GEOMETRY (S = half-stage in CSS px, stage is square):
 *   art width = 52% of stage = 1.04S  →  art radius = 0.52S
 *   innerR = 0.54S  (just outside the art circle, small gap)
 *   maxH   = 0.32S  (bars: 0.54S → 0.86S from centre)
 *   canvas is 2S wide, centre at S  →  furthest bar point = S + 0.86S = 1.86S < 2S ✓
 */
import { useEffect, useRef } from 'react'

const NUM_BARS  = 120
const SMOOTH    = 0.70
const BEAT_INT  = 0.50   // ~120 BPM
const NUM_RINGS = 4
const COLOR_SPD = 20     // °/sec — full rainbow every ~18 s

function simBars(prev, t) {
  return prev.map((v, i) => {
    const p      = i / NUM_BARS
    const bass   = Math.pow((Math.sin(t * 1.3 + p * Math.PI * 2) * 0.5 + 0.5), 1.6)
    const mid    = (Math.sin(t * 3.2 + p * Math.PI * 4 + 1.8) * 0.5 + 0.5) * 0.70
    const treble = Math.random() * 0.25
    const bassW  = 0.55 + 0.45 * Math.cos(p * Math.PI)
    const target = Math.max(0.04, bass * bassW + mid * 0.35 + treble * 0.10)
    return v * SMOOTH + target * (1 - SMOOTH)
  })
}

function draw(ctx, W, H, bars, t, playing) {
  ctx.clearRect(0, 0, W, H)

  const cx    = W / 2
  const cy    = H / 2
  const S     = Math.min(W, H) / 2

  const innerR = S * 0.54
  const maxH   = S * 0.32
  const barW   = Math.max(1.2, (innerR * 2 * Math.PI) / NUM_BARS * 0.52)

  // Base hue slowly cycles through the full rainbow
  const baseHue = (t * COLOR_SPD) % 360

  // Helper: hue for bar i (spread ~60° around the base hue)
  const hue = (i) => (baseHue + (i / NUM_BARS) * 60) % 360

  // ── 1. faint concentric guide rings ───────────────────────────────────────
  for (let k = 1; k <= 3; k++) {
    const r = innerR + k * maxH * 0.28
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.strokeStyle = `hsla(${baseHue},70%,65%,${0.06 - k * 0.012})`
    ctx.lineWidth   = 0.7
    ctx.stroke()
  }

  // ── 2. inner glow ring ─────────────────────────────────────────────────────
  const bassAvg   = bars.slice(0, NUM_BARS / 2).reduce((s, v) => s + v, 0) / (NUM_BARS / 2)
  const glowAlpha = 0.06 + bassAvg * 0.18
  const grad = ctx.createRadialGradient(cx, cy, innerR * 0.8, cx, cy, innerR)
  grad.addColorStop(0, `hsla(${baseHue},80%,70%,${glowAlpha})`)
  grad.addColorStop(1, `hsla(${baseHue},80%,70%,0)`)
  ctx.beginPath()
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2)
  ctx.fillStyle = grad
  ctx.fill()

  // ── 3. radial bars — rainbow, opacity + lightness driven by amplitude ─────
  for (let i = 0; i < NUM_BARS; i++) {
    const angle = (i / NUM_BARS) * Math.PI * 2 - Math.PI / 2
    const v     = bars[i]
    const h     = v * maxH
    if (h < 0.5) continue

    const x1 = cx + Math.cos(angle) * innerR
    const y1 = cy + Math.sin(angle) * innerR
    const x2 = cx + Math.cos(angle) * (innerR + h)
    const y2 = cy + Math.sin(angle) * (innerR + h)

    const alpha = 0.20 + v * 0.80
    const l     = 45 + v * 30   // 45% → 75% lightness

    ctx.beginPath()
    ctx.strokeStyle = `hsla(${hue(i)},90%,${l}%,${alpha})`
    ctx.lineWidth   = barW
    ctx.lineCap     = 'round'
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()

    // Glowing tip on loud bars
    if (v > 0.65 && Math.random() < 0.25) {
      ctx.beginPath()
      ctx.arc(x2, y2, barW * 1.2, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${hue(i)},100%,85%,${(v - 0.65) * 2.2})`
      ctx.fill()
    }
  }

  // ── 4. expanding ring pulses ──────────────────────────────────────────────
  if (playing) {
    for (let r = 0; r < NUM_RINGS; r++) {
      const phase  = ((t / BEAT_INT + r / NUM_RINGS) % 1)
      const radius = innerR + phase * Math.min(maxH * 1.4, S * 0.34)
      const alpha  = Math.pow(1 - phase, 2.2) * 0.32
      const rHue   = (baseHue + r * 30) % 360
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.strokeStyle = `hsla(${rHue},80%,70%,${alpha})`
      ctx.lineWidth   = 1.6 - phase * 1.2
      ctx.stroke()
    }
  }

  // ── 5. centre dot ─────────────────────────────────────────────────────────
  const dotR = S * 0.014
  const dotG = ctx.createRadialGradient(cx, cy, 0, cx, cy, dotR)
  dotG.addColorStop(0, `hsla(${baseHue},90%,90%,0.95)`)
  dotG.addColorStop(1, `hsla(${baseHue},90%,90%,0)`)
  ctx.beginPath()
  ctx.arc(cx, cy, dotR, 0, Math.PI * 2)
  ctx.fillStyle = dotG
  ctx.fill()
}

export function GramophoneVisualizer({ isPlaying }) {
  const canvasRef  = useRef(null)
  const isPlayRef  = useRef(isPlaying)
  const stateRef   = useRef({ bars: new Array(NUM_BARS).fill(0.04), t: 0 })

  useEffect(() => { isPlayRef.current = isPlaying }, [isPlaying])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    const s   = stateRef.current

    const resize = () => {
      const rect    = canvas.getBoundingClientRect()
      canvas.width  = Math.round(rect.width  * dpr)
      canvas.height = Math.round(rect.height * dpr)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    let last = 0
    const frame = (ts) => {
      const dt      = Math.min((ts - last) / 1000, 0.05)
      last          = ts
      const playing = isPlayRef.current

      if (playing) {
        s.t   += dt
        s.bars = simBars(s.bars, s.t)
      } else {
        s.t   += dt * 0.25   // slow colour cycle when idle/paused
        s.bars = s.bars.map((b) => Math.max(0.025, b * 0.955))
      }

      const ctx  = canvas.getContext('2d')
      const cssW = canvas.width  / dpr
      const cssH = canvas.height / dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw(ctx, cssW, cssH, s.bars, s.t, playing)

      s.raf = requestAnimationFrame(frame)
    }
    s.raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(s.raf)
      ro.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className="gramophone-canvas" aria-hidden="true" />
}
