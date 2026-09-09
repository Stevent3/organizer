import { addMonths, format, getISOWeek } from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronDown, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react'
import { DayView } from '../components/calendar/DayView'
import { EventSheet, type Draft } from '../components/calendar/EventSheet'
import { MonthView } from '../components/calendar/MonthView'
import { WeekView } from '../components/calendar/WeekView'
import { Segmented } from '../components/Segmented'
import { eventsOnDay, nextFreeSlot } from '../lib/calendar'
import type { EventItem } from '../lib/model'
import { addDaysKey, fromDateKey, minToTime, toDateKey, todayKey, weekStartKey } from '../lib/time'
import { useSwipe } from '../lib/useSwipe'
import { useStore } from '../store/useStore'

type View = 'day' | 'week' | 'month'
const VIEWS: { id: View; label: string }[] = [
  { id: 'day', label: 'Tag' },
  { id: 'week', label: 'Woche' },
  { id: 'month', label: 'Monat' },
]
const VIEW_KEY = 'organizer_v8_calview'

type Props = {
  /** Vollbild-Overlay: Timeline füllt die Höhe, Schließen per Handle, Knopf oder Wischen nach unten/rechts */
  overlay?: boolean
  onClose?: () => void
  initialDay?: string
}

export function CalendarScreen() {
  return <CalendarView />
}

