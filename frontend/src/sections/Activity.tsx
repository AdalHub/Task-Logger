import { useState, useEffect, useCallback } from 'react'
import { api, type Activity as ActivityType, type StatsByTask, type StatsTimeSeriesPoint } from '../api'
import './Activity.css'

/** API returns naive datetimes in UTC; ensure we parse as UTC so local display is correct. */
function parseUtc(iso: string | null): Date | null {
  if (!iso) return null
  const s = iso.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z'
  return new Date(s)
}

function formatTime(d: string | null): string {
  const dt = parseUtc(d)
  if (!dt) return '—'
  return dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h) return `${h}h ${m}m`
  return `${m}m`
}

const PAD = { left: 44, right: 16, top: 12, bottom: 28 }
const CHART_WIDTH = 400
const CHART_HEIGHT = 220

function ActivityLineChart({ timeSeries }: { timeSeries: StatsTimeSeriesPoint[] }) {
  const dates = Array.from(
    new Set(timeSeries.map((p) => p.date))
  ).sort()
  const tasks = Array.from(
    new Map(
      timeSeries.map((p) => [
        p.task_id,
        { task_id: p.task_id, task_name: p.task_name, task_color: p.task_color },
      ])
    ).values()
  )
  const byDateTask = new Map<string, number>()
  timeSeries.forEach((p) => byDateTask.set(`${p.date}-${p.task_id}`, p.hours))
  const dataMax = timeSeries.length > 0 ? Math.max(...timeSeries.map((p) => p.hours)) : 0
  const maxHours = dataMax > 0 ? dataMax : 1
  const w = CHART_WIDTH - PAD.left - PAD.right
  const h = CHART_HEIGHT - PAD.top - PAD.bottom
  const x = (i: number) => PAD.left + (dates.length <= 1 ? 0 : (i / Math.max(1, dates.length - 1)) * w)
  const y = (hours: number) => PAD.top + h - (hours / maxHours) * h

  return (
    <div className="activity-line-chart">
      <svg width={CHART_WIDTH} height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
        <text x={22} y={CHART_HEIGHT - 10} textAnchor="middle" className="activity-line-axis-label">0</text>
        <text x={22} y={PAD.top + 12} textAnchor="middle" className="activity-line-axis-label">{maxHours}h</text>
        {tasks.map((task) => {
          const pts = dates.map((d, i) => {
            const hours = byDateTask.get(`${d}-${task.task_id}`) ?? 0
            return { x: x(i), y: y(hours), hours }
          })
          let pointsStr: string
          if (pts.length === 1) {
            pointsStr = `${pts[0].x},${y(0)} ${pts[0].x},${pts[0].y}`
          } else {
            pointsStr = pts.map((p) => `${p.x},${p.y}`).join(' ')
          }
          return (
            <polyline
              key={task.task_id}
              fill="none"
              stroke={task.task_color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={pointsStr}
            />
          )
        })}
        {dates.map((d, i) => (
          <text
            key={d}
            x={x(i)}
            y={CHART_HEIGHT - 6}
            textAnchor="middle"
            className="activity-line-label"
          >
            {d.slice(5)}
          </text>
        ))}
      </svg>
      <ul className="activity-line-legend">
        {tasks.map((t) => (
          <li key={t.task_id}>
            <span className="activity-line-legend-color" style={{ backgroundColor: t.task_color }} />
            {t.task_name}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Activity() {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth() + 1)
  const [daysWithActivity, setDaysWithActivity] = useState<string[]>([])
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [dayActivities, setDayActivities] = useState<ActivityType[]>([])
  const [stats, setStats] = useState<StatsByTask[]>([])
  const [timeSeries, setTimeSeries] = useState<StatsTimeSeriesPoint[]>([])
  const [statsRange, setStatsRange] = useState<'month' | 'year'>('month')
  const [graphType, setGraphType] = useState<'pie' | 'line'>('pie')
  const [loadingDay, setLoadingDay] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const loadDays = useCallback(async () => {
    try {
      const startOfMonth = new Date(year, month - 1, 1)
      const startOfNextMonth = new Date(year, month, 1)
      const activities = await api.getActivities({
        from_datetime: startOfMonth.toISOString(),
        to_datetime: startOfNextMonth.toISOString(),
      })
      const localDates = new Set<string>()
      activities.forEach((a) => {
        const d = parseUtc(a.logged_at)
        if (!d) return
        const y = d.getFullYear()
        const m = d.getMonth() + 1
        if (y !== year || m !== month) return
        const dd = String(d.getDate()).padStart(2, '0')
        const mm = String(m).padStart(2, '0')
        localDates.add(`${y}-${mm}-${dd}`)
      })
      setDaysWithActivity(Array.from(localDates))
    } finally {
      // done
    }
  }, [year, month])

  useEffect(() => {
    loadDays()
  }, [loadDays])

  useEffect(() => {
    if (!selectedDay) {
      setDayActivities([])
      return
    }
    const [y, m, d] = selectedDay.split('-').map(Number)
    const start = new Date(y, m - 1, d)
    const end = new Date(y, m - 1, d + 1)
    let cancelled = false
    setLoadingDay(true)
    api.getActivities({
      from_datetime: start.toISOString(),
      to_datetime: end.toISOString(),
    }).then((list) => {
      if (!cancelled) {
        setDayActivities(list)
        setLoadingDay(false)
      }
    })
    return () => { cancelled = true }
  }, [selectedDay])

  const statsFromTo = (): { from: string; to: string } => {
    const today = new Date()
    const to = today.toISOString().slice(0, 10)
    const from = new Date(today)
    if (statsRange === 'month') {
      from.setMonth(from.getMonth() - 1)
    } else {
      from.setFullYear(from.getFullYear() - 1)
    }
    return { from: from.toISOString().slice(0, 10), to }
  }

  useEffect(() => {
    const { from, to } = statsFromTo()
    api.getStats(from, to).then(setStats)
  }, [statsRange])

  const handleDownloadLog = async () => {
    const { from, to } = statsFromTo()
    try {
      await api.downloadLog(from, to)
    } catch (e) {
      console.error(e)
      alert('Failed to download log')
    }
  }

  useEffect(() => {
    const { from, to } = statsFromTo()
    api.getStatsTimeSeries(from, to).then(setTimeSeries)
  }, [statsRange])

  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const startPad = firstDay.getDay()
  const daysInMonth = lastDay.getDate()
  const totalCells = startPad + daysInMonth
  const rows = Math.ceil(totalCells / 7)

  const cellDates: (number | null)[] = []
  for (let i = 0; i < startPad; i++) cellDates.push(null)
  for (let d = 1; d <= daysInMonth; d++) cellDates.push(d)
  while (cellDates.length < rows * 7) cellDates.push(null)

  const totalMinsByTask = dayActivities.reduce((acc, a) => {
    acc[a.task_id] = (acc[a.task_id] || 0) + a.duration_minutes
    return acc
  }, {} as Record<number, number>)

  const handleDeleteActivity = async (activityId: number) => {
    if (!selectedDay) return
    if (!confirm('Delete this logged activity?')) return
    setDeletingId(activityId)
    try {
      await api.deleteActivity(activityId)
      setDayActivities((prev) => prev.filter((a) => a.id !== activityId))
      loadDays()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="activity">
      <div className="activity-calendar-header">
        <button
          type="button"
          onClick={() => {
            if (month === 1) {
              setMonth(12)
              setYear((y) => y - 1)
            } else {
              setMonth((m) => m - 1)
            }
          }}
        >
          ←
        </button>
        <span className="activity-month-label">
          {new Date(year, month - 1).toLocaleString(undefined, { month: 'long', year: 'numeric' })}
        </span>
        <button
          type="button"
          onClick={() => {
            if (month === 12) {
              setMonth(1)
              setYear((y) => y + 1)
            } else {
              setMonth((m) => m + 1)
            }
          }}
        >
          →
        </button>
      </div>
      <div className="activity-calendar">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="activity-calendar-weekday">{d}</div>
        ))}
        {cellDates.map((d, i) => {
          if (d === null) return <div key={`e-${i}`} className="activity-cell empty" />
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
          const hasActivity = daysWithActivity.includes(dateStr)
          const isSelected = selectedDay === dateStr
          return (
            <button
              key={dateStr}
              type="button"
              className={`activity-cell ${hasActivity ? 'has-activity' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedDay(isSelected ? null : dateStr)}
            >
              {d}
            </button>
          )
        })}
      </div>
      <div className="activity-graphs-section">
        <div className="activity-graphs-header">
          <h3>Usage</h3>
          <button
            type="button"
            className="activity-download-btn"
            onClick={handleDownloadLog}
          >
            Download log
          </button>
          <div className="activity-graph-type">
            <button
              type="button"
              className={graphType === 'pie' ? 'active' : ''}
              onClick={() => setGraphType('pie')}
            >
              Pie
            </button>
            <button
              type="button"
              className={graphType === 'line' ? 'active' : ''}
              onClick={() => setGraphType('line')}
            >
              Line
            </button>
          </div>
          <div className="activity-graph-range">
            <button
              type="button"
              className={statsRange === 'month' ? 'active' : ''}
              onClick={() => setStatsRange('month')}
            >
              Current month
            </button>
            <button
              type="button"
              className={statsRange === 'year' ? 'active' : ''}
              onClick={() => setStatsRange('year')}
            >
              By year
            </button>
          </div>
        </div>
        {graphType === 'pie' && (
          <div className="activity-pie-wrap">
            {stats.length === 0 ? (
              <p className="activity-empty">No data</p>
            ) : (
              <>
                <div
                  className="activity-pie"
                  style={{
                    background: `conic-gradient(${stats
                      .map((s, i) => {
                        const total = stats.reduce((a, x) => a + x.total_hours, 0)
                        const pct = total > 0 ? (s.total_hours / total) * 100 : 0
                        const start = stats
                          .slice(0, i)
                          .reduce((a, x) => a + (x.total_hours / (total || 1)) * 100, 0)
                        return `${s.task_color} ${start}% ${start + pct}%`
                      })
                      .join(', ')})`,
                  }}
                />
                <ul className="activity-pie-legend">
                  {stats.map((s) => {
                    const total = stats.reduce((a, x) => a + x.total_hours, 0)
                    const pct = total > 0 ? ((s.total_hours / total) * 100).toFixed(0) : 0
                    return (
                      <li key={s.task_id}>
                        <span className="activity-pie-legend-color" style={{ backgroundColor: s.task_color }} />
                        <span>{s.task_name}</span>
                        <span>{s.total_hours}h ({pct}%)</span>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </div>
        )}
        {graphType === 'line' && (
          <div className="activity-line-wrap">
            {timeSeries.length === 0 ? (
              <p className="activity-empty">No data</p>
            ) : (
              <ActivityLineChart timeSeries={timeSeries} />
            )}
          </div>
        )}
      </div>
      <div className="activity-detail-row">
        {selectedDay && (
          <div className="activity-side-panel">
            <h3>{selectedDay}</h3>
            {loadingDay ? (
              <p>Loading…</p>
            ) : dayActivities.length === 0 ? (
              <p className="activity-empty">No activities this day.</p>
            ) : (
              <>
                <ul className="activity-day-list">
                  {dayActivities.map((a) => (
                    <li key={a.id} className="activity-day-item">
                      <span className="activity-day-color" style={{ backgroundColor: a.task_color }} />
                      <div className="activity-day-info">
                        <span className="activity-day-task">{a.task_name}</span>
                        {a.no_time_assigned ? (
                          <span className="activity-day-time">No time assigned</span>
                        ) : (
                          <span className="activity-day-time">
                            {formatTime(a.start_time)} – {formatTime(a.end_time)}
                          </span>
                        )}
                        <span className="activity-day-duration">{formatDuration(a.duration_minutes)}</span>
                      </div>
                      <button
                        type="button"
                        className="activity-day-delete"
                        onClick={() => handleDeleteActivity(a.id)}
                        disabled={deletingId === a.id}
                        aria-label="Delete activity"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="activity-day-totals">
                  {Object.entries(totalMinsByTask).map(([taskId, mins]) => {
                    const task = dayActivities.find((a) => String(a.task_id) === taskId)
                    return (
                      <div key={taskId} className="activity-total-row">
                        <span className="activity-total-color" style={{ backgroundColor: task?.task_color ?? '#999' }} />
                        <span>{task?.task_name ?? taskId}</span>
                        <span>{formatDuration(mins)}</span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
