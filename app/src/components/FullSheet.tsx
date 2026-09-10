import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  label: string
  /** Kopfbereich: hier greift die Zieh-Geste (nach unten oder nach rechts schließt) */
  header: ReactNode
  children: ReactNode
}

const CLOSE_MS = 260

/**
 * Vollbild-Overlay im iOS-Stil: fährt von unten ein, folgt beim Ziehen am Kopf dem Finger,
 * schließt animiert nach unten (oder springt zurück, wenn nicht weit genug gezogen).
 */
export function FullSheet({ open, onClose, label, header, children }: Props) {
  const [mounted, setMounted] = useState(open)
  const [closing, setClosing] = useState(false)
  const [drag, setDrag] = useState(0)
  const start = useRef<{ x: number; y: number; t: number } | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) { setMounted(true); setClosing(false); setDrag(0) }
    else if (mounted) {
      setClosing(true)
      const t = setTimeout(() => { setMounted(false); setClosing(false) }, CLOSE_MS)
      return () => clearTimeout(t)
    }
  }, [open, mounted])

  useEffect(() => {
    if (!mounted) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [mounted, onClose])

  if (!mounted) return null

  const gesture = {
    onTouchStart: (e: TouchEvent) => { start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() } },
    onTouchMove: (e: TouchEvent) => {
      if (!start.current) return
      const dy = e.touches[0].clientY - start.current.y
      const dx = e.touches[0].clientX - start.current.x
      if (dy > 0 && dy > Math.abs(dx)) setDrag(dy)
    },
    onTouchEnd: (e: TouchEvent) => {
      if (!start.current) return
      const dx = e.changedTouches[0].clientX - start.current.x
      const dy = e.changedTouches[0].clientY - start.current.y
      const fast = Date.now() - start.current.t < 300
      start.current = null
      if ((dy > 110 || (fast && dy > 40)) && dy > Math.abs(dx)) onClose()
      else if (dx > 90 && Math.abs(dy) < dx / 2) onClose()
      else setDrag(0)
    },
  }

  const dragging = drag > 0 && !closing
  return (
    <div
      ref={boxRef}
      role="dialog"
      aria-label={label}
      className={'fixed inset-0 z-50 flex flex-col bg-bg ' + (closing ? 'animate-sheet-out' : dragging ? '' : 'animate-sheet')}
      style={{
        paddingTop: 'var(--safe-top)',
        transform: dragging ? 'translateY(' + drag + 'px) scale(' + (1 - Math.min(drag, 400) / 4000) + ')' : undefined,
        transition: dragging ? 'none' : 'transform 220ms var(--ease-out)',
        borderRadius: dragging ? Math.min(drag / 4, 28) + 'px' : 0,
        overflow: 'hidden',
      }}
    >
      <header className="mx-auto w-full max-w-lg shrink-0 px-4" {...gesture}>
        <div className="pt-2"><span className="mx-auto block h-1.5 w-12 rounded-full bg-fill-strong" /></div>
        {header}
      </header>
      {children}
    </div>
  )
}
