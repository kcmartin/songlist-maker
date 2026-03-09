import { useEffect } from 'react'

export default function useSwipe(ref, { onSwipeLeft, onSwipeRight }) {
  useEffect(() => {
    const el = ref.current
    if (!el) return

    let startX = 0
    let startY = 0

    const handleTouchStart = (e) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
    }

    const handleTouchEnd = (e) => {
      const endX = e.changedTouches[0].clientX
      const endY = e.changedTouches[0].clientY
      const dx = endX - startX
      const dy = endY - startY

      // Only fire if horizontal movement is dominant and > 50px
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0 && onSwipeLeft) onSwipeLeft()
        if (dx > 0 && onSwipeRight) onSwipeRight()
      }
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [ref, onSwipeLeft, onSwipeRight])
}
