import { useState, useEffect } from 'react'

export default function SongForm({ song, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    notes: '',
    youtube_url: '',
    recording_url: '',
  })

  useEffect(() => {
    if (song) {
      setFormData({
        title: song.title || '',
        artist: song.artist || '',
        notes: song.notes || '',
        youtube_url: song.youtube_url || '',
        recording_url: song.recording_url || '',
      })
    }
  }, [song])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
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

          <div>
            <label className="block text-sm font-medium mb-1">
              Artist <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="artist"
              value={formData.artist}
              onChange={handleChange}
              className="input"
              required
            />
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
