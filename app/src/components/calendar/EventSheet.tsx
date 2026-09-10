import { Navigation, Trash2 } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { colorVar } from '../../lib/colors'
import { COLORS, type ColorKey, type EventItem } from '../../lib/model'
import { minToTime, timeToMin } from '../../lib/time'
import { Sheet } from '../Sheet'
import { Toggle } from '../Toggle'
import { looksLikePlace, mapsUrl } from '../../lib/maps'

export type Draft = Omit<EventItem, 'id'> & { id?: string }

type Props = { draft: Draft | null; onClose: () => void; onSave: (d: Draft) => void; onDelete: (id: string) => void }

export function EventSheet({ draft, onClose, onSave, onDelete }: Props) {
  const [d, setD] = useState<Draft | null>(draft)
  const [multi, setMulti] = useState(false)
  useEffect(() => {
    setD(draft)
    setMulti(!!draft?.endDate && draft.endDate > draft.date)
  }, [draft])

  if (!d) return null
  const set = (patch: Partial<Draft>) => setD({ ...d, ...patch })
  const valid = d.text.trim().length > 0 && (d.allDay || !!timeToMin(d.time))

  const save = () => {
    if (!valid) return
    const start = timeToMin(d.time), end = timeToMin(d.end)
    onSave({
      ...d,
      text: d.text.trim(),
      sub: d.sub?.trim() || undefined,
      time: d.allDay ? undefined : d.time,
      end: d.allDay || end == null || start == null || end <= start ? undefined : d.end,
      endDate: multi && d.endDate && d.endDate > d.date ? d.endDate : undefined,
    })
  }

  const isApple = d.source === 'calendar'

  return (
    <Sheet
      open
      onClose={onClose}
      title={d.id ? 'Termin bearbeiten' : 'Neuer Termin'}
      right={
        <button onClick={save} disabled={!valid} className="press rounded-full bg-accent px-4 py-1.5 text-[14px] font-semibold text-on-accent disabled:opacity-40">
          Sichern
        </button>
      }
    >
      <input
        autoFocus={!d.id}
        value={d.text}
        onChange={(e) => set({ text: e.target.value })}
        placeholder="Titel"
        className="w-full rounded-md bg-fill px-3 py-2.5 text-[17px] font-semibold outline-none placeholder:text-text-3"
      />

      <div className="mt-3 overflow-hidden rounded-md bg-fill">
        <Row label="Ganztägig">
          <Toggle on={d.allDay} onChange={(v) => set({ allDay: v, time: v ? undefined : d.time ?? '09:00' })} />
        </Row>
        <Row label={multi ? 'Beginn' : 'Datum'}>
          <input type="date" value={d.date} onChange={(e) => set({ date: e.target.value, endDate: d.endDate && d.endDate < e.target.value ? e.target.value : d.endDate })} className={inputCls} />
        </Row>
        <Row label="Mehrere Tage">
          <Toggle on={multi} onChange={(v) => { setMulti(v); if (v && !d.endDate) set({ endDate: d.date }) }} />
        </Row>
        {multi && (
          <Row label="Ende">
            <input type="date" min={d.date} value={d.endDate ?? d.date} onChange={(e) => set({ endDate: e.target.value })} className={inputCls} />
          </Row>
        )}
        {!d.allDay && (
          <>
            <Row label="Von">
              <input type="time" step={300} value={d.time ?? ''} onChange={(e) => set({ time: e.target.value })} className={inputCls} />
            </Row>
            <Row label="Bis">
              <input type="time" step={300} value={d.end ?? ''} onChange={(e) => set({ end: e.target.value })} className={inputCls} />
              {!d.end && d.time && (
                <button onClick={() => set({ end: minToTime((timeToMin(d.time) ?? 540) + 60) })} className="ml-2 text-[12px] font-semibold text-accent">
                  +1 h
                </button>
              )}
            </Row>
          </>
        )}
      </div>

      <input
        value={d.sub ?? ''}
        onChange={(e) => set({ sub: e.target.value })}
        placeholder="Ort oder Notiz"
        className="mt-3 w-full rounded-md bg-fill px-3 py-2.5 text-[15px] outline-none placeholder:text-text-3"
      />
      {looksLikePlace(d.sub, isApple) && (
        <a href={mapsUrl(d.sub!)} target="_blank" rel="noreferrer" className="press mt-2 flex items-center gap-2 rounded-md bg-accent-soft px-3 py-2 text-[14px] font-semibold text-accent">
          <Navigation size={15} /> Route in Karten öffnen
        </a>
      )}

      <div className="mt-3 flex items-center gap-2.5 px-1">
        {COLORS.map((c) => (
          <button
            key={c.key}
            aria-label={c.label}
            aria-pressed={d.color === c.key}
            onClick={() => set({ color: c.key as ColorKey })}
            className={'h-7 w-7 rounded-full transition-transform ' + (d.color === c.key ? 'scale-110 ring-2 ring-offset-2 ring-offset-elev' : 'opacity-70')}
            style={{ background: colorVar(c.key), ['--tw-ring-color' as string]: colorVar(c.key) }}
          />
        ))}
      </div>

      {isApple && <p className="mt-3 text-[12px] text-text-3">Aus dem Apple Kalender. Änderungen gelten nur hier und bleiben beim nächsten Abgleich erhalten.</p>}

      {d.id && (
        <button onClick={() => onDelete(d.id!)} className="press mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-red/10 py-2.5 text-[15px] font-semibold text-red">
          <Trash2 size={16} /> Termin löschen
        </button>
      )}
    </Sheet>
  )
}

const inputCls = 'rounded-sm bg-elev px-2 py-1 text-[15px] outline-none'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[44px] items-center justify-between border-b border-line px-3 py-1.5 last:border-b-0">
      <span className="text-[15px]">{label}</span>
      <span className="flex items-center">{children}</span>
    </div>
  )
}
