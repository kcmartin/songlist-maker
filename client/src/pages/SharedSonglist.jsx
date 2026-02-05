import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getSharedSonglist } from '../api'

export default function SharedSonglist() {
  const { token } = useParams()
  const [songlist, setSonglist] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadSonglist()
  }, [token])

  const loadSonglist = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getSharedSonglist(token)
      setSonglist(data)
    } catch (err) {
      setError('Songlist not found or no longer shared')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="card p-8 text-center max-w-md">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Songlist Not Found
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {error}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                songlist.type === 'gig'
                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              }`}
            >
              {songlist.type === 'gig' ? 'Gig' : 'Practice'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            {songlist.name}
          </h1>
          {songlist.date && (
            <p className="text-gray-600 dark:text-gray-400">
              {formatDate(songlist.date)}
            </p>
          )}
          {songlist.notes && (
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              {songlist.notes}
            </p>
          )}
        </div>

        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Songs ({songlist.songs?.length || 0})
        </h2>

        {songlist.songs?.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-gray-500">No songs in this list.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {songlist.songs?.map((song, index) => (
              <div
                key={song.id}
                className="flex items-center gap-3"
              >
                <span className="w-6 text-center text-gray-400 font-medium">
                  {index + 1}
                </span>
                <div className="flex-1 card p-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {song.title}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {song.artist}
                      </p>
                    </div>
                    {song.youtube_url && (
                      <a
                        href={song.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-600 hover:text-red-700 ml-2"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center text-sm text-gray-400">
          Shared via Songlist Maker
        </div>
      </div>
    </div>
  )
}
