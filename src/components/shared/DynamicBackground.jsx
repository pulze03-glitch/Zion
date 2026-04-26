/**
 * DynamicBackground
 *
 * Renders 4 large, blurred color orbs that drift slowly, creating a fluid
 * gradient effect. Colors come from the artwork palette and transition
 * smoothly via CSS (transition: background 3s) when the song changes.
 *
 * Blobs never go solid — they're always heavily blurred — so the result
 * looks like colored atmosphere rather than flat blocks.
 */

const FALLBACK = [
  { h: 225, s: 0.14, l: 0.09 },
  { h: 210, s: 0.10, l: 0.07 },
  { h: 240, s: 0.08, l: 0.06 },
]

// Darken + slightly boost saturation so blobs read as rich but never wash
// out UI elements. bright=true raises lightness cap to 52% for vivid home bg.
function blobColor({ h, s, l }, bright = false) {
  const lCap = bright ? 52 : 28
  const sMul = bright ? 1.35 : 1.15
  const bs = Math.round(Math.min(88, s * 100 * sMul))
  const bl = Math.round(Math.min(lCap, l * 100 + (bright ? 14 : 4)))
  return `hsl(${Math.round(h)}, ${bs}%, ${bl}%)`
}

export function DynamicBackground({ palette, fixed = false, bright = false }) {
  // Fill 4 blob slots, cycling through palette colors
  const src = palette?.length > 0 ? palette : FALLBACK
  const blobs = Array.from({ length: 4 }, (_, i) => src[i % src.length])

  return (
    <div className={`dyn-bg${fixed ? ' dyn-bg--fixed' : ''}`} aria-hidden="true">
      {blobs.map((color, i) => (
        <div
          key={i}
          className={`dyn-blob dyn-blob--${i + 1}`}
          style={{ background: blobColor(color, bright) }}
        />
      ))}
      <div className="dyn-overlay" />
      <div className="dyn-grain" />
    </div>
  )
}
