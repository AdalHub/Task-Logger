import { useState, useEffect } from 'react'
import { api, type Settings as SettingsType } from '../api'
import './HotkeySetup.css'

const DEFAULT_HOTKEY = 'ctrl+alt+shift+l'
const STORAGE_KEY = 'task_logger_hotkey_confirmed'

export function hasHotkeyBeenSet(): boolean {
  return !!localStorage.getItem(STORAGE_KEY)
}

export function setHotkeyConfirmed(): void {
  localStorage.setItem(STORAGE_KEY, '1')
}

interface HotkeySetupProps {
  onDone: () => void
}

export default function HotkeySetup({ onDone }: HotkeySetupProps) {
  const [hotkey, setHotkey] = useState(DEFAULT_HOTKEY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.getSettings().then((s: SettingsType) => {
      setHotkey(s.hotkey || DEFAULT_HOTKEY)
      setLoading(false)
    }).catch(() => {
      setHotkey(DEFAULT_HOTKEY)
      setLoading(false)
    })
  }, [])

  const handleSave = async () => {
    const value = hotkey.trim() || DEFAULT_HOTKEY
    setSaving(true)
    setError(null)
    try {
      await api.updateSettings({ hotkey: value })
      setHotkeyConfirmed()
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  return (
    <div className="hotkey-setup-overlay" role="dialog" aria-modal="true" aria-labelledby="hotkey-setup-title">
      <div className="hotkey-setup-modal">
        <h2 id="hotkey-setup-title">Set your hotkey</h2>
        <p className="hotkey-setup-intro">
          Choose a key combination to open Task Logger in your browser. You can change this later in Settings (⚙).
        </p>
        <div className="hotkey-setup-field">
          <label htmlFor="hotkey-setup-input">Hotkey</label>
          <input
            id="hotkey-setup-input"
            type="text"
            value={hotkey}
            onChange={(e) => setHotkey(e.target.value)}
            placeholder={DEFAULT_HOTKEY}
          />
        </div>
        {error && <div className="hotkey-setup-error">{error}</div>}
        <div className="hotkey-setup-steps">
          <p className="hotkey-setup-steps-title">How to use your hotkey</p>
          <ol>
            <li><strong>Start the app</strong> — Double-click the Desktop shortcut (<code>run_task_logger.bat</code>) or run <code>uv run python launcher.py</code>. For run at login, put a shortcut to <code>run_task_logger_silent.vbs</code> in the Startup folder (<kbd>Win+R</kbd> → <code>shell:startup</code>).</li>
            <li><strong>Open the app</strong> — Press your hotkey (e.g. <kbd>Ctrl+Alt+Shift+L</kbd>). The app will open in your browser.</li>
          </ol>
        </div>
        <div className="hotkey-setup-actions">
          <button type="button" onClick={handleSave} disabled={saving} className="hotkey-setup-primary">
            {saving ? 'Saving…' : 'Use this hotkey'}
          </button>
        </div>
      </div>
    </div>
  )
}