export function CalendarView({ overlay = false, onClose, initialDay }: Props) {
  const [view, setViewState] = useState<View>(() => readView() ?? 'day')
  const [day, setDay] = useState(initialDay ?? todayKey())
  const [draft, setDraft] = useState<Draft | null>(null)
  const events = useStore((s) => s.events)
  const addEvent = useStore((s) => s.addEvent)
  const updateEvent = useStore((s) => s.updateEvent)
  const deleteEvent = useStore((s) => s.deleteEvent)

  const setView = (v: View) => {
    setViewState(v)
    try { localStorage.setItem(VIEW_KEY, v) } catch { /* privat/blockiert */ }
  }

  const step = useCallback((dir: 1 | -1) => {
    setDay((d) => {
      if (view === 'day') return addDaysKey(d, dir)
      if (view === 'week') return addDaysKey(d, 7 * dir)
      return toDateKey(addMonths(fromDateKey(d), dir))
    })
  }, [view])
  const swipe = useSwipe(() => step(1), () => step(-1))

  const newDraft = (d: string, min?: number): Draft => ({
    date: d,
    allDay: min == null,
    time: min == null ? undefined : minToTime(min),
    end: min == null ? undefined : minToTime(Math.min(min + 60, 1439)),
    text: '',
    color: 'accent',
    source: 'manual',
  })

  const addOnDay = (d: string) => {
    const now = new Date()
    const from = d === todayKey() ? now.getHours() * 60 + now.getMinutes() : 9 * 60
    setDraft(newDraft(d, nextFreeSlot(eventsOnDay(events, d), from)))
  }

  const onSave = (d: Draft) => {
    if (d.id) updateEvent(d.id, { ...d })
    else addEvent(d)
    setDraft(null)
  }
  const onDelete = (id: string) => {
    deleteEvent(id)
    setDraft(null)
  }
  const edit = (ev: EventItem) => setDraft({ ...ev })

  const date = fromDateKey(day)
  const title =
    view === 'day' ? format(date, 'EEEE', { locale: de })
    : view === 'week' ? 'KW ' + getISOWeek(date)
    : format(date, 'MMMM', { locale: de })
  const subtitle =
    view === 'day' ? format(date, 'd. MMMM yyyy', { locale: de })
    : view === 'week' ? format(fromDateKey(weekStartKey(day)), 'd. MMM', { locale: de }) + ' bis ' + format(fromDateKey(addDaysKey(weekStartKey(day), 6)), 'd. MMM yyyy', { locale: de })
    : format(date, 'yyyy')

  const closeGesture = useCloseGesture(onClose)

  return (
    <div className={'mx-auto max-w-lg px-4 ' + (overlay ? 'flex h-full flex-col' : 'animate-fade-up')}>
      <header className="shrink-0" {...(overlay ? closeGesture : {})}>
        {overlay && (
          <div className="flex items-center justify-between pt-2">
            <span className="mx-auto h-1.5 w-12 rounded-full bg-fill-strong" />
          </div>
        )}
        <div className="flex items-end justify-between pb-2 pt-3">
          <div>
            <p className="text-[13px] font-medium text-text-2">{subtitle}</p>
            <h1 className="font-display text-[30px] font-bold leading-tight tracking-tight">{title}</h1>
          </div>
          <div className="flex items-center gap-1 pb-1">
            <button aria-label="Zurück" onClick={() => step(-1)} className="press grid h-9 w-9 place-items-center rounded-full bg-elev shadow-sm"><ChevronLeft size={18} /></button>
            <button onClick={() => setDay(todayKey())} className="press rounded-full bg-elev px-3 py-2 text-[13px] font-semibold shadow-sm">Heute</button>
            <button aria-label="Weiter" onClick={() => step(1)} className="press grid h-9 w-9 place-items-center rounded-full bg-elev shadow-sm"><ChevronRight size={18} /></button>
            {overlay && (
              <button aria-label="Kalender schließen" onClick={onClose} className="press ml-1 grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-accent"><ChevronDown size={20} strokeWidth={2.5} /></button>
            )}
          </div>
        </div>
        <Segmented options={VIEWS} value={view} onChange={setView} />
      </header>

      <div {...swipe} className={overlay ? 'no-scrollbar min-h-0 flex-1 overflow-y-auto pb-24' : ''}>
        {view === 'day' && <DayView day={day} events={events} fill={overlay} onTapSlot={(min) => setDraft(newDraft(day, min))} onTapEvent={edit} />}
        {view === 'week' && <WeekView day={day} events={events} onSelectDay={(d) => { setDay(d); setView('day') }} onAdd={addOnDay} onTapEvent={edit} />}
        {view === 'month' && <MonthView day={day} events={events} onSelectDay={setDay} onAdd={addOnDay} onTapEvent={edit} />}
      </div>

      <button
        aria-label="Neuer Termin"
        onClick={() => addOnDay(day)}
        className={'press fixed z-30 grid h-14 w-14 place-items-center rounded-full bg-accent text-on-accent shadow-lg ' + (overlay ? 'right-5' : 'right-[88px]')}
        style={{ bottom: overlay ? 'calc(var(--safe-bottom) + 20px)' : 'calc(var(--tabbar-h) + var(--safe-bottom) + 16px)' }}
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      <EventSheet draft={draft} onClose={() => setDraft(null)} onSave={onSave} onDelete={onDelete} />
    </div>
  )
}

/** Wischen nach unten oder nach rechts auf dem Kopfbereich schließt das Overlay */
function useCloseGesture(onClose?: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null)
  return {
    onTouchStart: (e: TouchEvent) => { start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } },
    onTouchEnd: (e: TouchEvent) => {
      if (!start.current || !onClose) return
      const dx = e.changedTouches[0].clientX - start.current.x
      const dy = e.changedTouches[0].clientY - start.current.y
      start.current = null
      if (dy > 70 && dy > Math.abs(dx)) onClose()
      else if (dx > 90 && Math.abs(dy) < dx / 2) onClose()
    },
  }
}

/** Vollbild-Kalender, fährt von unten ein und deckt die Tab-Leiste ab */
export function CalendarOverlay({ open, onClose, initialDay }: { open: boolean; onClose: () => void; initialDay?: string }) {
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
    <div className="fixed inset-0 z-50 bg-bg animate-sheet" role="dialog" aria-label="Kalender" style={{ paddingTop: 'var(--safe-top)' }}>
      <CalendarView overlay onClose={onClose} initialDay={initialDay} />
    </div>
  )
}

function readView(): View | null {
  try {
    const v = localStorage.getItem(VIEW_KEY)
    return v === 'day' || v === 'week' || v === 'month' ? v : null
  } catch {
    return null
  }
}
