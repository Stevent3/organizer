import { isMultiDay, timeLabelOn } from '../../lib/calendar'
import { colorVar } from '../../lib/colors'
import type { EventItem } from '../../lib/model'

/** Listenzeile eines Termins (Agenda in Woche/Monat) */
export function EventRow({ ev, day, onClick }: { ev: EventItem; day?: string; onClick: (ev: EventItem) => void }) {
  const timeLabel = timeLabelOn(ev, day ?? ev.date)
  return (
    <button onClick={() => onClick(ev)} className="press flex w-full items-stretch gap-3 px-4 py-2.5 text-left">
      <span className="w-[76px] shrink-0 pt-0.5 font-mono text-[12px] leading-5 text-text-2">{timeLabel}</span>
      <span className="w-1 shrink-0 rounded-full" style={{ background: colorVar(ev.color) }} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium leading-5">
          {ev.text}
          {isMultiDay(ev) && <span className="ml-1.5 text-[11px] font-semibold text-text-3">mehrtägig</span>}
        </span>
        {ev.sub && <span className="block truncate text-[12px] text-text-2">{ev.sub}</span>}
      </span>
    </button>
  )
}
