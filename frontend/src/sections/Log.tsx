import { useState, useEffect, useCallback } from 'react'
import { api, type Task, type RunningActivity } from '../api'
import './Log.css'

interface LogProps {
  onRefresh?: () => void
}

export default function Log({ onRefresh }: LogProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [running, setRunning] = useState<RunningActivity | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [filter, setFilter] = useState('')
  const [mode, setMode] = useState<'stopwatch' | 'manual'>('stopwatch')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [manualStart, setManualStart] = useState('')
  const [manualEnd, setManualEnd] = useState('')
  const [manualDuration, setManualDuration] = useState('')
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().slice(0, 10))

  const load = useCallback(async () => {
    try {
      setError(null)
      const [tList, run] = await Promise.all([api.getTasks(), api.getRunning()])
      setTasks(tList)
      setRunning(run)
      if (run && !selectedTaskId) setSelectedTaskId(run.task_id)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filteredTasks = filter
    ? tasks.filter((t) => t.name.toLowerCase().includes(filter.toLowerCase()))
    : tasks

  const handleStartStopwatch = async () => {
    if (!selectedTaskId) return
    try {
      setError(null)
      await api.startStopwatch(selectedTaskId)
      await load()
      onRefresh?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const handleStopRunning = async () => {
    if (!running) return
    try {
      setError(null)
      await api.stopActivity(running.id)
      await load()
      onRefresh?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const handleLogManual = async () => {
    if (!selectedTaskId) return
    const hasRange = manualStart && manualEnd
    const hasDurationOnly = manualDuration.trim() !== ''
    if (hasRange) {
      const start = new Date(manualDate + 'T' + manualStart)
      const end = new Date(manualDate + 'T' + manualEnd)
      const duration = Math.round((end.getTime() - start.getTime()) / 60000)
      try {
        setError(null)
        await api.logManual({
          task_id: selectedTaskId,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          duration_minutes: duration,
          logged_at: start.toISOString(),
        })
        setManualStart('')
        setManualEnd('')
        await load()
        onRefresh?.()
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    } else if (hasDurationOnly) {
      const mins = parseInt(manualDuration, 10)
      if (isNaN(mins) || mins <= 0) {
        setError('Enter a valid duration in minutes')
        return
      }
      try {
        setError(null)
        await api.logManual({
          task_id: selectedTaskId,
          duration_minutes: mins,
          logged_at: new Date().toISOString(),
        })
        setManualDuration('')
        await load()
        onRefresh?.()
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    } else {
      setError('Enter either start+end time or total duration (minutes)')
    }
  }

  if (loading) return <div className="log-loading">Loading…</div>

  return (
    <div className="log">
      {error && <div className="log-error">{error}</div>}
      {running && (
        <div className="log-running-banner">
          <span>You have an open task: <strong>{running.task_name}</strong>. Stop it?</span>
          <button type="button" onClick={handleStopRunning}>Stop</button>
        </div>
      )}
      <div className="log-task-select">
        <label>Task</label>
        <input
          type="text"
          placeholder="Filter tasks…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="log-filter"
        />
        <select
          value={selectedTaskId ?? ''}
          onChange={(e) => setSelectedTaskId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Select task</option>
          {filteredTasks.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <div className="log-task-chips">
          {filteredTasks.slice(0, 20).map((t) => (
            <button
              key={t.id}
              type="button"
              className={`chip ${selectedTaskId === t.id ? 'active' : ''}`}
              style={{ borderColor: t.color }}
              onClick={() => setSelectedTaskId(t.id)}
            >
              <span className="chip-color" style={{ backgroundColor: t.color }} />
              {t.name}
            </button>
          ))}
        </div>
      </div>
      <div className="log-modes">
        <button
          type="button"
          className={mode === 'stopwatch' ? 'active' : ''}
          onClick={() => setMode('stopwatch')}
        >
          Stopwatch
        </button>
        <button
          type="button"
          className={mode === 'manual' ? 'active' : ''}
          onClick={() => setMode('manual')}
        >
          Log manually
        </button>
      </div>
      {mode === 'stopwatch' && (
        <div className="log-stopwatch">
          <button
            type="button"
            onClick={handleStartStopwatch}
            disabled={!selectedTaskId || !!running}
          >
            Start stopwatch
          </button>
        </div>
      )}
      {mode === 'manual' && (
        <div className="log-manual">
          <p>Either set start and end time, or enter total duration (minutes).</p>
          <div className="log-manual-date">
            <label>Date</label>
            <input
              type="date"
              value={manualDate}
              onChange={(e) => setManualDate(e.target.value)}
            />
          </div>
          <div className="log-manual-range">
            <label>Start time</label>
            <input
              type="time"
              value={manualStart}
              onChange={(e) => setManualStart(e.target.value)}
            />
            <label>End time</label>
            <input
              type="time"
              value={manualEnd}
              onChange={(e) => setManualEnd(e.target.value)}
            />
          </div>
          <div className="log-manual-duration">
            <label>Or total duration (minutes)</label>
            <input
              type="number"
              min={1}
              placeholder="e.g. 30"
              value={manualDuration}
              onChange={(e) => setManualDuration(e.target.value)}
            />
          </div>
          <button type="button" onClick={handleLogManual} disabled={!selectedTaskId}>
            Log
          </button>
        </div>
      )}
    </div>
  )
}
