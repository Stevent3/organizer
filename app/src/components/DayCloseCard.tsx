import { ArrowRight, Moon } from 'lucide-react'
import { useState } from 'react'
import { isActive, type Task } from '../lib/model'
import { addDaysKey, todayKey } from '../lib/time'
import { useUi } from '../lib/ui'
import { useStore } from '../store/useStore'
import { Card, SectionLabel } from './Card'

type Props = { hour: number; eventsTotal: number; eventsLeft: number }

/**
 * Tagesabschluss (Sunsama-„Shutdown"): abends Bilanz ziehen, Offenes auf morgen schieben.
 * Erscheint ab 19 Uhr, bis der Tag abgeschlossen ist (extra.dayClosed = heute).
 */
export function DayCloseCard({ hour, eventsTotal, eventsLeft }: Props) {
  const day = todayKey()
  const tasks = useStore((s) => s.tasks.today)
  const closed = useStore((s) => s.extra.dayClosed === day)
  const snoozeTask = useStore((s) => s.snoozeTask)
  const clearDone = useStore((s) => s.clearDone)
  const setExtra = useStore((s) => s.setExtra)
  const showToast = useUi((u) => u.showToast)
  const [expanded, setExpanded] = useState(false)
  if (hour < 19 || closed) return null

  const open = tasks.filter((t) => isActive(t, day))
  const done = tasks.filter((t) => t.done)
  const total = open.length + done.length
  const tomorrow = addDaysKey(day, 1)
  const toTomorrow = (t: Task) => snoozeTask('today', t.id, tomorrow)
  const finish = () => {
    for (const t of open) toTomorrow(t)
    clearDone('today')
    setExtra({ dayClosed: day })
    showToast(done.length + ' erledigt' + (open.length ? ', ' + open.length + ' auf morgen' : '') + '. Gute Nacht 🌙')
  }

  return (
    <>
      <SectionLabel>Tagesabschluss</SectionLabel>
      <Card className="p-0">
        <button onClick={() => setExpanded((e) => !e)} className="press flex w-full items-center gap-3 px-4 py-3 text-left">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent"><Moon size={18} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">{total ? done.length + ' von ' + total + ' To-dos geschafft' : 'Keine To-dos heute'}{eventsTotal ? ' · ' + (eventsTotal - eventsLeft) + '/' + eventsTotal + ' Termine' : ''}</span>
            <span className="block text-[12px] text-text-2">{open.length ? open.length + ' offen. Rest auf morgen?' : 'Alles erledigt. Stark.'}</span>
          </span>
        </button>
        {expanded && open.length > 0 && (
          <ul className="divide-y divide-line border-t border-line">
            {open.map((t) => (
              <li key={t.id} className="flex items-center gap-2 px-4 py-2">
                <span className="flex-1 text-[14px]">{t.text}</span>
                <button onClick={() => toTomorrow(t)} className="press flex items-center gap-1 rounded-full bg-fill px-2.5 py-1 text-[12px] font-semibold text-text-2">Morgen <ArrowRight size={12} /></button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2 border-t border-line p-3">
          {open.length > 0 && <button onClick={() => setExpanded((e) => !e)} className="press flex-1 rounded-md bg-fill py-2.5 text-[14px] font-semibold text-text-2">{expanded ? 'Einklappen' : 'Einzeln entscheiden'}</button>}
          <button onClick={finish} className="press flex-1 rounded-md bg-accent py-2.5 text-[14px] font-semibold text-on-accent">{open.length ? 'Alles auf morgen & abschließen' : 'Tag abschließen'}</button>
        </div>
      </Card>
    </>
  )
}
