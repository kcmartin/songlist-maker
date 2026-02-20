import { useState, useEffect } from 'react'

export default function BandForm({ band, onSubmit, onCancel }) {
  const [name, setName] = useState('')

  useEffect(() => {
    if (band) {
      setName(band.name || '')
    }
  }, [band])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({ name })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="card p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {band ? 'Edit Band' : 'New Band'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Band Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              required
              autoFocus
              placeholder="e.g., The Rockers"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn btn-primary flex-1">
              {band ? 'Save Changes' : 'Create Band'}
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
