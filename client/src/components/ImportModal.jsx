import { useState, useRef } from 'react'
import { createSong } from '../api'

const KNOWN_COLUMNS = ['title', 'artist', 'duration', 'key', 'notes', 'youtube_url', 'recording_url', 'lyrics_url']

function parseDuration(value) {
  if (!value) return null
  const trimmed = value.trim()
  const match = trimmed.match(/^(\d+):(\d{1,2})$/)
  if (match) return parseInt(match[1]) * 60 + parseInt(match[2])
  const num = parseInt(trimmed)
  return isNaN(num) ? null : num
}

function parseCSVLine(line) {
  const fields = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        current += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',' || ch === '\t') {
      fields.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current.trim())
  return fields
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim())
  const rows = lines.slice(1).map((line) => {
    const fields = parseCSVLine(line)
    const row = {}
    headers.forEach((h, i) => {
      if (KNOWN_COLUMNS.includes(h)) {
        row[h] = fields[i] || ''
      }
    })
    return row
  })

  return { headers: headers.filter((h) => KNOWN_COLUMNS.includes(h)), rows }
}

export default function ImportModal({ onClose, onComplete }) {
  const [parsed, setParsed] = useState(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0, imported: 0, skipped: 0 })
  const [finished, setFinished] = useState(false)
  const fileRef = useRef()

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = parseCSV(ev.target.result)
      setParsed(result)
    }
    reader.readAsText(file)
  }

  const isRowValid = (row) => row.title?.trim() && row.artist?.trim()

  const handleImport = async () => {
    if (!parsed) return
    const validRows = parsed.rows.filter(isRowValid)
    setImporting(true)
    setProgress({ done: 0, total: validRows.length, imported: 0, skipped: 0 })

    let imported = 0
    let skipped = 0
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i]
      try {
        const songData = {
          title: row.title.trim(),
          artist: row.artist.trim(),
          key: row.key?.trim() || null,
          notes: row.notes?.trim() || null,
          youtube_url: row.youtube_url?.trim() || null,
          recording_url: row.recording_url?.trim() || null,
          lyrics_url: row.lyrics_url?.trim() || null,
          duration: parseDuration(row.duration) || null,
        }
        await createSong(songData)
        imported++
      } catch {
        skipped++
      }
      setProgress({ done: i + 1, total: validRows.length, imported, skipped })
    }

    const totalSkipped = skipped + parsed.rows.filter((r) => !isRowValid(r)).length
    setProgress((p) => ({ ...p, skipped: totalSkipped }))
    setFinished(true)
    setImporting(false)
  }

  const validCount = parsed ? parsed.rows.filter(isRowValid).length : 0
  const invalidCount = parsed ? parsed.rows.length - validCount : 0

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">Import Songs from CSV</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl">
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!parsed && !finished && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Upload a CSV or TSV file. First row must be headers. Required columns: <strong>title</strong>, <strong>artist</strong>.
                Optional: duration (mm:ss), key, notes, youtube_url, recording_url, lyrics_url.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleFile}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900 dark:file:text-indigo-300"
              />
            </div>
          )}

          {parsed && !importing && !finished && (
            <div>
              <p className="text-sm mb-3">
                Found <strong>{parsed.rows.length}</strong> rows. <span className="text-green-600">{validCount} valid</span>
                {invalidCount > 0 && <span className="text-red-600 ml-1">({invalidCount} missing title/artist)</span>}
              </p>
              <div className="overflow-x-auto border rounded dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      {parsed.headers.map((h) => (
                        <th key={h} className="px-3 py-2 text-left capitalize">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {parsed.rows.map((row, i) => {
                      const valid = isRowValid(row)
                      return (
                        <tr key={i} className={valid ? '' : 'bg-red-50 dark:bg-red-900/20'}>
                          <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                          {parsed.headers.map((h) => (
                            <td key={h} className="px-3 py-1.5 truncate max-w-[150px]">{row[h] || ''}</td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {importing && (
            <div>
              <p className="text-sm mb-2">Importing... {progress.done} / {progress.total}</p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-indigo-600 h-3 rounded-full transition-all"
                  style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {finished && (
            <div className="text-center py-4">
              <p className="text-lg font-semibold text-green-600 mb-1">Import Complete</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {progress.imported} imported{progress.skipped > 0 ? `, ${progress.skipped} skipped` : ''}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          {finished ? (
            <button
              onClick={() => { onComplete(); onClose() }}
              className="btn btn-primary"
            >
              Done
            </button>
          ) : (
            <>
              <button onClick={onClose} className="btn">Cancel</button>
              {parsed && (
                <button
                  onClick={handleImport}
                  disabled={validCount === 0 || importing}
                  className="btn btn-primary disabled:opacity-50"
                >
                  Import {validCount} Songs
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
