/**
 * SnowMeltVisualizer — Snow Aura
 *
 * No rectangular container — pure ambient snow field floating around the album art.
 * Canvas is 136% of the stage (18% bleed on each side) so particles drift freely
 * beyond the art circle without any hard edge.
 *
 * Playing  → bright glow, fast orbit, pulse rings, many flakes
 * Paused   → dim, slow drift, no rings
 */
import { useEffect, useRef } from 'react'

const IS_PHONE   = window.matchMedia?.('(max-width: 767px)').matches
const IS_LOW_END = IS_PHONE || window.matchMedia?.('(max-width: 1024px)').matches
const N_ORBITAL = IS_PHONE ? 0  : IS_LOW_END ? 10 : 28
const N_AMBIENT = IS_PHONE ? 8  : IS_LOW_END ? 18 : 52

// ─── Factories ───────────────────────────────────────────────────────────────

function mkOrbital(S) {
  const angle  = Math.random() * Math.PI * 2
  const radius = S * (0.56 + Math.random() * 0.28)
  return {
    angle,
    radius,
    baseRadius: radius,
    speed:  (0.20 + Math.random() * 0.22) * (Math.random() < 0.5 ? 1 : -1),
    r:      0.8 + Math.random() * 1.8,
    a:      0,
    targetA: 0.28 + Math.random() * 0.52,
    wp:     Math.random() * Math.PI * 2,
    ws:     0.5  + Math.random() * 0.9,
    wAmp:   0.012 + Math.random() * 0.022,
  }
}

function mkAmbient(W, H, S) {
  const angle = Math.random() * Math.PI * 2
  const dist  = S * (0.50 + Math.random() * 1.05)
  return {
    x:       W / 2 + Math.cos(angle) * dist,
    y:       H / 2 + Math.sin(angle) * dist,
    vx:      (Math.random() - 0.5) * 0.35,
    vy:      -0.10 - Math.random() * 0.30,
    r:       0.6 + Math.random() * 2.2,
    life:    Math.random(),
    lifeSpd: 0.0025 + Math.random() * 0.005,
    maxA:    0.12 + Math.random() * 0.42,
    wp:      Math.random() * Math.PI * 2,
    ws:      0.008 + Math.random() * 0.012,
  }
}

// ─── Draw ─────────────────────────────────────────────────────────────────────

