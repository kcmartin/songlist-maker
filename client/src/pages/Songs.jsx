import { useState, useEffect } from 'react'
import { getSongs, createSong, updateSong, deleteSong } from '../api'
import SongForm from '../components/SongForm'

export default function Songs() {
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingSong, setEditingSong] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadSongs()
  }, [])

  const loadSongs = async () => {
    try {
      setLoading(true)
      const data = await getSongs()
      setSongs(data)
      setError(null)
    } catch (err) {
      setError('Failed to load songs')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (data) => {
    try {
      const newSong = await createSong(data)
      setSongs((prev) => [...prev, newSong].sort((a, b) =>
        `${a.artist}${a.title}`.localeCompare(`${b.artist}${b.title}`)
      ))
      setShowForm(false)
    } catch (err) {
      alert('Failed to create song')
    }
  }

  const handleUpdate = async (data) => {
    try {
      const updated = await updateSong(editingSong.id, data)
      setSongs((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s)).sort((a, b) =>
          `${a.artist}${a.title}`.localeCompare(`${b.artist}${b.title}`)
        )
      )
      setEditingSong(null)
    } catch (err) {
      alert('Failed to update song')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this song? It will be removed from all songlists.')) {
      return
    }
    try {
      await deleteSong(id)
      setSongs((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      alert('Failed to delete song')
    }
  }

  const filteredSongs = songs.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.artist.toLowerCase().includes(search.toLowerCase())
  )

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
        <h1 className="text-2xl font-bold">Songs</h1>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">
          + Add Song
        </button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search songs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input max-w-md"
        />
      </div>

      {songs.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-gray-500 mb-4">No songs yet. Add your first song!</p>
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            + Add Song
          </button>
        </div>
      ) : filteredSongs.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-gray-500">No songs match your search.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                    Artist
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300 hidden md:table-cell">
                    Notes
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                    Links
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredSongs.map((song) => (
                  <tr
                    key={song.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="px-4 py-3 font-medium">{song.title}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {song.artist}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden md:table-cell max-w-xs truncate">
                      {song.notes || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {song.youtube_url && (
                          <a
                            href={song.youtube_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-red-600 hover:text-red-700"
                            title="YouTube"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                            </svg>
                          </a>
                        )}
                        {song.recording_url && (
                          <a
                            href={song.recording_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-700"
                            title="Recording"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m2.828-9.9a9 9 0 0112.728 0" />
                            </svg>
                          </a>
                        )}
                        {!song.youtube_url && !song.recording_url && (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingSong(song)}
                          className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(song.id)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(showForm || editingSong) && (
        <SongForm
          song={editingSong}
          onSubmit={editingSong ? handleUpdate : handleCreate}
          onCancel={() => {
            setShowForm(false)
            setEditingSong(null)
          }}
        />
      )}
    </div>
  )
}
