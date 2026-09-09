import { addMonths, format, getISOWeek } from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useCallback, useState } from 'react'
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

export function CalendarScreen() {
  const [view, setViewState] = useState<View>(() => (readView() ?? 'day'))
  const [day, setDay] = useState(todayKey())
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

  return (
    <div className="mx-auto max-w-lg px-4 animate-fade-up">
      <header className="flex items-end justify-between pb-2 pt-4">
        <div>
          <p className="text-[13px] font-medium text-text-2">{subtitle}</p>
          <h1 className="font-display text-[32px] font-bold leading-tight tracking-tight">{title}</h1>
        </div>
        <div className="flex items-center gap-1 pb-1">
          <button aria-label="Zurück" onClick={() => step(-1)} className="press grid h-9 w-9 place-items-center rounded-full bg-elev shadow-sm"><ChevronLeft size={18} /></button>
          <button onClick={() => setDay(todayKey())} className="press rounded-full bg-elev px-3 py-2 text-[13px] font-semibold shadow-sm">Heute</button>
          <button aria-label="Weiter" onClick={() => step(1)} className="press grid h-9 w-9 place-items-center rounded-full bg-elev shadow-sm"><ChevronRight size={18} /></button>
        </div>
      </header>

      <Segmented options={VIEWS} value={view} onChange={setView} />

      <div {...swipe}>
        {view === 'day' && <DayView day={day} events={events} onTapSlot={(min) => setDraft(newDraft(day, min))} onTapEvent={edit} />}
        {view === 'week' && <WeekView day={day} events={events} onSelectDay={(d) => { setDay(d); setView('day') }} onAdd={addOnDay} onTapEvent={edit} />}
        {view === 'month' && <MonthView day={day} events={events} onSelectDay={setDay} onAdd={addOnDay} onTapEvent={edit} />}
      </div>

      <button
        aria-label="Neuer Termin"
        onClick={() => addOnDay(day)}
        className="press fixed right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-accent text-on-accent shadow-lg"
        style={{ bottom: 'calc(var(--tabbar-h) + var(--safe-bottom) + 16px)' }}
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      <EventSheet draft={draft} onClose={() => setDraft(null)} onSave={onSave} onDelete={onDelete} />
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