function draw(ctx, W, H, state, playing) {
  ctx.clearRect(0, 0, W, H)

  const cx = W / 2
  const cy = H / 2
  const S  = Math.min(W, H) / 2

  // ── 1. Radial glow aura ───────────────────────────────────
  const auraR  = S * 0.72
  const auraI  = playing ? 0.16 : 0.07
  const aura   = ctx.createRadialGradient(cx, cy, S * 0.22, cx, cy, auraR)
  aura.addColorStop(0,    `rgba(210, 232, 255, ${auraI})`)
  aura.addColorStop(0.45, `rgba(190, 220, 255, ${auraI * 0.55})`)
  aura.addColorStop(1,    'rgba(170, 210, 255, 0)')
  ctx.beginPath()
  ctx.arc(cx, cy, auraR, 0, Math.PI * 2)
  ctx.fillStyle = aura
  ctx.fill()

  // ── 2. Outer halo ring ────────────────────────────────────
  const haloR = S * 0.545
  const haloG = ctx.createRadialGradient(cx, cy, haloR * 0.88, cx, cy, haloR * 1.1)
  haloG.addColorStop(0,   `rgba(255,255,255,${playing ? 0.09 : 0.04})`)
  haloG.addColorStop(0.5, `rgba(200,225,255,${playing ? 0.05 : 0.02})`)
  haloG.addColorStop(1,   'rgba(180,215,255,0)')
  ctx.beginPath()
  ctx.arc(cx, cy, haloR * 1.1, 0, Math.PI * 2)
  ctx.fillStyle = haloG
  ctx.fill()

  // ── 3. Expanding pulse rings (playing only) ───────────────
  if (playing) {
    for (let i = 0; i < 3; i++) {
      const phase  = ((state.t * 0.5 + i / 3) % 1)
      const radius = S * 0.54 + phase * S * 0.62
      const alpha  = Math.pow(1 - phase, 2.8) * 0.16
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(230, 245, 255, ${alpha})`
      ctx.lineWidth   = 1.2
      ctx.stroke()
    }
  }

  // ── 4. Orbital flakes ─────────────────────────────────────
  for (const f of state.orbital) {
    const x = cx + Math.cos(f.angle) * f.radius
    const y = cy + Math.sin(f.angle) * f.radius
    if (f.a < 0.01) continue
    ctx.beginPath()
    ctx.arc(x, y, f.r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,255,255,${f.a.toFixed(2)})`
    ctx.fill()
  }

  // ── 5. Ambient drifting flakes ────────────────────────────
  for (const f of state.ambient) {
    const alpha = f.maxA * Math.sin(f.life * Math.PI)
    if (alpha < 0.02) continue
    ctx.beginPath()
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`
    ctx.fill()
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SnowMeltVisualizer({ isPlaying }) {
  const canvasRef = useRef(null)
  const isPlayRef = useRef(isPlaying)
  const stateRef  = useRef(null)

  useEffect(() => { isPlayRef.current = isPlaying }, [isPlaying])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1

    const buildState = (W, H) => {
      const S = Math.min(W, H) / 2
      return {
        orbital: Array.from({ length: N_ORBITAL }, () => mkOrbital(S)),
        ambient: Array.from({ length: N_AMBIENT  }, () => mkAmbient(W, H, S)),
        t: 0,
      }
    }

    const resize = () => {
      const rect    = canvas.getBoundingClientRect()
      canvas.width  = Math.round(rect.width  * dpr)
      canvas.height = Math.round(rect.height * dpr)
      stateRef.current = buildState(rect.width, rect.height)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    let last  = 0
    let rafId

    const frame = (ts) => {
      const dt      = Math.min((ts - last) / 1000, 0.05)
      last          = ts
      const playing = isPlayRef.current
      const s       = stateRef.current
      const cssW    = canvas.width  / dpr
      const cssH    = canvas.height / dpr
      const S       = Math.min(cssW, cssH) / 2

      s.t += dt

      const orbitMul = playing ? 1.7 : 0.35

      // ── Orbitals ───────────────────────────────────────
      for (const f of s.orbital) {
        f.wp     += f.ws * dt
        f.angle  += f.speed * orbitMul * dt
        // radius breathes gently
        const breathe = 1 + Math.sin(f.wp) * f.wAmp
        const targetR = f.baseRadius * breathe
        f.radius += (targetR - f.radius) * 4 * dt
        // opacity target
        const targetA = playing
          ? f.targetA * (0.6 + 0.4 * Math.abs(Math.sin(f.wp * 0.6)))
          : f.targetA * 0.28 * Math.abs(Math.sin(f.wp * 0.3))
        f.a += (targetA - f.a) * 3.5 * dt
      }

      // ── Ambient ────────────────────────────────────────
      const driftMul = playing ? 1.5 : 0.4
      for (const f of s.ambient) {
        f.wp   += f.ws
        f.life += f.lifeSpd * driftMul
        f.x    += (f.vx + Math.sin(f.wp) * 0.25) * driftMul * dt * 60 * 0.016
        f.y    += f.vy                             * driftMul * dt * 60 * 0.016

        if (f.life >= 1 || f.x < -20 || f.x > cssW + 20 || f.y < -20 || f.y > cssH + 20) {
          const angle = Math.random() * Math.PI * 2
          const dist  = S * (0.52 + Math.random() * 1.0)
          f.x       = cssW / 2 + Math.cos(angle) * dist
          f.y       = cssH / 2 + Math.sin(angle) * dist
          f.life    = 0
          f.vx      = (Math.random() - 0.5) * 0.35
          f.vy      = -0.10 - Math.random() * 0.30
          f.r       = 0.6 + Math.random() * 2.2
          f.maxA    = 0.12 + Math.random() * 0.42
        }
      }

      const ctx = canvas.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw(ctx, cssW, cssH, s, playing)

      rafId = requestAnimationFrame(frame)
    }

    rafId = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className="gramophone-canvas" aria-hidden="true" />
}
