import { useState, useEffect, useCallback } from 'react'
import { api, type Activity as ActivityType, type StatsByTask } from '../api'
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

export default function Activity() {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth() + 1)
  const [daysWithActivity, setDaysWithActivity] = useState<string[]>([])
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [dayActivities, setDayActivities] = useState<ActivityType[]>([])
  const [stats, setStats] = useState<StatsByTask[]>([])
  const [statsRange, setStatsRange] = useState<'month' | 'year'>('month')
  const [loadingDay, setLoadingDay] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const loadDays = useCallback(async () => {
    try {
      const list = await api.getActivityDays(year, month)
      setDaysWithActivity(list)
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
    let cancelled = false
    setLoadingDay(true)
    api.getActivities({ day: selectedDay }).then((list) => {
      if (!cancelled) {
        setDayActivities(list)
        setLoadingDay(false)
      }
    })
    return () => { cancelled = true }
  }, [selectedDay])

  useEffect(() => {
    const today = new Date()
    const from = new Date(today)
    const to = new Date(today)
    if (statsRange === 'month') {
      from.setMonth(from.getMonth() - 1)
    } else {
      from.setFullYear(from.getFullYear() - 1)
    }
    api.getStats(
      from.toISOString().slice(0, 10),
      to.toISOString().slice(0, 10)
    ).then(setStats)
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
        <div className="activity-histogram">
          <div className="activity-histogram-header">
            <h3>Total hours by task</h3>
            <div className="activity-histogram-toggle">
              <button
                type="button"
                className={statsRange === 'month' ? 'active' : ''}
                onClick={() => setStatsRange('month')}
              >
                Last month
              </button>
              <button
                type="button"
                className={statsRange === 'year' ? 'active' : ''}
                onClick={() => setStatsRange('year')}
              >
                Entire year
              </button>
            </div>
          </div>
          <div className="activity-histogram-bars">
            {stats.length === 0 ? (
              <p className="activity-empty">No data</p>
            ) : (
              stats.map((s) => (
                <div key={s.task_id} className="activity-bar-row">
                  <span className="activity-bar-color" style={{ backgroundColor: s.task_color }} />
                  <span className="activity-bar-label">{s.task_name}</span>
                  <div className="activity-bar-wrap">
                    <div
                      className="activity-bar-fill"
                      style={{
                        width: `${Math.min(100, (s.total_hours / Math.max(...stats.map((x) => x.total_hours), 1)) * 100)}%`,
                        backgroundColor: s.task_color,
                      }}
                    />
                  </div>
                  <span className="activity-bar-hours">{s.total_hours}h</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
