import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { eventsOnDay, isMultiDay, layoutDay } from '../../lib/calendar'
import { colorVar } from '../../lib/colors'
import type { EventItem } from '../../lib/model'
import { roundToStep, todayKey } from '../../lib/time'

export const HOUR_H = 56

type Props = { day: string; events: EventItem[]; onTapSlot: (min: number) => void; onTapEvent: (ev: EventItem) => void }

export function DayView({ day, events, onTapSlot, onTapEvent }: Props) {
  const dayEvents = useMemo(() => eventsOnDay(events, day), [events, day])
  const allDay = dayEvents.filter((e) => e.allDay || isMultiDay(e))
  const placed = useMemo(() => layoutDay(dayEvents), [dayEvents])
  const isToday = day === todayKey()
  const [nowMin, setNowMin] = useState(() => minutesNow())
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setInterval(() => setNowMin(minutesNow()), 30_000)
    return () => clearInterval(t)
  }, [])

  // Beim Öffnen zur aktuellen Zeit (bzw. zum ersten Termin) scrollen
  useEffect(() => {
    const target = isToday ? nowMin - 90 : (placed[0]?.start ?? 8 * 60) - 30
    const y = Math.max(0, (target / 60) * HOUR_H)
    gridRef.current?.parentElement?.scrollTo({ top: y })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day])

  const onGridClick = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-event]')) return
    const rect = gridRef.current!.getBoundingClientRect()
    const min = ((e.clientY - rect.top) / HOUR_H) * 60
    onTapSlot(roundToStep(Math.max(0, Math.min(1439, min))))
  }

  return (
    <div className="mt-3 overflow-hidden rounded-lg bg-elev shadow-sm">
      {allDay.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-line px-3 py-2">
          {allDay.map((ev) => (
            <button
              key={ev.id}
              data-event
              onClick={() => onTapEvent(ev)}
              className="press max-w-full truncate rounded-md px-2 py-1 text-[12px] font-semibold text-white"
              style={{ background: colorVar(ev.color) }}
            >
              {ev.text}
            </button>
          ))}
        </div>
      )}
      <div className="max-h-[62vh] overflow-y-auto no-scrollbar">
        <div ref={gridRef} className="relative ml-12 mr-2 cursor-pointer" style={{ height: 24 * HOUR_H }} onClick={onGridClick}>
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="absolute inset-x-0 border-t border-line" style={{ top: h * HOUR_H }}>
              <span className="absolute -left-12 -top-2 w-10 text-right font-mono text-[11px] text-text-3">
                {h === 0 ? '' : String(h).padStart(2, '0') + ':00'}
              </span>
            </div>
          ))}

          {placed.map(({ ev, start, end, col, cols }) => {
            const gap = 3
            const width = 'calc(' + 100 / cols + '% - ' + gap + 'px)'
            const left = 'calc(' + (100 / cols) * col + '% + ' + (col ? gap : 0) + 'px)'
            const h = ((end - start) / 60) * HOUR_H
            return (
              <button
                key={ev.id}
                data-event
                onClick={() => onTapEvent(ev)}
                className="press absolute overflow-hidden rounded-md px-2 py-1 text-left text-white shadow-sm"
                style={{ top: (start / 60) * HOUR_H + 1, height: Math.max(22, h - 2), left, width, background: colorVar(ev.color) }}
              >
                <span className="block truncate text-[12.5px] font-semibold leading-4">{ev.text}</span>
                {h >= 40 && <span className="block truncate text-[11px] leading-4 opacity-85">{ev.time}{ev.end ? ' – ' + ev.end : ''}{ev.sub ? ' · ' + ev.sub : ''}</span>}
              </button>
            )
          })}

          {isToday && (
            <div className="pointer-events-none absolute inset-x-0 z-10" style={{ top: (nowMin / 60) * HOUR_H }}>
              <span className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full bg-red" />
              <div className="border-t-2 border-red" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function minutesNow() {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}
