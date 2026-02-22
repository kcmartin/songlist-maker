import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getInviteInfo, acceptInvite } from '../api'

export default function BandInvite() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [invite, setInvite] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    if (authLoading) return

    if (!isAuthenticated) {
      // Store the invite URL so we can return after login
      sessionStorage.setItem('returnTo', `/invite/${token}`)
      navigate('/login')
      return
    }

    async function fetchInvite() {
      try {
        const data = await getInviteInfo(token)
        setInvite(data)
      } catch {
        setError('This invite link is invalid or has expired.')
      } finally {
        setLoading(false)
      }
    }
    fetchInvite()
  }, [token, isAuthenticated, authLoading, navigate])

  const handleAccept = async () => {
    setJoining(true)
    try {
      const result = await acceptInvite(token)
      navigate(`/bands`)
    } catch {
      setError('Failed to join band. Please try again.')
      setJoining(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="card p-8 text-center max-w-sm">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button onClick={() => navigate('/')} className="btn btn-primary">
            Go Home
          </button>
        </div>
      </div>
    )
  }

  if (invite?.already_member) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="card p-8 text-center max-w-sm">
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
            Already a member
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            You're already a member of <strong>{invite.band_name}</strong>.
          </p>
          <button onClick={() => navigate('/bands')} className="btn btn-primary">
            Go to Bands
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="card p-8 text-center max-w-sm">
        <svg
          className="w-12 h-12 text-indigo-600 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
          Band Invite
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          You've been invited to join <strong className="text-gray-900 dark:text-white">{invite?.band_name}</strong>
        </p>
        <button
          onClick={handleAccept}
          disabled={joining}
          className="btn btn-primary w-full"
        >
          {joining ? 'Joining...' : 'Join Band'}
        </button>
      </div>
    </div>
  )
}
