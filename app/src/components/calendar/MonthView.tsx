import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns'
import { de } from 'date-fns/locale'
import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import { eventsOnDay, isMultiDay } from '../../lib/calendar'
import { colorVar } from '../../lib/colors'
import type { EventItem } from '../../lib/model'
import { addDaysKey, fromDateKey, toDateKey, todayKey } from '../../lib/time'
import { EventRow } from './EventRow'

type Props = { day: string; events: EventItem[]; onSelectDay: (day: string) => void; onAdd: (day: string) => void; onTapEvent: (ev: EventItem) => void }

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

export function MonthView({ day, events, onSelectDay, onAdd, onTapEvent }: Props) {
  const date = fromDateKey(day)
  const month = date.getMonth()
  const today = todayKey()

  const cells = useMemo(() => {
    const first = toDateKey(startOfWeek(startOfMonth(date), { weekStartsOn: 1 }))
    const last = toDateKey(endOfWeek(endOfMonth(date), { weekStartsOn: 1 }))
    const out: string[] = []
    for (let k = first; k <= last; k = addDaysKey(k, 1)) out.push(k)
    return out
  }, [date])

  const selected = eventsOnDay(events, day)

  return (
    <div className="mt-3">
      <div className="rounded-lg bg-elev p-2 shadow-sm">
        <div className="grid grid-cols-7 pb-1">
          {WEEKDAYS.map((w) => (
            <span key={w} className="text-center text-[11px] font-semibold uppercase text-text-3">{w}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((d) => {
            const list = eventsOnDay(events, d)
            const inMonth = fromDateKey(d).getMonth() === month
            const on = d === day
            const bars = list.filter((e) => e.allDay || isMultiDay(e)).slice(0, 2)
            const dots = list.filter((e) => !(e.allDay || isMultiDay(e))).slice(0, 3)
            return (
              <button key={d} onClick={() => onSelectDay(d)} className={'press flex h-[58px] flex-col items-center rounded-md pt-1 ' + (inMonth ? '' : 'opacity-35')}>
                <span
                  className={'grid h-7 w-7 place-items-center rounded-full text-[14px] font-semibold ' + (on ? 'bg-accent text-on-accent' : d === today ? 'text-accent' : '')}
                >
                  {fromDateKey(d).getDate()}
                </span>
                <span className="mt-0.5 flex w-full flex-col gap-0.5 px-0.5">
                  {bars.map((e) => (
                    <span key={e.id} className="h-1 w-full rounded-sm" style={{ background: colorVar(e.color) }} />
                  ))}
                </span>
                <span className="mt-0.5 flex gap-0.5">
                  {dots.map((e) => (
                    <span key={e.id} className="h-1.5 w-1.5 rounded-full" style={{ background: colorVar(e.color) }} />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-lg bg-elev shadow-sm">
        <div className="flex items-center justify-between px-4 pb-1 pt-3 text-text-2">
          <span className="text-[13px] font-semibold uppercase tracking-wider">{format(date, 'EEEE, d. MMMM', { locale: de })}</span>
          <button aria-label="Termin anlegen" onClick={() => onAdd(day)} className="press grid h-7 w-7 place-items-center rounded-full bg-fill">
            <Plus size={15} strokeWidth={2.5} />
          </button>
        </div>
        {selected.length === 0 ? (
          <p className="px-4 pb-3 text-[13px] text-text-3">Keine Termine</p>
        ) : (
          <div className="pb-1">
            {selected.map((ev) => (
              <EventRow key={ev.id} ev={ev} day={day} onClick={onTapEvent} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
