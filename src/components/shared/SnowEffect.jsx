// Snowflake characters — looks like real snow, not circles
// Sizes kept small (10–18px) per user request
const VARIANTS = ['❄', '❅', '❆']

const COUNT = window.matchMedia?.('(max-width: 1024px)').matches ? 15 : 50

const FLAKES = Array.from({ length: COUNT }, (_, i) => ({
  id:       i,
  char:     VARIANTS[i % 3],
  left:     `${(i * 2.04 + Math.sin(i * 1.3) * 8) % 100}%`,
  delay:    `${(i * 0.27) % 15}s`,
  duration: `${9 + (i % 9) * 1.3}s`,
  fontSize: `${10 + (i % 5) * 2}px`,   // 10, 12, 14, 16, 18 px
  opacity:  0.18 + (i % 6) * 0.07,
  drift:    `${-16 + (i % 7) * 5}px`,
  rotate:   `${(i % 4) * 90}deg`,
}))

export function SnowEffect() {
  return (
    <div className="snow-layer" aria-hidden="true">
      {FLAKES.map((f) => (
        <span
          key={f.id}
          className="snowflake"
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
