import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { Check, Plus, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { CalendarWidget } from '../components/calendar/CalendarWidget'
import { EventSheet, type Draft } from '../components/calendar/EventSheet'
import { Card, SectionLabel } from '../components/Card'
import { Screen } from '../components/Screen'
import { eventsOnDay, nextFreeSlot, timedRange } from '../lib/calendar'
import { ENERGY_LEVELS, type EventItem } from '../lib/model'
import { useSyncStatus } from '../lib/syncEngine'
import { minToTime, todayKey } from '../lib/time'
import { useStore } from '../store/useStore'
import { CalendarOverlay } from './CalendarScreen'

function greeting(h: number) {
  if (h < 5) return 'Gute Nacht'
  if (h < 11) return 'Guten Morgen'
  if (h < 18) return 'Hallo'
  return 'Guten Abend'
}

export function TodayScreen() {
  const now = new Date()
  const day = todayKey()
  const events = useStore((s) => s.events)
  const energy = useStore((s) => s.energy)
  const setEnergy = useStore((s) => s.setEnergy)
  const tasks = useStore((s) => s.tasks.today)
  const addTask = useStore((s) => s.addTask)
  const toggleTask = useStore((s) => s.toggleTask)
  const addEvent = useStore((s) => s.addEvent)
  const updateEvent = useStore((s) => s.updateEvent)
  const deleteEvent = useStore((s) => s.deleteEvent)
  const sync = useSyncStatus()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [calendar, setCalendar] = useState<{ open: boolean; day: string }>({ open: false, day })
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
  const done = tasks.filter((t) => t.done)

  const submitTask = () => {
    const t = newTask.trim()
    if (!t) return
    addTask('today', t)
    setNewTask('')
  }
  const newEventToday = () => {
    const min = nextFreeSlot(todays, nowMin)
    setDraft({ date: day, allDay: false, time: minToTime(min), end: minToTime(Math.min(min + 60, 1439)), text: '', color: 'accent', source: 'manual' })
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
      <div className="mb-3 flex items-center gap-2">
        <span className="flex items-center gap-1 text-[12px] font-semibold uppercase tracking-wider text-text-3"><Zap size={13} /> Energie</span>
        <div className="flex gap-1.5">
          {ENERGY_LEVELS.map((l) => {
            const on = energy?.level === l.level
            return (
              <button
                key={l.level}
                onClick={() => setEnergy(on ? null : { level: l.level, label: l.label, pct: l.pct })}
                className={'press rounded-full px-3 py-1 text-[12px] font-semibold transition-colors ' + (on ? 'bg-accent text-on-accent' : 'bg-fill text-text-2')}
              >
                {l.label}
              </button>
            )
          })}
        </div>
      </div>

      {sync.status === 'unconfigured' && (
        <Card tone="soft" className="mb-3">
          <p className="text-[15px] font-semibold text-accent">Noch nicht mit der Cloud verbunden</p>
          <p className="mt-1 text-[13px] text-text-2">Unter „Mehr" die Worker-Adresse und das Token eintragen, dann kommen Termine und Aufgaben aus der Cloud.</p>
        </Card>
      )}

      <Card tone="accent">
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
            <p className="mt-2 text-[14px] opacity-90">{open.length ? open.length + ' offene To-do' + (open.length > 1 ? 's' : '') + ' warten.' : 'Nichts Offenes. Gönn dir was.'}</p>
          </>
        )}
      </Card>

      <SectionLabel>To-dos {tasks.length > 0 && <span className="normal-case tracking-normal">· {done.length}/{tasks.length}</span>}</SectionLabel>
      <Card className="p-0">
        {open.map((t) => <TaskLine key={t.id} text={t.text} done={false} onToggle={() => toggleTask('today', t.id)} />)}
        <form onSubmit={(e) => { e.preventDefault(); submitTask() }} className={'flex items-center gap-2 px-3 py-2 ' + (open.length ? 'border-t border-line' : '')}>
          <span className="grid h-6 w-6 shrink-0 place-items-center text-accent"><Plus size={18} strokeWidth={2.5} /></span>
          <input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="To-do hinzufügen" enterKeyHint="done" className="flex-1 bg-transparent py-1 text-[15px] outline-none placeholder:text-text-3" />
        </form>
        {done.length > 0 && (
          <details className="border-t border-line">
            <summary className="cursor-pointer list-none px-4 py-2 text-[12px] font-semibold text-text-3">Erledigt · {done.length}</summary>
            {done.map((t) => <TaskLine key={t.id} text={t.text} done onToggle={() => toggleTask('today', t.id)} />)}
          </details>
        )}
      </Card>

      <SectionLabel>Kalender</SectionLabel>
      <CalendarWidget events={events} nowMin={nowMin} onOpen={(d) => setCalendar({ open: true, day: d ?? day })} onTapEvent={(e) => setDraft({ ...e })} onAdd={newEventToday} />

      <CalendarOverlay open={calendar.open} initialDay={calendar.day} onClose={() => setCalendar((c) => ({ ...c, open: false }))} />
      <EventSheet
        draft={draft}
        onClose={() => setDraft(null)}
        onSave={(d) => { if (d.id) updateEvent(d.id, { ...d } as Partial<EventItem>); else addEvent(d); setDraft(null) }}
        onDelete={(id) => { deleteEvent(id); setDraft(null) }}
      />
    </Screen>
  )
}

function TaskLine({ text, done, onToggle }: { text: string; done: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="press flex w-full items-center gap-3 px-4 py-2.5 text-left">
      <span className={'grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors ' + (done ? 'border-accent bg-accent text-on-accent' : 'border-fill-strong')}>
        {done && <Check size={14} strokeWidth={3} />}
      </span>
      <span className={'text-[15px] ' + (done ? 'text-text-3 line-through' : '')}>{text}</span>
    </button>
  )
}

function fmtMin(m: number) {
  if (m < 60) return m + ' Min.'
  const h = Math.floor(m / 60), r = m % 60
  return h + ' Std.' + (r ? ' ' + r + ' Min.' : '')
}
