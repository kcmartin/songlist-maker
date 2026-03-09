import { useState, useEffect } from 'react'
import { getSonglistCheatsheet } from '../api'

const PRESET_INSTRUMENTS = ['Bass', 'Guitar', 'Keys', 'Vocals', 'Drums']

export default function CheatSheetModal({ songlist, onClose }) {
  const [instrument, setInstrument] = useState('')
  const [customInstrument, setCustomInstrument] = useState('')
  const [cheatsheet, setCheatsheet] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleLoad = async (inst) => {
    const name = inst || instrument
    if (!name) return
    setInstrument(name)
    setLoading(true)
    try {
      const data = await getSonglistCheatsheet(songlist.id, name)
      setCheatsheet(data)
    } catch {
      alert('Failed to load cheat sheet')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    if (!cheatsheet) return
    const printWindow = window.open('', '_blank')
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${songlist.name} - ${instrument} Cheat Sheet</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
          }
          h1 { margin-bottom: 4px; font-size: 22px; }
          h2 { color: #666; font-size: 16px; margin-bottom: 20px; }
          .song { margin-bottom: 24px; page-break-inside: avoid; }
          .song-header { font-weight: bold; font-size: 16px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 8px; }
          .song-key { color: #7c3aed; font-size: 14px; font-weight: 600; margin-left: 8px; }
          .song-artist { color: #666; font-size: 14px; font-weight: normal; }
          .part-content { font-family: 'Courier New', monospace; white-space: pre-wrap; font-size: 13px; line-height: 1.5; background: #f9f9f9; padding: 8px; border-radius: 4px; }
          .no-part { color: #999; font-style: italic; font-size: 13px; }
          @media print { body { padding: 0; } .song { page-break-inside: avoid; } }
        </style>
      </head>
      <body>
        <h1>${songlist.name}</h1>
        <h2>${instrument} Cheat Sheet</h2>
        ${cheatsheet.songs.map((song, i) => `
          <div class="song">
            <div class="song-header">
              ${i + 1}. ${song.title}${song.key ? `<span class="song-key">[${song.key}]</span>` : ''}
              <span class="song-artist"> - ${song.artist}</span>
            </div>
            ${song.part_content
              ? `<div class="part-content">${song.part_content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`
              : '<div class="no-part">No part written</div>'
            }
          </div>
        `).join('')}
      </body>
      </html>
    `
    printWindow.document.write(content)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="card p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Cheat Sheet</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Instrument selection */}
        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-2">Select instrument:</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {PRESET_INSTRUMENTS.map((name) => (
              <button
                key={name}
                onClick={() => handleLoad(name)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  instrument === name
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={customInstrument}
              onChange={(e) => setCustomInstrument(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customInstrument.trim()) {
                  handleLoad(customInstrument.trim())
                  setCustomInstrument('')
                }
              }}
              placeholder="Other instrument..."
              className="input flex-1"
            />
            <button
              onClick={() => {
                if (customInstrument.trim()) {
                  handleLoad(customInstrument.trim())
                  setCustomInstrument('')
                }
              }}
              className="btn btn-secondary"
            >
              Load
            </button>
          </div>
        </div>

        {/* Results */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
          </div>
        )}

        {cheatsheet && !loading && (
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {cheatsheet.songs.map((song, i) => (
              <div key={song.id} className="border dark:border-gray-700 rounded-lg p-3">
                <div className="font-medium mb-1">
                  {i + 1}. {song.title}
                  {song.key && (
                    <span className="ml-2 text-sm text-purple-600 dark:text-purple-400 font-semibold">
                      [{song.key}]
                    </span>
                  )}
                  <span className="text-gray-500 text-sm ml-2">- {song.artist}</span>
                </div>
                {song.part_content ? (
                  <pre className="text-sm font-mono bg-gray-50 dark:bg-gray-800 p-2 rounded whitespace-pre-wrap">
                    {song.part_content}
                  </pre>
                ) : (
                  <p className="text-sm text-gray-400 italic">No part written</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {cheatsheet && (
            <button onClick={handlePrint} className="btn btn-primary flex-1">
              Print Cheat Sheet
            </button>
          )}
          <button onClick={onClose} className="btn btn-secondary flex-1">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
