import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getSonglists, createSonglist, deleteSonglist } from '../api'
import { useBand } from '../contexts/BandContext'
import SonglistForm from '../components/SonglistForm'

export default function Songlists() {
  const { selectedBandId, selectedBand, bands } = useBand()
  const [songlists, setSonglists] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadSonglists()
  }, [selectedBandId])

  const loadSonglists = async () => {
    try {
      setLoading(true)
      const data = await getSonglists(selectedBandId)
      setSonglists(data)
      setError(null)
    } catch (err) {
      setError('Failed to load songlists')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (data) => {
    try {
      const newList = await createSonglist(data)
      setSonglists((prev) => [newList, ...prev])
      setShowForm(false)
    } catch (err) {
      alert('Failed to create songlist')
    }
  }

  const handleDelete = async (id, e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Delete this songlist?')) return

    try {
      await deleteSonglist(id)
      setSonglists((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      alert('Failed to delete songlist')
    }
  }

  const filteredLists = songlists.filter((list) => {
    if (filter === 'all') return true
    return list.type === filter
  })

  const formatDate = (dateStr) => {
    if (!dateStr) return null
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Songlists</h1>
          {selectedBand && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Filtered to {selectedBand.name}
            </p>
          )}
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">
          + New Songlist
        </button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {['all', 'gig', 'practice'].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === type
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
            }`}
          >
            {type === 'all' ? 'All' : type === 'gig' ? 'Gigs' : 'Practices'}
          </button>
        ))}
      </div>

      {songlists.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-gray-500 mb-4">
            No songlists yet. Create one for your next gig or practice!
          </p>
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            + New Songlist
          </button>
        </div>
      ) : filteredLists.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-gray-500">No {filter}s found.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLists.map((list) => (
            <Link
              key={list.id}
              to={`/songlists/${list.id}`}
              className="card p-4 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      list.type === 'gig'
                        ? 'bg-gig-100 text-gig-700 dark:bg-gig-900 dark:text-gig-300'
                        : 'bg-practice-100 text-practice-700 dark:bg-practice-900 dark:text-practice-300'
                    }`}
                  >
                    {list.type === 'gig' ? 'Gig' : 'Practice'}
                  </span>
                  {list.band_name && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">
                      {list.band_name}
                    </span>
                  )}
                </div>
                <button
                  onClick={(e) => handleDelete(list.id, e)}
                  className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>

              <h3 className="font-semibold text-lg mb-1">{list.name}</h3>

              {list.date && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  {formatDate(list.date)}
                </p>
              )}

              <p className="text-sm text-gray-600 dark:text-gray-300">
                {list.song_count} {list.song_count === 1 ? 'song' : 'songs'}
              </p>

              {list.notes && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 truncate">
                  {list.notes}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}

      {showForm && (
        <SonglistForm
          bands={bands}
          defaultBandId={selectedBandId}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
