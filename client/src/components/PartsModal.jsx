import { useState, useEffect } from 'react'
import { getSongParts, upsertSongPart, deleteSongPart } from '../api'

const PRESET_INSTRUMENTS = ['Bass', 'Guitar', 'Keys', 'Vocals', 'Drums']

export default function PartsModal({ song, onClose }) {
  const [parts, setParts] = useState([])
  const [activeTab, setActiveTab] = useState(null)
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [newInstrument, setNewInstrument] = useState('')
  const [showAddInstrument, setShowAddInstrument] = useState(false)

  useEffect(() => {
    loadParts()
  }, [song.id])

  const loadParts = async () => {
    try {
      const data = await getSongParts(song.id)
      setParts(data)
      if (data.length > 0 && !activeTab) {
        setActiveTab(data[0].instrument)
        setContent(data[0].content)
      }
    } catch {
      alert('Failed to load parts')
    }
  }

  const handleTabChange = (instrument) => {
    setActiveTab(instrument)
    const part = parts.find((p) => p.instrument === instrument)
    setContent(part?.content || '')
  }

  const handleSave = async () => {
    if (!activeTab) return
    setSaving(true)
    try {
      const updated = await upsertSongPart(song.id, activeTab, content)
      setParts(updated)
    } catch {
      alert('Failed to save part')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!activeTab || !confirm(`Delete the ${activeTab} part?`)) return
    try {
      const updated = await deleteSongPart(song.id, activeTab)
      setParts(updated)
      if (updated.length > 0) {
        setActiveTab(updated[0].instrument)
        setContent(updated[0].content)
      } else {
        setActiveTab(null)
        setContent('')
      }
    } catch {
      alert('Failed to delete part')
    }
  }

  const handleAddInstrument = (name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (parts.some((p) => p.instrument === trimmed)) {
      handleTabChange(trimmed)
    } else {
      setActiveTab(trimmed)
      setContent('')
    }
    setShowAddInstrument(false)
    setNewInstrument('')
  }

  const unusedPresets = PRESET_INSTRUMENTS.filter(
    (i) => !parts.some((p) => p.instrument === i)
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="card p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">
            Parts - {song.title}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Instrument tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {parts.map((part) => (
            <button
              key={part.instrument}
              onClick={() => handleTabChange(part.instrument)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === part.instrument
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {part.instrument}
            </button>
          ))}
          {/* Show tab for new unsaved instrument */}
          {activeTab && !parts.some((p) => p.instrument === activeTab) && (
            <button
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-600 text-white"
            >
              {activeTab} *
            </button>
          )}
          <button
            onClick={() => setShowAddInstrument(true)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            + Add
          </button>
        </div>

        {showAddInstrument && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex flex-wrap gap-2 mb-2">
              {unusedPresets.map((name) => (
                <button
                  key={name}
                  onClick={() => handleAddInstrument(name)}
                  className="px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 hover:bg-indigo-200"
                >
                  {name}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newInstrument}
                onChange={(e) => setNewInstrument(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddInstrument(newInstrument)}
                placeholder="Custom instrument name..."
                className="input flex-1"
                autoFocus
              />
              <button
                onClick={() => handleAddInstrument(newInstrument)}
                className="btn btn-primary"
              >
                Add
              </button>
              <button
                onClick={() => { setShowAddInstrument(false); setNewInstrument('') }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Content editor */}
        {activeTab ? (
          <div className="flex-1 flex flex-col min-h-0">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="input flex-1 min-h-[200px] font-mono text-sm resize-y"
              placeholder={`Enter ${activeTab} part (chords, tab, notes...)`}
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary flex-1"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleDelete}
                className="btn btn-danger"
              >
                Delete Part
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <p>Select or add an instrument to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
}
