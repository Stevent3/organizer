import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import { eventsOnDay } from '../../lib/calendar'
import { colorVar } from '../../lib/colors'
import type { EventItem } from '../../lib/model'
import { addDaysKey, fromDateKey, todayKey, weekStartKey } from '../../lib/time'
import { EventRow } from './EventRow'

type Props = {
  day: string
  events: EventItem[]
  onSelectDay: (day: string) => void
  onAdd: (day: string) => void
  onTapEvent: (ev: EventItem) => void
}

/** Woche als Agenda: Tagesstreifen oben, darunter alle sieben Tage untereinander */
export function WeekView({ day, events, onSelectDay, onAdd, onTapEvent }: Props) {
  const start = weekStartKey(day)
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysKey(start, i)), [start])
  const today = todayKey()

  return (
    <div className="mt-3">
      <div className="grid grid-cols-7 gap-1 rounded-lg bg-elev p-2 shadow-sm">
        {days.map((d) => {
          const list = eventsOnDay(events, d)
          const on = d === day
          return (
            <button key={d} onClick={() => onSelectDay(d)} className="press flex flex-col items-center gap-1 rounded-md py-1.5">
              <span className="text-[11px] font-semibold uppercase text-text-3">{format(fromDateKey(d), 'EEEEEE', { locale: de })}</span>
              <span
                className={'grid h-8 w-8 place-items-center rounded-full text-[15px] font-semibold ' + (on ? 'bg-accent text-on-accent' : d === today ? 'text-accent' : '')}
              >
                {fromDateKey(d).getDate()}
              </span>
              <span className="flex h-1.5 gap-0.5">
                {list.slice(0, 3).map((e) => (
                  <span key={e.id} className="h-1.5 w-1.5 rounded-full" style={{ background: colorVar(e.color) }} />
                ))}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-3 overflow-hidden rounded-lg bg-elev shadow-sm">
        {days.map((d) => {
          const list = eventsOnDay(events, d)
          const date = fromDateKey(d)
          return (
            <section key={d} id={'day-' + d} className="border-b border-line last:border-b-0">
              <div className={'flex items-center justify-between px-4 pb-1 pt-3 ' + (d === today ? 'text-accent' : 'text-text-2')}>
                <button onClick={() => onSelectDay(d)} className="text-[13px] font-semibold uppercase tracking-wider">
                  {format(date, 'EEEE, d. MMM', { locale: de })}
                  {d === today && <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] normal-case tracking-normal text-accent">Heute</span>}
                </button>
                <button aria-label={'Termin am ' + d + ' anlegen'} onClick={() => onAdd(d)} className="press grid h-7 w-7 place-items-center rounded-full bg-fill text-text-2">
                  <Plus size={15} strokeWidth={2.5} />
                </button>
              </div>
              {list.length === 0 ? (
                <p className="px-4 pb-3 text-[13px] text-text-3">Frei</p>
              ) : (
                <div className="pb-1">
                  {list.map((ev) => (
                    <EventRow key={ev.id} ev={ev} day={d} onClick={onTapEvent} />
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
