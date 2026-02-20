import { useState, useEffect } from 'react'

export default function SonglistForm({ songlist, bands, defaultBandId, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'practice',
    date: '',
    notes: '',
    band_id: defaultBandId || '',
  })

  useEffect(() => {
    if (songlist) {
      setFormData({
        name: songlist.name || '',
        type: songlist.type || 'practice',
        date: songlist.date || '',
        notes: songlist.notes || '',
        band_id: songlist.band_id || '',
      })
    }
  }, [songlist])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      band_id: formData.band_id ? Number(formData.band_id) : null,
    })
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="card p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {songlist ? 'Edit Songlist' : 'New Songlist'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input"
              required
              autoFocus
              placeholder="e.g., Friday Night at The Venue"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Type <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="practice"
                  checked={formData.type === 'practice'}
                  onChange={handleChange}
                  className="w-4 h-4 text-practice-600"
                />
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-practice-500"></span>
                  Practice
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="gig"
                  checked={formData.type === 'gig'}
                  onChange={handleChange}
                  className="w-4 h-4 text-gig-600"
                />
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-gig-500"></span>
                  Gig
                </span>
              </label>
            </div>
          </div>

          {bands && bands.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1">Band</label>
              <select
                name="band_id"
                value={formData.band_id}
                onChange={handleChange}
                className="input"
              >
                <option value="">No band</option>
                {bands.map((band) => (
                  <option key={band.id} value={band.id}>
                    {band.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="input min-h-[80px]"
              placeholder="Venue, set times, special notes..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn btn-primary flex-1">
              {songlist ? 'Save Changes' : 'Create Songlist'}
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
