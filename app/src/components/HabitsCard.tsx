import { Check, Flame, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { HABIT_PRESETS, addHabit, isDone, isDue, lastDays, readHabits, removeHabit, streak, toggleHabit, type Habit } from '../lib/habits'
import { todayKey } from '../lib/time'
import { useStore } from '../store/useStore'
import { Card, SectionLabel } from './Card'
import { Sheet } from './Sheet'

const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const WD_NUM = [1, 2, 3, 4, 5, 6, 0]
const EMOJIS = ['✅', '💧', '🏃', '📚', '🎓', '🧘', '🌙', '🧹', '💊', '🎸', '🥗', '✍️']

/** Dashboard: Gewohnheiten des Tages abhaken, Serie sehen, verwalten */
export function HabitsCard() {
  const extra = useStore((s) => s.extra)
  const setExtra = useStore((s) => s.setExtra)
  const day = todayKey()
  const habits = useMemo(() => readHabits(extra), [extra])
  const due = habits.filter((h) => isDue(h, day))
  const [manage, setManage] = useState(false)
  const save = (l: Habit[]) => setExtra({ habits: l })
  const doneCount = due.filter((h) => isDone(h, day)).length

  return (
    <>
      <SectionLabel>
        <span className="flex items-center justify-between">
          <span>Gewohnheiten {due.length > 0 && <span className="normal-case tracking-normal">· {doneCount}/{due.length}</span>}</span>
          <button onClick={() => setManage(true)} aria-label="Gewohnheiten verwalten" className="press grid h-6 w-6 place-items-center rounded-full bg-fill text-text-2"><Plus size={14} strokeWidth={2.5} /></button>
        </span>
      </SectionLabel>
      <Card className="p-0">
        {due.length === 0 && (
          <button onClick={() => setManage(true)} className="press w-full px-4 py-3 text-left">
            <p className="text-[14px] font-semibold">Noch keine Routine{habits.length ? ' für heute' : ''}.</p>
            <p className="text-[12px] text-text-3">Kleine Dinge, jeden Tag: Wasser, Bewegung, ein Thesis-Block. Tippen zum Anlegen.</p>
          </button>
        )}
        {due.map((h, i) => {
          const done = isDone(h, day)
          const s = streak(h, day)
          return (
            <div key={h.id} className={'flex items-center gap-3 px-3 py-2 ' + (i ? 'border-t border-line' : '')}>
              <button onClick={() => save(toggleHabit(habits, h.id, day))} aria-label={done ? h.name + ' als offen markieren' : h.name + ' erledigt'} className={'press grid h-9 w-9 shrink-0 place-items-center rounded-full text-[18px] transition-colors ' + (done ? 'bg-accent text-on-accent' : 'bg-fill')}>
                {done ? <Check size={18} strokeWidth={3} /> : h.emoji}
              </button>
              <span className="min-w-0 flex-1">
                <span className={'block truncate text-[14px] font-semibold ' + (done ? 'text-text-3' : '')}>{h.name}</span>
                <span className="mt-0.5 flex gap-1">
                  {lastDays(h, 7, day).map((d) => (
                    <span key={d.day} className={'h-1.5 w-3 rounded-full ' + (d.done ? 'bg-accent' : d.due ? 'bg-fill-strong' : 'bg-fill')} />
                  ))}
                </span>
              </span>
              {s > 0 && <span className={'flex items-center gap-0.5 text-[12px] font-bold ' + (s >= 3 ? 'text-orange' : 'text-text-3')}><Flame size={13} /> {s}</span>}
            </div>
          )
        })}
      </Card>
      <HabitsSheet open={manage} habits={habits} onClose={() => setManage(false)} onSave={save} />
    </>
  )
}

function HabitsSheet({ open, habits, onClose, onSave }: { open: boolean; habits: Habit[]; onClose: () => void; onSave: (l: Habit[]) => void }) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('✅')
  const [days, setDays] = useState<number[]>([])
  const add = (n = name, e = emoji) => {
    if (!n.trim()) return
    onSave(addHabit(habits, n, e, days))
    setName(''); setEmoji('✅'); setDays([])
  }
  const toggleDay = (d: number) => setDays((ds) => (ds.includes(d) ? ds.filter((x) => x !== d) : [...ds, d]))
  return (
    <Sheet open={open} onClose={onClose} title="Gewohnheiten">
      <form onSubmit={(e) => { e.preventDefault(); add() }} className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Neue Routine" className="min-w-0 flex-1 rounded-md bg-fill px-3 py-2.5 text-[15px] outline-none placeholder:text-text-3" />
        <button type="submit" disabled={!name.trim()} className="press rounded-md bg-accent px-4 text-[15px] font-semibold text-on-accent disabled:opacity-40">+</button>
      </form>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {EMOJIS.map((e) => <button key={e} onClick={() => setEmoji(e)} className={'press grid h-9 w-9 place-items-center rounded-full text-[18px] ' + (e === emoji ? 'bg-accent-soft ring-2 ring-accent' : 'bg-fill')}>{e}</button>)}
      </div>
      <div className="mt-2 flex gap-1">
        {WD.map((w, i) => {
          const on = days.includes(WD_NUM[i])
          return <button key={w} onClick={() => toggleDay(WD_NUM[i])} className={'press flex-1 rounded-md py-1.5 text-[12px] font-semibold ' + (on ? 'bg-accent text-on-accent' : 'bg-fill text-text-2')}>{w}</button>
        })}
      </div>
      <p className="mt-1 text-[11px] text-text-3">{days.length ? 'Nur an den markierten Tagen' : 'Keine Tage markiert = täglich'}</p>
      {habits.length === 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {HABIT_PRESETS.map((p) => <button key={p.name} onClick={() => add(p.name, p.emoji)} className="press rounded-full bg-fill px-3 py-1.5 text-[13px] font-medium">{p.emoji} {p.name}</button>)}
        </div>
      )}
      {habits.length > 0 && (
        <ul className="mt-4 divide-y divide-line rounded-md bg-fill">
          {habits.map((h) => (
            <li key={h.id} className="flex items-center gap-3 px-3 py-2">
              <span className="text-[18px]">{h.emoji}</span>
              <span className="flex-1">
                <span className="block text-[14px] font-medium">{h.name}</span>
                <span className="block text-[11px] text-text-3">{h.days.length ? h.days.map((d) => WD[WD_NUM.indexOf(d)]).join(' ') : 'täglich'} · Serie {streak(h)}</span>
              </span>
              <button onClick={() => onSave(removeHabit(habits, h.id))} aria-label={h.name + ' löschen'} className="text-text-3"><Trash2 size={15} /></button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  )
}
