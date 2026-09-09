import { useRef, type TouchEvent } from 'react'

/** Horizontale Wischgeste (links/rechts), ignoriert vertikales Scrollen */
export function useSwipe(onLeft: () => void, onRight: () => void, threshold = 56) {
  const start = useRef<{ x: number; y: number } | null>(null)
  return {
    onTouchStart: (e: TouchEvent) => {
      start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    },
    onTouchEnd: (e: TouchEvent) => {
      if (!start.current) return
      const dx = e.changedTouches[0].clientX - start.current.x
      const dy = e.changedTouches[0].clientY - start.current.y
      start.current = null
      if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.5) return
      if (dx < 0) onLeft()
      else onRight()
    },
  }
}
