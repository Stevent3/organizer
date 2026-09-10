import { Briefcase, Settings2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card, SectionLabel } from '../../components/Card'
import { Sheet } from '../../components/Sheet'
import type { EventItem } from '../../lib/model'
import { fromDateKey } from '../../lib/time'
import { euro, hoursText, readWork, shiftStats, type WorkSettings } from '../../lib/work'
import { useStore } from '../../store/useStore'

const input = 'w-full rounded-md bg-fill px-3 py-2.5 text-[15px] outline-none placeholder:text-text-3'
const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

/** Schichten & Verdienst aus dem Kalender (Stichwort im Titel), Einstellungen synchronisiert in extra.work */
export function WorkCard({ events, day, nowMin }: { events: EventItem[]; day: string; nowMin: number }) {
  const extra = useStore((s) => s.extra)
  const setExtra = useStore((s) => s.setExtra)
  const settings = useMemo(() => readWork(extra), [extra])
  const stats = useMemo(() => shiftStats(events, settings, day, nowMin), [events, settings, day, nowMin])
  const [edit, setEdit] = useState(false)
  const nextLabel = stats.next
    ? (stats.next.date === day ? 'Heute' : WD[fromDateKey(stats.next.date).getDay()] + ' ' + fromDateKey(stats.next.date).getDate() + '.') + ' ' + stats.next.time + (stats.next.end ? '–' + stats.next.end : '')
    : null

  return (
    <>
      <SectionLabel>
        <span className="flex items-center justify-between">
          <span>Schichten · {settings.keyword}</span>
          <button onClick={() => setEdit(true)} aria-label="Schichten einstellen" className="press grid h-6 w-6 place-items-center rounded-full bg-fill text-text-2"><Settings2 size={13} /></button>
        </span>
      </SectionLabel>
      <Card className="p-0">
        <div className="grid grid-cols-3 divide-x divide-line">
          {[
            { label: 'Diese Woche', s: stats.week },
            { label: 'Nächste Woche', s: stats.nextWeek },
            { label: 'Monat', s: stats.month },
          ].map((c) => (
            <div key={c.label} className="px-3 py-2.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-text-3">{c.label}</p>
              <p className="mt-0.5 text-[17px] font-bold leading-tight">{euro(c.s.earnings)}</p>
              <p className="text-[12px] text-text-2">{hoursText(c.s.hours)} · {c.s.count} {c.s.count === 1 ? 'Schicht' : 'Schichten'}</p>
            </div>
          ))}
        </div>
        <p className="flex items-center gap-1.5 border-t border-line px-3 py-2 text-[12px] text-text-2">
          <Briefcase size={13} className="text-text-3" />
          {nextLabel ? 'Nächste Schicht: ' + nextLabel : 'Keine Schicht in den nächsten 60 Tagen. Stichwort prüfen?'}
          <span className="ml-auto text-text-3">{settings.rate.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €/h</span>
        </p>
      </Card>
      <WorkSheet open={edit} settings={settings} onClose={() => setEdit(false)} onSave={(w) => { setExtra({ work: w }); setEdit(false) }} />
    </>
  )
}

function WorkSheet({ open, settings, onClose, onSave }: { open: boolean; settings: WorkSettings; onClose: () => void; onSave: (w: WorkSettings) => void }) {
  const [keyword, setKeyword] = useState(settings.keyword)
  const [rate, setRate] = useState(settings.rate.toLocaleString('de-DE', { minimumFractionDigits: 2 }))
  const parsed = Number(rate.replace(',', '.'))
  return (
    <Sheet open={open} onClose={onClose} title="Schichten & Verdienst">
      <label className="mb-1 block text-[12px] font-semibold uppercase tracking-wider text-text-3">Stichwort im Termintitel</label>
      <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Samowar" className={input} />
      <p className="mt-1 text-[12px] text-text-3">Jeder Termin mit Uhrzeit, der das Wort enthält, zählt als Schicht. Neuer Job ab 15.09.? Einfach das Stichwort ändern.</p>
      <label className="mb-1 mt-3 block text-[12px] font-semibold uppercase tracking-wider text-text-3">Stundenlohn (€)</label>
      <input value={rate} onChange={(e) => setRate(e.target.value)} inputMode="decimal" placeholder="14,90" className={input} />
      <p className="mt-1 text-[12px] text-text-3">Mindestlohn 2026: 13,90 €. Brutto, ohne Zuschläge – eine Schätzung, kein Lohnzettel.</p>
      <div className="mt-4 flex gap-2">
        <button onClick={onClose} className="press flex-1 rounded-md bg-fill py-2.5 text-[15px] font-semibold">Abbrechen</button>
        <button onClick={() => onSave({ keyword: keyword.trim() || settings.keyword, rate: Number.isFinite(parsed) && parsed >= 0 ? parsed : settings.rate })} className="press flex-1 rounded-md bg-accent py-2.5 text-[15px] font-semibold text-on-accent">Speichern</button>
      </div>
    </Sheet>
  )
}
