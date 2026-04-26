import { useMemo } from 'react'
import { Clock, Disc3, Headphones, Mic2, Music2, TrendingUp } from 'lucide-react'
import { computeStats } from '../utils/statsCompute'

function fmtMins(mins) {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function TopList({ items, emptyMsg, type = 'song' }) {
  if (!items.length) return <p className="stats-empty-sub">{emptyMsg}</p>
  return (
    <ol className="stats-top-list">
      {items.map((item, i) => (
        <li key={item.key} className="stats-top-item">
          {type === 'song'
            ? <img src={`https://i.ytimg.com/vi/${item.key}/default.jpg`} className="stats-top-thumb" alt="" />
            : <span className="stats-artist-avatar">{item.label[0]?.toUpperCase()}</span>
          }
          <span className="stats-rank">#{i + 1}</span>
          <div className="stats-top-meta">
            <span className="stats-top-name">{item.label}</span>
            <span className="stats-top-time">{fmtMins(Math.round(item.totalSeconds / 60))}</span>
          </div>
        </li>
      ))}
    </ol>
  )
}

function DayBar({ dayCounts, dayLabels }) {
  const max = Math.max(...dayCounts, 1)
  return (
    <div className="stats-day-bars">
      {dayCounts.map((v, i) => (
        <div key={dayLabels[i]} className="stats-day-col">
          <div className="stats-day-fill" style={{ height: `${Math.round((v / max) * 100)}%` }} />
          <span className="stats-day-label">{dayLabels[i]}</span>
        </div>
      ))}
    </div>
  )
}

export function StatsPage() {
  const stats = useMemo(() => computeStats(), [])

  if (stats.empty) {
    return (
      <div className="stats-view">
        <div className="page-header">
          <h1 className="page-title">Listening Stats</h1>
          <p className="page-subtitle">Your music journey, visualised</p>
        </div>
        <div className="stats-empty glass page-card">
          <Headphones size={40} style={{ opacity: 0.3 }} />
          <p>Play some music to start building your stats.</p>
          <p className="stats-empty-hint">We track what you listen to so you can see your taste evolve over time.</p>
        </div>
      </div>
    )
  }

  const { weekly, monthly, allTime } = stats

  return (
    <div className="stats-view">

      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Listening Stats</h1>
        <p className="page-subtitle">Your music journey</p>
      </div>

      {/* ── All-time strip ── */}
      <div className="stats-alltime-strip">
        <div className="stats-alltime-item">
          <span className="stats-alltime-val">{fmtMins(allTime.minutes)}</span>
          <span className="stats-alltime-lbl">Total</span>
        </div>
        <div className="stats-alltime-sep" />
        <div className="stats-alltime-item">
          <span className="stats-alltime-val">{allTime.songCount}</span>
          <span className="stats-alltime-lbl">Songs</span>
        </div>
        <div className="stats-alltime-sep" />
        <div className="stats-alltime-item">
          <span className="stats-alltime-val">{allTime.artistCount}</span>
          <span className="stats-alltime-lbl">Artists</span>
        </div>
      </div>

      {/* ── Monthly Rewind ── */}
      <section className="stats-section">
        <h2 className="stats-section-title"><TrendingUp size={14} /> {monthly.name} Rewind</h2>
        <div className="stats-rewind-card glass page-card">
          <div className="stats-rewind-hero">
            <span className="stats-rewind-mins">{fmtMins(monthly.minutes)}</span>
            <span className="stats-rewind-sub">{monthly.songCount} songs · {monthly.artistCount} artists</span>
          </div>
          <div className="stats-top-pair">
            <div>
              <p className="stats-pair-title"><Disc3 size={12} /> Top Songs</p>
              <TopList items={monthly.topSongs} emptyMsg="No songs yet" type="song" />
            </div>
            <div>
              <p className="stats-pair-title"><Mic2 size={12} /> Top Artists</p>
              <TopList items={monthly.topArtists} emptyMsg="No artists yet" type="artist" />
            </div>
          </div>
        </div>
      </section>

      {/* ── This Week ── */}
      <section className="stats-section">
        <h2 className="stats-section-title"><Headphones size={14} /> This Week</h2>

        {/* Quick stats row */}
        <div className="stats-week-strip glass page-card">
          <div className="stats-week-item">
            <Clock size={14} />
            <span className="stats-week-val">{fmtMins(weekly.minutes)}</span>
            <span className="stats-week-lbl">Listened</span>
          </div>
          <div className="stats-week-item">
            <Music2 size={14} />
            <span className="stats-week-val">{weekly.songCount}</span>
            <span className="stats-week-lbl">Songs</span>
          </div>
          <div className="stats-week-item">
            <Mic2 size={14} />
            <span className="stats-week-val">{weekly.artistCount}</span>
            <span className="stats-week-lbl">Artists</span>
          </div>
        </div>

        {/* Day bars */}
        {weekly.minutes > 0 && (
          <div className="stats-day-card glass page-card">
            <p className="stats-pair-title">Daily Activity{weekly.busiestDay ? ` · Busiest: ${weekly.busiestDay}` : ''}</p>
            <DayBar dayCounts={weekly.dayCounts} dayLabels={weekly.dayLabels} />
          </div>
        )}

        {/* Top lists */}
        <div className="stats-top-pair-wrap glass page-card">
          <div className="stats-top-pair">
            <div>
              <p className="stats-pair-title"><Disc3 size={12} /> Top Songs</p>
              <TopList items={weekly.topSongs} emptyMsg="No songs yet" type="song" />
            </div>
            <div>
              <p className="stats-pair-title"><Mic2 size={12} /> Top Artists</p>
              <TopList items={weekly.topArtists} emptyMsg="No artists yet" type="artist" />
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
