import { useEffect, useRef } from 'react'

export default function useWakeLock() {
  const wakeLock = useRef(null)

  const acquire = async () => {
    if (!('wakeLock' in navigator)) return
    try {
      wakeLock.current = await navigator.wakeLock.request('screen')
    } catch {
      // Silently fail — user may have navigated away or browser denied
    }
  }

  const release = async () => {
    if (wakeLock.current) {
      try {
        await wakeLock.current.release()
      } catch {
        // Already released
      }
      wakeLock.current = null
    }
  }

  useEffect(() => {
    acquire()

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        acquire()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      release()
    }
  }, [])
}
