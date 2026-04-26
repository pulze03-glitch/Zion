/**
 * SeasonEffect — animated ambient particles for all four seasons.
 *
 * Winter  : white snowflakes  ❄ ❅ ❆  — drift down
 * Spring  : cherry blossom petals  🌸 ✿ ❀  — float + gentle spin
 * Summer  : fireflies — glowing gold dots that pulse and wander
 * Autumn  : falling leaves  🍂 🍁  — tumble and spin down
 *
 * The current season is stored in localStorage under 'frost-season'.
 * 'off' disables all effects.
 */
import { useEffect, useMemo, useRef } from 'react'

// ─── Season configs ────────────────────────────────────────────────────────────
const SEASONS = {
  off:    null,
  winter: {
    chars:    ['❄', '❅', '❆'],
    count:    38,
    sizeMin:  10, sizeMax: 18,
    opMin:    0.18, opMax: 0.70,
    driftAmp: 18,
    className: 'sp-flake sp-flake--winter',
  },
  spring: {
    chars:    ['✿', '❀', '✾', '❁'],
    count:    32,
    sizeMin:  11, sizeMax: 22,
    opMin:    0.22, opMax: 0.75,
    driftAmp: 26,
    className: 'sp-flake sp-flake--spring',
  },
  summer: {
    // Fireflies rendered as a canvas for glow effect
    type: 'canvas',
    count: 28,
  },
  autumn: {
    chars:    ['🍂', '🍁', '🍃', '🍀'],
    count:    28,
    sizeMin:  13, sizeMax: 24,
    opMin:    0.30, opMax: 0.80,
    driftAmp: 30,
    className: 'sp-flake sp-flake--autumn',
  },
}

// ─── CSS-particle seasons (winter / spring / autumn) ─────────────────────────
function buildFlakes(cfg, count) {
  return Array.from({ length: count }, (_, i) => ({
    id:       i,
    char:     cfg.chars[i % cfg.chars.length],
    left:     `${(i * 2.63 + Math.sin(i * 1.7) * 9) % 100}%`,
    delay:    `${(i * 0.33) % 16}s`,
    duration: `${10 + (i % 8) * 1.6}s`,
    fontSize: `${cfg.sizeMin + (i % 5) * ((cfg.sizeMax - cfg.sizeMin) / 4)}px`,
    opacity:  cfg.opMin + (i % 6) * ((cfg.opMax - cfg.opMin) / 5),
    drift:    `${-cfg.driftAmp + (i % 7) * (cfg.driftAmp * 2 / 6)}px`,
    rotate:   `${(i % 6) * 60}deg`,
  }))
}

function CSSParticles({ season, cfg }) {
  const flakes = useMemo(() => buildFlakes(cfg, cfg.count), [cfg])
  return (
    <div className={`season-layer season-layer--${season}`} aria-hidden="true">
      {flakes.map((f) => (
        <span
          key={f.id}
          className={cfg.className}
          style={{
            left:              f.left,
            fontSize:          f.fontSize,
            opacity:           f.opacity,
            animationDuration: f.duration,
            animationDelay:    f.delay,
            '--drift':         f.drift,
            '--rotate':        f.rotate,
          }}
        >
          {f.char}
        </span>
      ))}
    </div>
  )
}

// ─── Summer firefly canvas ─────────────────────────────────────────────────────
function mkFirefly(W, H) {
  return {
    x:    Math.random() * W,
    y:    Math.random() * H,
    vx:   (Math.random() - 0.5) * 0.5,
    vy:   (Math.random() - 0.5) * 0.5,
    r:    1.2 + Math.random() * 2.2,
    life: Math.random(),
    ls:   0.004 + Math.random() * 0.006,
    hue:  45 + Math.random() * 30,   // warm gold–yellow
  }
}

function SummerFireflies({ count }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    let flies = []
    let rafId

    const resize = () => {
      const W = window.innerWidth, H = window.innerHeight
      canvas.width  = W * dpr
      canvas.height = H * dpr
      canvas.style.width  = `${W}px`
      canvas.style.height = `${H}px`
      flies = Array.from({ length: count }, () => mkFirefly(W, H))
    }
    resize()
    window.addEventListener('resize', resize)

    const frame = () => {
      const ctx = canvas.getContext('2d')
      const W = canvas.width / dpr, H = canvas.height / dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)

      for (const f of flies) {
        f.life = (f.life + f.ls) % 1
        f.x = (f.x + f.vx + W) % W
        f.y = (f.y + f.vy + H) % H
        // gentle wander
        f.vx += (Math.random() - 0.5) * 0.04
        f.vy += (Math.random() - 0.5) * 0.04
        f.vx = Math.max(-0.7, Math.min(0.7, f.vx))
        f.vy = Math.max(-0.7, Math.min(0.7, f.vy))

        const alpha = Math.sin(f.life * Math.PI) * 0.85
        if (alpha < 0.05) continue

        // outer glow
        const glow = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 7)
        glow.addColorStop(0,   `hsla(${f.hue}, 100%, 75%, ${alpha * 0.5})`)
        glow.addColorStop(0.5, `hsla(${f.hue}, 90%, 60%, ${alpha * 0.2})`)
        glow.addColorStop(1,   'hsla(0,0%,100%,0)')
        ctx.beginPath()
        ctx.arc(f.x, f.y, f.r * 7, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.fill()

        // bright core
        ctx.beginPath()
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${f.hue}, 100%, 92%, ${alpha})`
        ctx.fill()
      }

      rafId = requestAnimationFrame(frame)
    }
    rafId = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
    }
  }, [count])

  return (
    <canvas
      ref={canvasRef}
      className="season-layer season-layer--summer"
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 5 }}
    />
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function SeasonEffect({ season }) {
  if (!season || season === 'off') return null
  // Skip particles entirely on phones — too expensive
  if (window.matchMedia('(max-width: 767px)').matches) return null
  const cfg = SEASONS[season]
  if (!cfg) return null
  if (cfg.type === 'canvas') return <SummerFireflies count={Math.min(cfg.count, 14)} />
  const mobileCfg = { ...cfg, count: Math.min(cfg.count, 16) }
  return <CSSParticles season={season} cfg={mobileCfg} />
}
