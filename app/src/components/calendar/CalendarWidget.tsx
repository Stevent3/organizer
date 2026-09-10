import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronRight, Plus } from 'lucide-react'
import { useMemo } from 'react'
import { eventsOnDay, timeLabelOn, timedRange } from '../../lib/calendar'
import { colorVar } from '../../lib/colors'
import type { EventItem } from '../../lib/model'
import { addDaysKey, fromDateKey, toDateKey, todayKey } from '../../lib/time'

type Props = { events: EventItem[]; nowMin: number; onOpen: (day?: string) => void; onTapEvent: (ev: EventItem) => void; onAdd: () => void }

const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

/** Dashboard-Kalender: Monatsraster kompakt + alles, was in den nächsten Tagen ansteht. Tippen öffnet den Vollbild-Kalender. */
export function CalendarWidget({ events, nowMin, onOpen, onTapEvent, onAdd }: Props) {
  const today = todayKey()
  const date = fromDateKey(today)
  const month = date.getMonth()

  const cells = useMemo(() => {
    const first = toDateKey(startOfWeek(startOfMonth(date), { weekStartsOn: 1 }))
    const last = toDateKey(endOfWeek(endOfMonth(date), { weekStartsOn: 1 }))
    const out: string[] = []
    for (let k = first; k <= last; k = addDaysKey(k, 1)) out.push(k)
    return out
  }, [date])

  /** Heute (Rest) + die nächsten 6 Tage, gruppiert */
  const upcoming = useMemo(() => {
    const out: { day: string; label: string; items: { e: EventItem; running: boolean }[] }[] = []
    for (let i = 0; i < 7; i++) {
      const d = addDaysKey(today, i)
      let list = eventsOnDay(events, d)
      if (i === 0) list = list.filter((e) => { const r = timedRange(e); return !r || r.end > nowMin })
      if (!list.length) continue
      out.push({
        day: d,
        label: i === 0 ? 'Heute' : i === 1 ? 'Morgen' : format(fromDateKey(d), 'EEEE, d. MMM', { locale: de }),
        items: list.map((e) => ({ e, running: i === 0 && (() => { const r = timedRange(e); return !!r && r.start <= nowMin })() })),
      })
    }
    return out
  }, [events, today, nowMin])
  const shown = upcoming.reduce((n, g) => n + g.items.length, 0)

  return (
    <section className="rounded-lg bg-elev shadow-sm">
      <div className="flex items-center justify-between px-4 pt-3">
        <button onClick={() => onOpen()} className="press text-[15px] font-bold">{format(date, 'MMMM yyyy', { locale: de })}</button>
        <button aria-label="Neuer Termin" onClick={onAdd} className="press grid h-7 w-7 place-items-center rounded-full bg-fill text-text-2"><Plus size={15} strokeWidth={2.5} /></button>
      </div>
      <div className="grid grid-cols-7 px-2 pt-1">
        {WD.map((w) => <span key={w} className="py-1 text-center text-[10px] font-semibold uppercase text-text-3">{w}</span>)}
        {cells.map((d) => {
          const list = eventsOnDay(events, d)
          const inMonth = fromDateKey(d).getMonth() === month
          const on = d === today
          return (
            <button key={d} onClick={() => onOpen(d)} className={'press flex h-9 flex-col items-center justify-center rounded-md ' + (inMonth ? '' : 'opacity-30')}>
              <span className={'grid h-6 w-6 place-items-center rounded-full text-[12.5px] font-semibold ' + (on ? 'bg-accent text-on-accent' : d < today ? 'text-text-2' : '')}>{fromDateKey(d).getDate()}</span>
              <span className="flex h-1 gap-0.5">
                {list.slice(0, 3).map((e) => <span key={e.id} className="h-1 w-1 rounded-full" style={{ background: colorVar(e.color) }} />)}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-1 border-t border-line">
        {upcoming.length === 0 ? (
          <button onClick={() => onOpen()} className="press w-full px-4 py-3 text-left text-[13px] text-text-3">In den nächsten 7 Tagen steht nichts an.</button>
        ) : (
          upcoming.map((g) => (
            <div key={g.day} className="border-b border-line last:border-b-0">
              <button onClick={() => onOpen(g.day)} className={'press flex w-full items-center justify-between px-4 pb-0.5 pt-2 text-[11px] font-semibold uppercase tracking-wider ' + (g.day === today ? 'text-accent' : 'text-text-3')}>
                {g.label}<span className="normal-case tracking-normal">{g.items.length}</span>
              </button>
              {g.items.map(({ e, running }) => (
                <button key={e.id} onClick={() => onTapEvent(e)} className="press flex w-full items-center gap-3 px-4 py-1.5 text-left">
                  <span className="w-[52px] shrink-0 font-mono text-[12px] text-text-2">{timeLabelOn(e, g.day, true)}</span>
                  <span className="h-5 w-1 shrink-0 rounded-full" style={{ background: colorVar(e.color) }} />
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{e.text}{e.sub ? <span className="text-text-3"> · {e.sub}</span> : null}</span>
                  {running && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent">läuft</span>}
                </button>
              ))}
            </div>
          ))
        )}
      </div>

      <button onClick={() => onOpen()} className="press flex w-full items-center justify-between border-t border-line px-4 py-2.5 text-[13px] font-semibold text-accent">
        Kalender öffnen{shown > 0 && <span className="text-text-3"> · {shown} Termine in 7 Tagen</span>} <ChevronRight size={16} />
      </button>
    </section>
  )
}
