import { useState } from 'react'

export default function PrintModal({ songlist, onClose }) {
  const [options, setOptions] = useState({
    showNumbers: true,
    showArtist: true,
    showNotes: false,
    showLinks: false,
  })

  const handleToggle = (key) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const generateTextContent = () => {
    let content = `${songlist.name}\n`
    if (songlist.date) {
      content += `${new Date(songlist.date + 'T00:00:00').toLocaleDateString()}\n`
    }
    content += '\n'

    songlist.songs?.forEach((song, index) => {
      let line = ''
      if (options.showNumbers) {
        line += `${index + 1}. `
      }
      line += song.title
      if (options.showArtist) {
        line += ` - ${song.artist}`
      }
      content += line + '\n'
      if (options.showNotes && song.notes) {
        content += `   Notes: ${song.notes}\n`
      }
      if (options.showLinks) {
        if (song.youtube_url) {
          content += `   YouTube: ${song.youtube_url}\n`
        }
        if (song.recording_url) {
          content += `   Recording: ${song.recording_url}\n`
        }
      }
    })

    return content
  }

  const generateJsonContent = () => {
    return JSON.stringify({
      name: songlist.name,
      type: songlist.type,
      date: songlist.date,
      notes: songlist.notes,
      songs: songlist.songs?.map((song, index) => ({
        position: index + 1,
        title: song.title,
        artist: song.artist,
        notes: song.notes,
        youtube_url: song.youtube_url,
        recording_url: song.recording_url,
      })),
    }, null, 2)
  }

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExportText = () => {
    const content = generateTextContent()
    const filename = `${songlist.name.replace(/[^a-z0-9]/gi, '_')}.txt`
    downloadFile(content, filename, 'text/plain')
  }

  const handleExportJson = () => {
    const content = generateJsonContent()
    const filename = `${songlist.name.replace(/[^a-z0-9]/gi, '_')}.json`
    downloadFile(content, filename, 'application/json')
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${songlist.name}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
          }
          h1 {
            margin-bottom: 4px;
            font-size: 24px;
          }
          .date {
            color: #666;
            margin-bottom: 20px;
          }
          .song-list {
            list-style: ${options.showNumbers ? 'decimal' : 'none'};
            padding-left: ${options.showNumbers ? '24px' : '0'};
          }
          .song-item {
            padding: 8px 0;
            border-bottom: 1px solid #eee;
          }
          .song-title {
            font-weight: 500;
          }
          .song-artist {
            color: #666;
          }
          .song-notes {
            font-size: 14px;
            color: #888;
            margin-top: 4px;
            font-style: italic;
          }
          .song-links {
            font-size: 12px;
            color: #666;
            margin-top: 4px;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <h1>${songlist.name}</h1>
        ${songlist.date ? `<p class="date">${new Date(songlist.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>` : ''}
        <ol class="song-list">
          ${songlist.songs?.map((song) => `
            <li class="song-item">
              <span class="song-title">${song.title}</span>${options.showArtist ? ` <span class="song-artist">- ${song.artist}</span>` : ''}
              ${options.showNotes && song.notes ? `<div class="song-notes">${song.notes}</div>` : ''}
              ${options.showLinks && (song.youtube_url || song.recording_url) ? `
                <div class="song-links">
                  ${song.youtube_url ? `YouTube: ${song.youtube_url}` : ''}
                  ${song.youtube_url && song.recording_url ? ' | ' : ''}
                  ${song.recording_url ? `Recording: ${song.recording_url}` : ''}
                </div>
              ` : ''}
            </li>
          `).join('') || ''}
        </ol>
      </body>
      </html>
    `
    printWindow.document.write(content)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="card p-6 w-full max-w-lg max-h-[90vh] flex flex-col">
        <h2 className="text-xl font-bold mb-4">Print / Export</h2>

        <div className="space-y-3 mb-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={options.showNumbers}
              onChange={() => handleToggle('showNumbers')}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Show song numbers</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={options.showArtist}
              onChange={() => handleToggle('showArtist')}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Show artist</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={options.showNotes}
              onChange={() => handleToggle('showNotes')}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Show notes</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={options.showLinks}
              onChange={() => handleToggle('showLinks')}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Show links as text</span>
          </label>
        </div>

        <div className="border dark:border-gray-700 rounded-lg p-4 mb-6 bg-gray-50 dark:bg-gray-900 max-h-48 overflow-y-auto">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Preview</p>
          <div className="text-sm">
            <p className="font-bold">{songlist.name}</p>
            {songlist.date && (
              <p className="text-gray-500 text-xs mb-2">
                {new Date(songlist.date + 'T00:00:00').toLocaleDateString()}
              </p>
            )}
            <ol className={options.showNumbers ? 'list-decimal list-inside' : 'list-none'}>
              {songlist.songs?.slice(0, 5).map((song, index) => (
                <li key={song.id} className="py-1">
                  <span className="font-medium">{song.title}</span>
                  {options.showArtist && (
                    <span className="text-gray-500"> - {song.artist}</span>
                  )}
                  {options.showNotes && song.notes && (
                    <p className="text-xs text-gray-400 ml-4 italic">{song.notes}</p>
                  )}
                  {options.showLinks && (song.youtube_url || song.recording_url) && (
                    <p className="text-xs text-gray-400 ml-4">
                      {song.youtube_url && `YouTube: ${song.youtube_url}`}
                      {song.recording_url && ` Recording: ${song.recording_url}`}
                    </p>
                  )}
                </li>
              ))}
              {songlist.songs?.length > 5 && (
                <li className="text-gray-400">...and {songlist.songs.length - 5} more</li>
              )}
            </ol>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <button onClick={handlePrint} className="btn btn-primary">
            Print
          </button>
          <button onClick={handleExportText} className="btn btn-secondary">
            Export .txt
          </button>
          <button onClick={handleExportJson} className="btn btn-secondary">
            Export .json
          </button>
        </div>

        <button onClick={onClose} className="btn btn-secondary w-full">
          Close
        </button>
      </div>
    </div>
  )
}
