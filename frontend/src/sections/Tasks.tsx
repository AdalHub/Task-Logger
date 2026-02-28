import { useState, useEffect, useCallback } from 'react'
import { api, type Task } from '../api'
import './Tasks.css'

interface TasksProps {
  onTaskChange?: () => void
}

export default function Tasks({ onTaskChange }: TasksProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const list = await api.getTasks()
      setTasks(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleAdd = async () => {
    const name = newName.trim()
    if (!name) return
    try {
      setError(null)
      await api.createTask(name)
      setNewName('')
      await load()
      onTaskChange?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this task? Activities will remain but will show as unknown task if we ever support that.')) return
    try {
      setError(null)
      await api.deleteTask(id)
      await load()
      onTaskChange?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  if (loading) return <div className="tasks-loading">Loading…</div>

  return (
    <div className="tasks">
      {error && <div className="tasks-error">{error}</div>}
      <div className="tasks-add">
        <input
          type="text"
          placeholder="New task name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button type="button" onClick={handleAdd} disabled={!newName.trim()}>
          Add task
        </button>
      </div>
      <ul className="tasks-list">
        {tasks.map((t) => (
          <li key={t.id} className="tasks-item">
            <span className="tasks-item-color" style={{ backgroundColor: t.color }} />
            <span className="tasks-item-name">{t.name}</span>
            <button
              type="button"
              className="tasks-item-delete"
              onClick={() => handleDelete(t.id)}
              aria-label="Delete"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      {tasks.length === 0 && (
        <p className="tasks-empty">No tasks yet. Add one above.</p>
      )}
    </div>
  )
}
