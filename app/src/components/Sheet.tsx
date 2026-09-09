import { useEffect, type ReactNode } from 'react'

type Props = { open: boolean; onClose: () => void; title?: string; children: ReactNode; right?: ReactNode }

/** Bottom-Sheet im iOS-Stil: Backdrop, von unten einfahrend, Safe-Area unten */
export function Sheet({ open, onClose, title, children, right }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Schließen" onClick={onClose} className="absolute inset-0 bg-black/40 animate-backdrop" />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-lg rounded-t-xl bg-elev shadow-lg animate-sheet pb-safe">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-fill-strong" />
        {(title || right) && (
          <div className="flex items-center justify-between px-5 pb-2 pt-3">
            <h2 className="text-[20px] font-bold tracking-tight">{title}</h2>
            {right}
          </div>
        )}
        <div className="max-h-[78vh] overflow-y-auto px-5 pb-5">{children}</div>
      </div>
    </div>
  )
}
