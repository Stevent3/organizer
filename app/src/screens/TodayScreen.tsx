import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronRight, ClipboardList, Plus, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { CalendarWidget } from '../components/calendar/CalendarWidget'
import { DayCloseCard } from '../components/DayCloseCard'
import { HabitsCard } from '../components/HabitsCard'
import { EventSheet, type Draft } from '../components/calendar/EventSheet'
import { Card, SectionLabel } from '../components/Card'
import { QuickAdd } from '../components/QuickAdd'
import { Screen } from '../components/Screen'
import { WeatherChip } from '../components/WeatherChip'
import { eventsOnDay, nextFreeSlot, timedRange } from '../lib/calendar'
import { useDashboard } from '../lib/dashboard'
import { ENERGY_LEVELS, isActive, type EventItem } from '../lib/model'
import { MEAL_SLOTS, PLAN_ICON, readDayPlan, readMealPlan, todayMealIndex } from '../lib/planner'
import { useSyncStatus } from '../lib/syncEngine'
import { minToTime, timeToMin, todayKey } from '../lib/time'
import { useUi } from '../lib/ui'
import { useStore } from '../store/useStore'
import { CalendarOverlay } from './CalendarScreen'
import { Glance, type TodayData } from './today/Glance'
import { EnergyPill, Stat, TaskLine, fmtMin } from './today/bits'
import { WorkCard } from './today/WorkCard'
import { BirthdayCard } from './today/BirthdayCard'
import { departureMin, useTravel } from '../lib/travel'

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
  const extra = useStore((s) => s.extra)
  const show = useDashboard((d) => d.on)
  const layout = useDashboard((d) => d.layout)
  const go = useUi((u) => u.go)
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

  // KI-Tagesplan: aktueller Block (nur wenn der Plan von heute ist)
  const plan = useMemo(() => { const p = readDayPlan(extra); return p && p.date === day ? p : null }, [extra, day])
  const planNow = useMemo(() => {
    if (!plan) return null
    const idx = plan.blocks.findIndex((b, i) => {
      const s = timeToMin(b.time) ?? -1
      const e = timeToMin(b.end) ?? timeToMin(plan.blocks[i + 1]?.time) ?? s + 60
      return s <= nowMin && nowMin < e
    })
    if (idx < 0) return null
    return { block: plan.blocks[idx], done: idx, total: plan.blocks.length }
  }, [plan, nowMin])
  // Nicht denselben Termin zweimal zeigen (Fixtermin steht schon groß in der Karte)
  const planHint = planNow && !(focus?.kind === 'now' && planNow.block.title.toLowerCase() === focus.ev.text.toLowerCase()) ? planNow : null

  const meal = useMemo(() => {
    const mp = readMealPlan(extra)
    if (!mp) return null
    const d = mp.days[todayMealIndex(now)] ?? mp.days[0]
    const slots = MEAL_SLOTS.map((s) => ({ ...s, meal: d[s.id] })).filter((s) => s.meal)
    if (!slots.length) return null
    // Der nächste anstehende Slot wird hervorgehoben: bis 10:30 Frühstück, bis 15:00 Mittag, sonst Abend
    const h = nowMin / 60
    const activeId = h < 10.5 ? 'fruehstueck' : h < 15 ? 'mittag' : 'abend'
    return { tag: d.tag, slots, activeId }
  }, [extra, nowMin]) // eslint-disable-line react-hooks/exhaustive-deps

  const open = tasks.filter((t) => isActive(t, day))
  const done = tasks.filter((t) => t.done)
  const visible = open.length + done.length
  // Kennzahl Termine: nur Termine mit Uhrzeit (ganztägige haben kein Ende, das man abhaken könnte)
  const timedToday = todays.filter((e) => timedRange(e))
  const eventsLeft = timedToday.filter((e) => timedRange(e)!.end > nowMin).length

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

  const travelHook = useTravel(focus?.kind === 'next' && !focus.ev.travel ? focus.ev.sub : undefined, focus?.ev.source === 'calendar')
  const travel = focus?.ev.travel || travelHook
  const depart = focus?.kind === 'next' && travel ? departureMin(timeToMin(focus.ev.time) ?? 0, travel) : null

  const data: TodayData = {
    day, nowMin, events, todays, focus, plan, planNow, planHint, meal, open, done, visible, timedToday, eventsLeft, show, go,
    openCalendar: (d) => setCalendar({ open: true, day: d ?? day }),
    openEvent: (e) => setDraft({ ...e }),
    newEvent: newEventToday,
    toggleTask: (id) => toggleTask('today', id),
    addTask: (text) => { addTask('today', text) },
  }

  return (
    <Screen
      title={greeting(now.getHours())}
      subtitle={format(now, 'EEEE, d. MMMM', { locale: de })}
      compact={layout === 'glance'}
      right={
        <div className="flex items-center gap-2">
          {layout === 'glance' && show.energy && <EnergyPill />}
          {show.weather && <WeatherChip />}
          <span title={sync.status} className={'mb-2 h-2.5 w-2.5 rounded-full ' + (sync.status === 'ok' ? 'bg-green' : sync.status === 'error' ? 'bg-red' : sync.status === 'syncing' ? 'animate-pulse bg-accent' : 'bg-fill-strong')} />
        </div>
      }
    >
      {sync.status === 'unconfigured' && (
        <Card tone="soft" className="mb-3">
          <p className="text-[15px] font-semibold text-accent">Noch nicht mit der Cloud verbunden</p>
          <p className="mt-1 text-[13px] text-text-2">Unter „Mehr" die Worker-Adresse und das Token eintragen, dann kommen Termine und Aufgaben aus der Cloud.</p>
        </Card>
      )}

      {layout === 'glance' && <Glance {...data} />}

      {layout === 'classic' && show.quickAdd && <div className="mb-3"><QuickAdd /></div>}

      {layout === 'classic' && show.energy && (
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
      )}

      {layout === 'classic' && show.focus && (
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
              {depart != null && <p className="mt-2 text-[13px] font-semibold">🚗 {depart <= nowMin ? 'Jetzt losgehen' : 'Losgehen um ' + minToTime(depart)} <span className="font-normal opacity-80">· {travel} Min Fahrt</span></p>}
            </button>
          ) : (
            <>
              <p className="text-[12px] font-semibold uppercase tracking-wider opacity-80">Jetzt dran</p>
              <p className="mt-1 text-[22px] font-bold leading-snug">{todays.length ? 'Keine weiteren Termine heute' : 'Heute ist frei'}</p>
              <p className="mt-2 text-[14px] opacity-90">{open.length ? open.length + ' offene To-do' + (open.length > 1 ? 's' : '') + ' warten.' : 'Nichts Offenes. Gönn dir was.'}</p>
            </>
          )}
          {planHint && (
            <button onClick={() => go('planner')} className="mt-3 flex w-full items-center gap-2 rounded-md bg-white/15 px-3 py-2 text-left">
              <span className="text-[16px]">{PLAN_ICON[planHint.block.type] ?? '•'}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold uppercase tracking-wider opacity-80">Laut Plan · {planHint.block.time}{planHint.block.end ? '–' + planHint.block.end : ''}</span>
                <span className="block truncate text-[14px] font-semibold">{planHint.block.title}</span>
              </span>
              <ChevronRight size={16} className="opacity-70" />
            </button>
          )}
        </Card>
      )}

      {layout === 'classic' && show.birthdays && <BirthdayCard events={events} day={day} />}

      {layout === 'classic' && show.progress && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat label="To-dos" value={done.length + '/' + visible} pct={visible ? done.length / visible : 0} onClick={() => go('tasks')} />
          <Stat label="Termine" value={eventsLeft ? eventsLeft + ' offen' : timedToday.length ? 'fertig' : todays.length ? todays.length + ' ganztägig' : 'keine'} pct={timedToday.length ? (timedToday.length - eventsLeft) / timedToday.length : 0} onClick={() => setCalendar({ open: true, day })} />
          <Stat label="Plan" value={plan ? (planNow ? planNow.done + '/' + planNow.total : plan.blocks.length + ' Blöcke') : 'noch keiner'} pct={plan && planNow ? planNow.done / planNow.total : plan ? 1 : 0} onClick={() => go('planner')} />
        </div>
      )}

      {layout === 'classic' && show.habits && <HabitsCard />}

      {layout === 'classic' && show.meal && meal && (
        <>
          <SectionLabel>Heute essen</SectionLabel>
          <Card className="p-0">
            <div className="flex items-stretch divide-x divide-line">
              {meal.slots.map((s) => (
                <button key={s.id} onClick={() => go('planner')} className={'press min-w-0 flex-1 px-3 py-2.5 text-left ' + (s.id === meal.activeId ? '' : 'opacity-60')}>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-text-3">{s.icon} {s.label}</span>
                  <span className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-snug">{s.meal!.name}</span>
                </button>
              ))}
            </div>
          </Card>
        </>
      )}

      {layout === 'classic' && show.todos && (
        <>
          <SectionLabel>To-dos {visible > 0 && <span className="normal-case tracking-normal">· {done.length}/{visible}</span>}</SectionLabel>
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
        </>
      )}

      {layout === 'classic' && show.calendar && (
        <>
          <SectionLabel>Kalender</SectionLabel>
          <CalendarWidget events={events} nowMin={nowMin} onOpen={(d) => setCalendar({ open: true, day: d ?? day })} onTapEvent={(e) => setDraft({ ...e })} onAdd={newEventToday} />
        </>
      )}

      {layout === 'classic' && show.work && <WorkCard events={events} day={day} nowMin={nowMin} />}

      {layout === 'classic' && show.dayClose && <DayCloseCard hour={Math.floor(nowMin / 60)} eventsTotal={timedToday.length} eventsLeft={eventsLeft} />}

      {layout === 'classic' && !plan && show.focus && (
        <button onClick={() => go('planner')} className="press mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-accent-soft py-2.5 text-[13px] font-semibold text-accent">
          <ClipboardList size={15} /> Tag von der KI planen lassen
        </button>
      )}

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
