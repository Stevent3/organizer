import { ChevronDown, ChevronRight, ClipboardList, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { TabId } from '../../app/tabs'
import { Card, SectionLabel } from '../../components/Card'
import { DayCloseCard } from '../../components/DayCloseCard'
import { HabitsSheet } from '../../components/HabitsCard'
import { QuickAdd } from '../../components/QuickAdd'
import { CalendarWidget } from '../../components/calendar/CalendarWidget'
import { timedRange } from '../../lib/calendar'
import { colorVar } from '../../lib/colors'
import type { DashSection } from '../../lib/dashboard'
import { isDone, isDue, readHabits, toggleHabit } from '../../lib/habits'
import type { EventItem, Task } from '../../lib/model'
import { PLAN_ICON, type DayPlan, type Meal, type MealSlot, type PlanBlock } from '../../lib/planner'
import { useStore } from '../../store/useStore'
import { departureMin, useTravel } from '../../lib/travel'
import { timeToMin, minToTime } from '../../lib/time'
import { Stat, TaskLine, fmtMin } from './bits'
import { WorkCard } from './WorkCard'
import { BirthdayCard } from './BirthdayCard'

/** Alles, was die Heute-Seite berechnet – beide Layouts (Glance, Klassisch) bekommen dieselben Daten */
export type TodayData = {
  day: string
  nowMin: number
  events: EventItem[]
  todays: EventItem[]
  focus: { ev: EventItem; kind: 'now' | 'next'; min: number } | null
  plan: DayPlan | null
  planNow: { block: PlanBlock; done: number; total: number } | null
  planHint: { block: PlanBlock; done: number; total: number } | null
  meal: { tag: string; slots: { id: MealSlot; label: string; icon: string; meal: Meal | null }[]; activeId: string } | null
  open: Task[]
  done: Task[]
  visible: number
  timedToday: EventItem[]
  eventsLeft: number
  show: Record<DashSection, boolean>
  go: (tab: TabId) => void
  openCalendar: (day?: string) => void
  openEvent: (ev: EventItem) => void
  newEvent: () => void
  toggleTask: (id: string) => void
  addTask: (text: string) => void
}

const MAX_EVENTS = 6
const MAX_TODOS = 4

/**
 * Layout „Auf einen Blick" (Steven, 10.09.2026): Beim Öffnen ist alles Wichtige ohne Scrollen sichtbar –
 * Jetzt dran, Kennzahlen, Termine und To-dos nebeneinander, Routinen, Essen. Erst darunter („Mehr")
 * kommen Monatskalender, vollständige To-do-Liste und Tagesabschluss.
 */
export function Glance(d: TodayData) {
  const extra = useStore((s) => s.extra)
  const setExtra = useStore((s) => s.setExtra)
  const habits = useMemo(() => readHabits(extra), [extra])
  const due = habits.filter((h) => isDue(h, d.day))
  const habitsDone = due.filter((h) => isDone(h, d.day)).length
  const [manage, setManage] = useState(false)
  const [newTask, setNewTask] = useState('')
  const submitTask = () => {
    const t = newTask.trim()
    if (!t) return
    d.addTask(t)
    setNewTask('')
  }

  // Termine der Kachel: Ganztägiges als Chips, dann Uhrzeit-Termine – wenn zu viele, fallen Vergangene zuerst weg
  const allDay = d.todays.filter((e) => !timedRange(e))
  const timed = d.todays.filter((e) => timedRange(e))
  const upcoming = timed.filter((e) => timedRange(e)!.end > d.nowMin)
  const shownTimed = timed.length <= MAX_EVENTS ? timed : upcoming.length >= MAX_EVENTS ? upcoming.slice(0, MAX_EVENTS) : timed.slice(timed.length - MAX_EVENTS)
  const hiddenEvents = timed.length - shownTimed.length
  const hiddenTodos = Math.max(0, d.open.length - MAX_TODOS)

  const f = d.focus
  const travel = useTravel(f?.kind === 'next' ? f.ev.sub : undefined, f?.ev.source === 'calendar')
  const depart = f?.kind === 'next' && travel ? departureMin(timeToMin(f.ev.time) ?? 0, travel) : null
  const heroTitle = f ? f.ev.text : d.todays.length ? 'Keine weiteren Termine' : 'Heute ist frei'
  const heroSub = f
    ? f.ev.time + (f.ev.end ? ' – ' + f.ev.end : '') + (f.ev.sub ? ' · ' + f.ev.sub : '')
    : d.open.length ? d.open.length + ' offene To-do' + (d.open.length > 1 ? 's' : '') + ' warten' : 'Nichts Offenes. Gönn dir was.'

  return (
    <>
      {d.show.quickAdd && <div className="mb-2"><QuickAdd /></div>}

      {d.show.focus && (
        <Card tone="accent" className="p-3.5!">
          <button onClick={() => (f ? d.openEvent(f.ev) : d.go('calendar'))} className="flex w-full items-center gap-3 text-left">
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold uppercase tracking-wider opacity-80">{f?.kind === 'now' ? 'Jetzt dran' : f ? 'Als Nächstes' : 'Jetzt dran'}</span>
              <span className="block truncate text-[19px] font-bold leading-tight">{heroTitle}</span>
              <span className="block truncate text-[13px] opacity-90">{heroSub}</span>
            </span>
            {f && <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-[12px] font-semibold">{f.kind === 'now' ? 'noch ' + fmtMin(f.min) : 'in ' + fmtMin(f.min)}</span>}
          </button>
          {depart != null && (
            <p className={'mt-2 flex items-center gap-1.5 text-[12.5px] font-semibold ' + (depart <= d.nowMin ? '' : 'opacity-90')}>
              🚗 {depart <= d.nowMin ? 'Jetzt losgehen' : 'Losgehen um ' + minToTime(depart)} <span className="font-normal opacity-80">· {travel} Min Fahrt</span>
            </p>
          )}
          {d.planHint && (
            <button onClick={() => d.go('planner')} className="mt-2.5 flex w-full items-center gap-2 rounded-md bg-white/15 px-2.5 py-1.5 text-left">
              <span className="text-[15px]">{PLAN_ICON[d.planHint.block.type] ?? '•'}</span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                <span className="opacity-80">Plan {d.planHint.block.time}{d.planHint.block.end ? '–' + d.planHint.block.end : ''} · </span>{d.planHint.block.title}
              </span>
              <ChevronRight size={15} className="opacity-70" />
            </button>
          )}
        </Card>
      )}

      {d.show.birthdays && <BirthdayCard events={d.events} day={d.day} />}

      {d.show.progress && (
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Stat label="To-dos" value={d.done.length + '/' + d.visible} pct={d.visible ? d.done.length / d.visible : 0} onClick={() => d.go('tasks')} />
          <Stat label="Termine" value={d.eventsLeft ? d.eventsLeft + ' offen' : d.timedToday.length ? 'fertig' : d.todays.length ? d.todays.length + ' ganztägig' : 'keine'} pct={d.timedToday.length ? (d.timedToday.length - d.eventsLeft) / d.timedToday.length : 0} onClick={() => d.openCalendar()} />
          <Stat label="Plan" value={d.plan ? (d.planNow ? d.planNow.done + '/' + d.planNow.total : d.plan.blocks.length + ' Blöcke') : 'noch keiner'} pct={d.plan && d.planNow ? d.planNow.done / d.planNow.total : d.plan ? 1 : 0} onClick={() => d.go('planner')} />
        </div>
      )}

      {(d.show.calendar || d.show.todos || d.show.habits || (d.show.meal && d.meal)) && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {d.show.calendar && (
            <Tile title="Heute" count={d.todays.length} onHeader={() => d.openCalendar()} className={d.show.todos ? '' : 'col-span-2'}>
              {allDay.slice(0, 2).map((e) => (
                <button key={e.id} onClick={() => d.openEvent(e)} className="press mb-1 flex w-full items-center gap-1.5 rounded-md bg-fill px-2 py-1 text-left">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colorVar(e.color) }} />
                  <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">{e.text}</span>
                </button>
              ))}
              {shownTimed.map((e) => {
                const r = timedRange(e)!
                const past = r.end <= d.nowMin, running = r.start <= d.nowMin && !past
                return (
                  <button key={e.id} onClick={() => d.openEvent(e)} className="press flex w-full items-center gap-1.5 py-[5px] text-left">
                    <span className={'w-[34px] shrink-0 font-mono text-[11px] ' + (past ? 'text-text-3' : running ? 'font-bold text-accent' : 'text-text-2')}>{e.time}</span>
                    <span className={'h-4 w-[3px] shrink-0 rounded-full ' + (past ? 'opacity-40' : '')} style={{ background: colorVar(e.color) }} />
                    <span className={'min-w-0 flex-1 truncate text-[12.5px] font-medium ' + (past ? 'text-text-3' : '')}>{e.text}</span>
                  </button>
                )
              })}
              {d.todays.length === 0 && <p className="py-2 text-[12px] text-text-3">Nichts eingetragen.</p>}
              <button onClick={hiddenEvents ? () => d.openCalendar() : d.newEvent} className="press mt-1 flex w-full items-center gap-1 text-[12px] font-semibold text-accent">
                {hiddenEvents ? <>+{hiddenEvents} weitere <ChevronRight size={13} /></> : <><Plus size={13} strokeWidth={2.5} /> Termin</>}
              </button>
            </Tile>
          )}

          {d.show.todos && (
            <Tile title="To-dos" count={d.visible ? d.done.length + '/' + d.visible : undefined} onHeader={() => d.go('tasks')} className={d.show.calendar ? '' : 'col-span-2'}>
              {d.open.slice(0, MAX_TODOS).map((t) => <TaskLine key={t.id} compact text={t.text} done={false} onToggle={() => d.toggleTask(t.id)} />)}
              {d.open.length === 0 && <p className="py-2 text-[12px] text-text-3">{d.done.length ? 'Alles erledigt ✓' : 'Nichts offen.'}</p>}
              <button onClick={() => d.go('tasks')} className="press mt-1 flex w-full items-center gap-1 text-[12px] font-semibold text-accent">
                {hiddenTodos ? <>+{hiddenTodos} weitere <ChevronRight size={13} /></> : <><Plus size={13} strokeWidth={2.5} /> To-do</>}
              </button>
            </Tile>
          )}

          {d.show.habits && (
            <Tile title="Routinen" count={due.length ? habitsDone + '/' + due.length : undefined} onHeader={() => setManage(true)} className={d.show.meal && d.meal ? '' : 'col-span-2'}>
              {due.length === 0 ? (
                <button onClick={() => setManage(true)} className="press py-1 text-left text-[12px] text-text-3">Noch keine Routine. Tippen zum Anlegen.</button>
              ) : (
                <div className="flex flex-wrap gap-1.5 py-0.5">
                  {due.map((h) => {
                    const on = isDone(h, d.day)
                    return (
                      <button key={h.id} onClick={() => setExtra({ habits: toggleHabit(habits, h.id, d.day) })} aria-label={h.name} title={h.name} className={'press grid h-8 w-8 place-items-center rounded-full text-[15px] transition-colors ' + (on ? 'bg-accent' : 'bg-fill')}>
                        <span className={on ? 'opacity-90' : ''}>{h.emoji}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </Tile>
          )}

          {d.show.meal && d.meal && (() => {
            const active = d.meal.slots.find((s) => s.id === d.meal!.activeId) ?? d.meal.slots[0]
            const rest = d.meal.slots.filter((s) => s !== active)
            return (
              <Tile title="Essen" onHeader={() => d.go('planner')} className={d.show.habits ? '' : 'col-span-2'}>
                <button onClick={() => d.go('planner')} className="press w-full text-left">
                  <span className="block text-[10.5px] font-semibold uppercase tracking-wider text-text-3">{active.meal?.unterwegs ? '🚌' : active.icon} {active.label}</span>
                  <span className="block truncate text-[13px] font-semibold">{active.meal?.name}</span>
                  <span className="mt-1 block truncate text-[11px] text-text-3">{rest.map((s) => s.label + ': ' + s.meal?.name).join(' · ')}</span>
                </button>
              </Tile>
            )
          })()}
        </div>
      )}

      {/* ── Erweiterung unterhalb der ersten Seite ── */}
      <div className="mb-1 mt-7 flex items-center gap-1.5 px-1 text-[12px] font-semibold uppercase tracking-wider text-text-3"><ChevronDown size={14} /> Mehr</div>

      {d.show.calendar && (
        <CalendarWidget events={d.events} nowMin={d.nowMin} onOpen={d.openCalendar} onTapEvent={d.openEvent} onAdd={d.newEvent} />
      )}

      {d.show.work && <WorkCard events={d.events} day={d.day} nowMin={d.nowMin} />}

      {d.show.todos && (
        <>
          <SectionLabel>To-dos {d.visible > 0 && <span className="normal-case tracking-normal">· {d.done.length}/{d.visible}</span>}</SectionLabel>
          <Card className="p-0">
            {d.open.map((t) => <TaskLine key={t.id} text={t.text} done={false} onToggle={() => d.toggleTask(t.id)} />)}
            <form onSubmit={(e) => { e.preventDefault(); submitTask() }} className={'flex items-center gap-2 px-3 py-2 ' + (d.open.length ? 'border-t border-line' : '')}>
              <span className="grid h-6 w-6 shrink-0 place-items-center text-accent"><Plus size={18} strokeWidth={2.5} /></span>
              <input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="To-do hinzufügen" enterKeyHint="done" className="flex-1 bg-transparent py-1 text-[15px] outline-none placeholder:text-text-3" />
            </form>
            {d.done.length > 0 && (
              <details className="border-t border-line">
                <summary className="cursor-pointer list-none px-4 py-2 text-[12px] font-semibold text-text-3">Erledigt · {d.done.length}</summary>
                {d.done.map((t) => <TaskLine key={t.id} text={t.text} done onToggle={() => d.toggleTask(t.id)} />)}
              </details>
            )}
          </Card>
        </>
      )}

      {d.show.dayClose && <DayCloseCard hour={Math.floor(d.nowMin / 60)} eventsTotal={d.timedToday.length} eventsLeft={d.eventsLeft} />}

      {!d.plan && d.show.focus && (
        <button onClick={() => d.go('planner')} className="press mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-accent-soft py-2.5 text-[13px] font-semibold text-accent">
          <ClipboardList size={15} /> Tag von der KI planen lassen
        </button>
      )}

      <HabitsSheet open={manage} habits={habits} onClose={() => setManage(false)} onSave={(l) => setExtra({ habits: l })} />
    </>
  )
}

/** Kachel im Zwei-Spalten-Raster: Kopf mit Titel + Zähler (tippbar), darunter Inhalt */
function Tile({ title, count, onHeader, className = '', children }: { title: string; count?: number | string; onHeader: () => void; className?: string; children: React.ReactNode }) {
  return (
    <section className={'flex min-w-0 flex-col rounded-lg bg-elev px-3 pb-2 pt-2.5 shadow-sm ' + className}>
      <button onClick={onHeader} className="press mb-1 flex w-full items-center justify-between text-left">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-3">{title}</span>
        {count !== undefined && <span className="rounded-full bg-fill px-1.5 py-0.5 text-[10.5px] font-bold text-text-2">{count}</span>}
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </section>
  )
}
