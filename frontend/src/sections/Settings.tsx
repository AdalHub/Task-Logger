import { useState, useEffect } from 'react'
import { api, type Settings as SettingsType } from '../api'
import './Settings.css'

interface SettingsProps {
  onClose: () => void
}

export default function Settings({ onClose }: SettingsProps) {
  const [hotkey, setHotkey] = useState('')
  const [runAtStartup, setRunAtStartup] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.getSettings().then((s: SettingsType) => {
      setHotkey(s.hotkey)
      setRunAtStartup(s.run_at_startup)
      setLoading(false)
    }).catch((e) => {
      setError(e instanceof Error ? e.message : String(e))
      setLoading(false)
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await api.updateSettings({ hotkey: hotkey.trim() || undefined, run_at_startup: runAtStartup })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true">
      <div className="settings-modal">
        <div className="settings-header">
          <h2>Settings</h2>
          <button type="button" className="settings-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        {loading ? (
          <p>Loading…</p>
        ) : (
          <>
            {error && <div className="settings-error">{error}</div>}
            <div className="settings-field">
              <label htmlFor="hotkey">Hotkey (e.g. ctrl+alt+shift+l)</label>
              <input
                id="hotkey"
                type="text"
                value={hotkey}
                onChange={(e) => setHotkey(e.target.value)}
                placeholder="ctrl+alt+shift+l"
              />
              <p className="settings-hint">
                Press this combination to open the app in your browser. If it’s already taken by another app, choose a different combination.
              </p>
            </div>
            <div className="settings-field">
              <label>
                <input
                  type="checkbox"
                  checked={runAtStartup}
                  onChange={(e) => setRunAtStartup(e.target.checked)}
                />
                Run at startup
              </label>
              <p className="settings-hint">
                Add a shortcut to the app in your Windows Startup folder so it starts when you log in. Use the “Create desktop shortcut” / “Add to Startup” instructions in the README.
              </p>
            </div>
            <div className="settings-actions">
              <button type="button" onClick={onClose}>Cancel</button>
              <button type="button" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
