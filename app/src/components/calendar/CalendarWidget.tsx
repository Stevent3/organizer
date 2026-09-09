import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronRight } from 'lucide-react'
import { useMemo } from 'react'
import { eventsOnDay, timedRange } from '../../lib/calendar'
import { colorVar } from '../../lib/colors'
import type { EventItem } from '../../lib/model'
import { addDaysKey, fromDateKey, todayKey, weekStartKey } from '../../lib/time'

type Props = { events: EventItem[]; nowMin: number; onOpen: (day?: string) => void; onTapEvent: (ev: EventItem) => void }

/** Kompakter Kalender fürs Dashboard: Wochenstreifen + die nächsten Termine. Tippen öffnet den Vollbild-Kalender. */
export function CalendarWidget({ events, nowMin, onOpen, onTapEvent }: Props) {
  const today = todayKey()
  const days = useMemo(() => {
    const start = weekStartKey(today)
    return Array.from({ length: 7 }, (_, i) => addDaysKey(start, i))
  }, [today])

  const upcoming = useMemo(() => {
    const list = eventsOnDay(events, today)
    const rest = list.filter((e) => {
      const r = timedRange(e)
      return !r || r.end > nowMin
    })
    return rest.slice(0, 4).map((e) => ({ e, running: (() => { const r = timedRange(e); return !!r && r.start <= nowMin })() }))
  }, [events, today, nowMin])
  const total = eventsOnDay(events, today).length

  return (
    <section className="rounded-lg bg-elev shadow-sm">
      <div className="grid grid-cols-7 gap-1 px-2 pt-2">
        {days.map((d) => {
          const list = eventsOnDay(events, d)
          const on = d === today
          return (
            <button key={d} onClick={() => onOpen(d)} className="press flex flex-col items-center gap-0.5 rounded-md py-1">
              <span className="text-[10px] font-semibold uppercase text-text-3">{format(fromDateKey(d), 'EEEEEE', { locale: de })}</span>
              <span className={'grid h-7 w-7 place-items-center rounded-full text-[14px] font-semibold ' + (on ? 'bg-accent text-on-accent' : '')}>{fromDateKey(d).getDate()}</span>
              <span className="flex h-1.5 gap-0.5">
                {list.slice(0, 3).map((e) => <span key={e.id} className="h-1.5 w-1.5 rounded-full" style={{ background: colorVar(e.color) }} />)}
              </span>
            </button>
          )
        })}
      </div>

      <div className="border-t border-line">
        {upcoming.length === 0 ? (
          <button onClick={() => onOpen()} className="press w-full px-4 py-3 text-left text-[13px] text-text-3">
            {total ? 'Für heute ist alles durch.' : 'Heute keine Termine.'}
          </button>
        ) : (
          upcoming.map(({ e, running }) => (
            <button key={e.id} onClick={() => onTapEvent(e)} className="press flex w-full items-center gap-3 px-4 py-2 text-left">
              <span className="w-[52px] shrink-0 font-mono text-[12px] text-text-2">{e.allDay ? 'ganzt.' : e.time}</span>
              <span className="h-5 w-1 shrink-0 rounded-full" style={{ background: colorVar(e.color) }} />
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{e.text}</span>
              {running && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent">läuft</span>}
            </button>
          ))
        )}
      </div>

      <button onClick={() => onOpen()} className="press flex w-full items-center justify-between border-t border-line px-4 py-2.5 text-[13px] font-semibold text-accent">
        Kalender öffnen <ChevronRight size={16} />
      </button>
    </section>
  )
}
