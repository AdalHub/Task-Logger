import { useState, useEffect } from 'react'
import Log from './sections/Log'
import Activity from './sections/Activity'
import Tasks from './sections/Tasks'
import Settings from './sections/Settings'
import HotkeySetup, { hasHotkeyBeenSet } from './sections/HotkeySetup'
import './App.css'

type Section = 'log' | 'activity' | 'tasks'

export default function App() {
  const [section, setSection] = useState<Section>('log')
  const [showSettings, setShowSettings] = useState(false)
  const [showHotkeySetup, setShowHotkeySetup] = useState(false)

  useEffect(() => {
    setShowHotkeySetup(!hasHotkeyBeenSet())
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <h1>Task Logger</h1>
        <nav className="section-nav">
          <button
            className={section === 'log' ? 'active' : ''}
            onClick={() => setSection('log')}
          >
            Log
          </button>
          <button
            className={section === 'activity' ? 'active' : ''}
            onClick={() => setSection('activity')}
          >
            Activity
          </button>
          <button
            className={section === 'tasks' ? 'active' : ''}
            onClick={() => setSection('tasks')}
          >
            Tasks
          </button>
        </nav>
        <button className="settings-btn" onClick={() => setShowSettings(true)} aria-label="Settings">
          ⚙
        </button>
      </header>
      <main className="app-main">
        {section === 'log' && <Log onRefresh={() => {}} />}
        {section === 'activity' && <Activity />}
        {section === 'tasks' && <Tasks onTaskChange={() => {}} />}
      </main>
      {showSettings && (
        <Settings onClose={() => setShowSettings(false)} />
      )}
      {showHotkeySetup && (
        <HotkeySetup onDone={() => setShowHotkeySetup(false)} />
      )}
    </div>
  )
}
