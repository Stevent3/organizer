import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { Check, ChevronRight, Plus, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { EventRow } from '../components/calendar/EventRow'
import { EventSheet, type Draft } from '../components/calendar/EventSheet'
import { Card, SectionLabel } from '../components/Card'
import { Screen } from '../components/Screen'
import { eventsOnDay, timedRange } from '../lib/calendar'
import { colorVar } from '../lib/colors'
import { ENERGY_LEVELS, type EventItem } from '../lib/model'
import { useSyncStatus } from '../lib/syncEngine'
import { todayKey } from '../lib/time'
import { useStore } from '../store/useStore'

function greeting(h: number) {
  if (h < 5) return 'Gute Nacht'
  if (h < 11) return 'Guten Morgen'
  if (h < 18) return 'Hallo'
  return 'Guten Abend'
}

export function TodayScreen({ onOpenCalendar }: { onOpenCalendar: () => void }) {
  const now = new Date()
  const day = todayKey()
  const events = useStore((s) => s.events)
  const energy = useStore((s) => s.energy)
  const setEnergy = useStore((s) => s.setEnergy)
  const tasks = useStore((s) => s.tasks.today)
  const addTask = useStore((s) => s.addTask)
  const toggleTask = useStore((s) => s.toggleTask)
  const updateEvent = useStore((s) => s.updateEvent)
  const deleteEvent = useStore((s) => s.deleteEvent)
  const sync = useSyncStatus()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [newTask, setNewTask] = useState('')
  const [nowMin, setNowMin] = useState(now.getHours() * 60 + now.getMinutes())
  useEffect(() => {
    const t = setInterval(() => { const d = new Date(); setNowMin(d.getHours() * 60 + d.getMinutes()) }, 30_000)
    return () => clearInterval(t)
  }, [])

  const todays = useMemo(() => eventsOnDay(events, day), [events, day])
  const focus = useMemo(() => {
    const timed = todays.map((ev) => ({ ev, r: timedRange(ev) })).filter((x) => x.r)
    const current = timed.find((x) => x.r!.start <= nowMin && nowMin < x.r!.end)
    if (current) return { ev: current.ev, kind: 'now' as const, min: current.r!.end - nowMin }
    const next = timed.find((x) => x.r!.start > nowMin)
    if (next) return { ev: next.ev, kind: 'next' as const, min: next.r!.start - nowMin }
    return null
  }, [todays, nowMin])

  const open = tasks.filter((t) => !t.done)
  const done = tasks.length - open.length

  const submitTask = () => {
    const t = newTask.trim()
    if (!t) return
    addTask('today', t)
    setNewTask('')
  }

  return (
    <Screen
      title={greeting(now.getHours())}
      subtitle={format(now, 'EEEE, d. MMMM', { locale: de })}
      right={
        <span className={'mb-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ' + (sync.status === 'ok' ? 'bg-accent-soft text-accent' : sync.status === 'error' ? 'bg-red/10 text-red' : 'bg-fill text-text-3')}>
          {sync.status === 'ok' ? 'Sync ok' : sync.status === 'syncing' ? 'Sync …' : sync.status === 'error' ? 'Sync-Fehler' : 'Offline'}
        </span>
      }
    >
      {sync.status === 'unconfigured' && (
        <Card tone="soft" className="mt-2">
          <p className="text-[15px] font-semibold text-accent">Noch nicht mit der Cloud verbunden</p>
          <p className="mt-1 text-[13px] text-text-2">
            Am einfachsten: In der bisherigen App unter Module, Cloud-Sync auf „Neue App öffnen" tippen. Dann kommen Zugang und Daten automatisch hierher.
            Alternativ unter „Mehr" die Worker-Adresse und das Token eintragen.
          </p>
        </Card>
      )}

      <Card tone="accent" className="mt-2">
        {focus ? (
          <button onClick={() => setDraft({ ...focus.ev })} className="w-full text-left">
            <p className="text-[12px] font-semibold uppercase tracking-wider opacity-80">{focus.kind === 'now' ? 'Jetzt dran' : 'Als Nächstes'}</p>
            <p className="mt-1 text-[22px] font-bold leading-snug">{focus.ev.text}</p>
            <p className="mt-1 text-[14px] opacity-90">
              {focus.ev.time}{focus.ev.end ? ' – ' + focus.ev.end : ''}{focus.ev.sub ? ' · ' + focus.ev.sub : ''}
            </p>
            <p className="mt-3 inline-block rounded-full bg-white/20 px-2.5 py-1 text-[12px] font-semibold">
              {focus.kind === 'now' ? 'noch ' + fmtMin(focus.min) : 'in ' + fmtMin(focus.min)}
            </p>
          </button>
        ) : (
          <>
            <p className="text-[12px] font-semibold uppercase tracking-wider opacity-80">Jetzt dran</p>
            <p className="mt-1 text-[22px] font-bold leading-snug">{todays.length ? 'Keine weiteren Termine heute' : 'Heute ist frei'}</p>
            <p className="mt-2 text-[14px] opacity-90">{open.length ? open.length + ' offene Aufgabe' + (open.length > 1 ? 'n' : '') + ' warten.' : 'Nichts Offenes. Gönn dir was.'}</p>
          </>
        )}
      </Card>

      <SectionLabel>Energie heute</SectionLabel>
      <Card className="p-2">
        <div className="grid grid-cols-3 gap-2">
          {ENERGY_LEVELS.map((l) => {
            const on = energy?.level === l.level
            return (
              <button
                key={l.level}
                onClick={() => setEnergy(on ? null : { level: l.level, label: l.label, pct: l.pct })}
                className={'press flex flex-col items-center gap-0.5 rounded-md py-2.5 transition-colors ' + (on ? 'bg-accent text-on-accent' : 'bg-fill')}
              >
                <Zap size={16} fill={on ? 'currentColor' : 'none'} />
                <span className="text-[14px] font-semibold">{l.label}</span>
                <span className={'text-[11px] ' + (on ? 'opacity-80' : 'text-text-3')}>{l.hint}</span>
              </button>
            )
          })}
        </div>
      </Card>

      <SectionLabel>Termine</SectionLabel>
      <Card className="p-0">
        {todays.length === 0 ? (
          <p className="px-4 py-3 text-[13px] text-text-3">Keine Termine heute</p>
        ) : (
          <div className="py-1">
            {todays.map((ev) => <EventRow key={ev.id} ev={ev} onClick={(e) => setDraft({ ...e })} />)}
          </div>
        )}
        <button onClick={onOpenCalendar} className="press flex w-full items-center justify-between border-t border-line px-4 py-3 text-[14px] font-semibold text-accent">
          Zum Kalender <ChevronRight size={16} />
        </button>
      </Card>

      <SectionLabel>Aufgaben {tasks.length > 0 && <span className="normal-case tracking-normal">· {done}/{tasks.length}</span>}</SectionLabel>
      <Card className="p-0">
        {tasks.map((t) => (
          <button key={t.id} onClick={() => toggleTask('today', t.id)} className="press flex w-full items-center gap-3 px-4 py-2.5 text-left">
            <span className={'grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors ' + (t.done ? 'border-accent bg-accent text-on-accent' : 'border-fill-strong')}>
              {t.done && <Check size={14} strokeWidth={3} />}
            </span>
            <span className={'text-[15px] ' + (t.done ? 'text-text-3 line-through' : '')}>{t.text}</span>
          </button>
        ))}
        <form onSubmit={(e) => { e.preventDefault(); submitTask() }} className="flex items-center gap-2 border-t border-line px-3 py-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center text-text-3"><Plus size={16} /></span>
          <input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Aufgabe hinzufügen" className="flex-1 bg-transparent py-1 text-[15px] outline-none placeholder:text-text-3" />
        </form>
      </Card>

      <p className="mt-6 text-center text-[11px] text-text-3">
        <span className="inline-block h-2 w-2 rounded-full align-middle" style={{ background: colorVar('teal') }} /> Apple Kalender ·{' '}
        <span className="inline-block h-2 w-2 rounded-full align-middle" style={{ background: colorVar('accent') }} /> Eigene Termine
      </p>

      <EventSheet
        draft={draft}
        onClose={() => setDraft(null)}
        onSave={(d) => { if (d.id) updateEvent(d.id, { ...d } as Partial<EventItem>); setDraft(null) }}
        onDelete={(id) => { deleteEvent(id); setDraft(null) }}
      />
    </Screen>
  )
}

function fmtMin(m: number) {
  if (m < 60) return m + ' Min.'
  const h = Math.floor(m / 60), r = m % 60
  return h + ' Std.' + (r ? ' ' + r + ' Min.' : '')
}
