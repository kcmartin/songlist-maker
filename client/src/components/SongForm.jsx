import { useState, useEffect, useRef } from 'react'
import { getSongs } from '../api'

export default function SongForm({ song, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    notes: '',
    youtube_url: '',
    recording_url: '',
    lyrics_url: '',
    duration: '',
  })

  const [artists, setArtists] = useState([])
  const [showArtists, setShowArtists] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const artistRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    getSongs().then(songs => {
      const unique = [...new Set(songs.map(s => s.artist).filter(Boolean))].sort()
      setArtists(unique)
    }).catch(() => {})
  }, [])

  const filteredArtists = formData.artist
    ? artists.filter(a => a.toLowerCase().includes(formData.artist.toLowerCase()) && a !== formData.artist)
    : artists

  useEffect(() => {
    if (song) {
      setFormData({
        title: song.title || '',
        artist: song.artist || '',
        notes: song.notes || '',
        youtube_url: song.youtube_url || '',
        recording_url: song.recording_url || '',
        lyrics_url: song.lyrics_url || '',
        duration: song.duration ? formatDuration(song.duration) : '',
      })
    }
  }, [song])

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const parseDuration = (str) => {
    if (!str) return null
    const parts = str.split(':')
    if (parts.length === 2) {
      const mins = parseInt(parts[0], 10) || 0
      const secs = parseInt(parts[1], 10) || 0
      return mins * 60 + secs
    }
    const mins = parseInt(str, 10)
    return isNaN(mins) ? null : mins * 60
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      duration: parseDuration(formData.duration),
    })
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {song ? 'Edit Song' : 'Add Song'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="input"
              required
              autoFocus
            />
          </div>

          <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium mb-1">
              Artist <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="artist"
              ref={artistRef}
              value={formData.artist}
              onChange={(e) => {
                handleChange(e)
                setShowArtists(true)
                setHighlightedIndex(-1)
              }}
              onFocus={() => setShowArtists(true)}
              onBlur={(e) => {
                if (!dropdownRef.current?.contains(e.relatedTarget)) {
                  setTimeout(() => setShowArtists(false), 150)
                }
              }}
              onKeyDown={(e) => {
                if (!showArtists || filteredArtists.length === 0) return
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setHighlightedIndex(i => Math.min(i + 1, filteredArtists.length - 1))
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setHighlightedIndex(i => Math.max(i - 1, 0))
                } else if (e.key === 'Enter' && highlightedIndex >= 0) {
                  e.preventDefault()
                  setFormData(prev => ({ ...prev, artist: filteredArtists[highlightedIndex] }))
                  setShowArtists(false)
                } else if (e.key === 'Escape') {
                  setShowArtists(false)
                }
              }}
              className="input"
              required
              autoComplete="off"
            />
            {showArtists && filteredArtists.length > 0 && (
              <ul className="absolute z-50 w-full mt-1 max-h-40 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
                {filteredArtists.map((artist, i) => (
                  <li
                    key={artist}
                    className={`px-3 py-2 cursor-pointer text-sm ${
                      i === highlightedIndex
                        ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    onMouseDown={() => {
                      setFormData(prev => ({ ...prev, artist }))
                      setShowArtists(false)
                    }}
                  >
                    {artist}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="input min-h-[80px]"
              placeholder="Key, tempo, arrangement notes..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              YouTube URL
            </label>
            <input
              type="url"
              name="youtube_url"
              value={formData.youtube_url}
              onChange={handleChange}
              className="input"
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Recording URL
            </label>
            <input
              type="url"
              name="recording_url"
              value={formData.recording_url}
              onChange={handleChange}
              className="input"
              placeholder="Link to band recording..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Lyrics URL
            </label>
            <input
              type="url"
              name="lyrics_url"
              value={formData.lyrics_url}
              onChange={handleChange}
              className="input"
              placeholder="Link to lyrics..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Duration
            </label>
            <input
              type="text"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              className="input"
              placeholder="3:30"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn btn-primary flex-1">
              {song ? 'Save Changes' : 'Add Song'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
