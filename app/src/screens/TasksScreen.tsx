import { Check, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Card } from '../components/Card'
import { Screen } from '../components/Screen'
import { Segmented } from '../components/Segmented'
import { Sheet } from '../components/Sheet'
import { ShoppingView } from '../components/tasks/ShoppingView'
import { LISTS, type ListId, type Task } from '../lib/model'
import { useStore } from '../store/useStore'

const LIST_KEY = 'organizer_v8_list'

export function TasksScreen() {
  const [list, setListState] = useState<ListId>(() => readList())
  const setList = (l: ListId) => {
    setListState(l)
    try { localStorage.setItem(LIST_KEY, l) } catch { /* egal */ }
  }
  const counts = useStore((s) => LISTS.map((l) => s.tasks[l.id].filter((t) => !t.done).length).join(','))
  const open = counts.split(',').map(Number)

  return (
    <Screen title="To-dos" subtitle={open.reduce((a, b) => a + b, 0) + ' offen'}>
      <Segmented
        options={LISTS.map((l, i) => ({ id: l.id, label: l.label + (open[i] ? ' ' + open[i] : '') }))}
        value={list}
        onChange={setList}
      />
      {list === 'shopping' ? <ShoppingView /> : <TaskList list={list} />}
    </Screen>
  )
}

function TaskList({ list }: { list: ListId }) {
  const tasks = useStore((s) => s.tasks[list])
  const addTask = useStore((s) => s.addTask)
  const toggleTask = useStore((s) => s.toggleTask)
  const clearDone = useStore((s) => s.clearDone)
  const [text, setText] = useState('')
  const [editing, setEditing] = useState<Task | null>(null)
  const open = tasks.filter((t) => !t.done)
  const done = tasks.filter((t) => t.done)

  const submit = () => {
    const t = text.trim()
    if (!t) return
    addTask(list, t)
    setText('')
  }

  return (
    <>
      <Card className="mt-3 p-0">
        <form onSubmit={(e) => { e.preventDefault(); submit() }} className="flex items-center gap-2 px-3 py-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center text-accent"><Plus size={18} strokeWidth={2.5} /></span>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Neue Aufgabe" enterKeyHint="done" className="flex-1 bg-transparent py-1 text-[15px] outline-none placeholder:text-text-3" />
        </form>
        {open.length === 0 && done.length === 0 && <p className="border-t border-line px-4 py-4 text-center text-[13px] text-text-3">Nichts offen. Schön.</p>}
        {open.length > 0 && (
          <div className="border-t border-line py-1">
            {open.map((t) => <TaskRow key={t.id} t={t} onToggle={() => toggleTask(list, t.id)} onEdit={() => setEditing(t)} />)}
          </div>
        )}
      </Card>

      {done.length > 0 && (
        <>
          <div className="mb-2 mt-5 flex items-center justify-between px-1">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-text-3">Erledigt · {done.length}</h2>
            <button onClick={() => clearDone(list)} className="text-[12px] font-semibold text-accent">Aufräumen</button>
          </div>
          <Card className="p-0">
            <div className="py-1">
              {done.map((t) => <TaskRow key={t.id} t={t} onToggle={() => toggleTask(list, t.id)} onEdit={() => setEditing(t)} />)}
            </div>
          </Card>
        </>
      )}

      <TaskSheet task={editing} list={list} onClose={() => setEditing(null)} />
    </>
  )
}

export function TaskRow({ t, onToggle, onEdit }: { t: Task; onToggle: () => void; onEdit: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <button aria-label={t.done ? 'Als offen markieren' : 'Erledigt'} onClick={onToggle} className={'press grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors ' + (t.done ? 'border-accent bg-accent text-on-accent' : 'border-fill-strong')}>
        {t.done && <Check size={14} strokeWidth={3} />}
      </button>
      <button onClick={onEdit} className={'min-w-0 flex-1 py-1 text-left text-[15px] ' + (t.done ? 'text-text-3 line-through' : '')}>{t.text}</button>
    </div>
  )
}

function TaskSheet({ task, list, onClose }: { task: Task | null; list: ListId; onClose: () => void }) {
  const renameTask = useStore((s) => s.renameTask)
  const deleteTask = useStore((s) => s.deleteTask)
  const moveTask = useStore((s) => s.moveTask)
  const [text, setText] = useState(task?.text ?? '')
  const [key, setKey] = useState<string | null>(null)
  if (task && key !== task.id) { setKey(task.id); setText(task.text) }
  if (!task) return null
  const save = () => {
    if (text.trim() && text.trim() !== task.text) renameTask(list, task.id, text.trim())
    onClose()
  }
  return (
    <Sheet open onClose={onClose} title="Aufgabe" right={<button onClick={save} className="press rounded-full bg-accent px-4 py-1.5 text-[14px] font-semibold text-on-accent">Fertig</button>}>
      <input value={text} onChange={(e) => setText(e.target.value)} className="w-full rounded-md bg-fill px-3 py-2.5 text-[17px] font-semibold outline-none" />
      <p className="mb-2 mt-4 text-[13px] font-semibold uppercase tracking-wider text-text-3">Verschieben nach</p>
      <div className="grid grid-cols-2 gap-2">
        {LISTS.filter((l) => l.id !== list).map((l) => (
          <button key={l.id} onClick={() => { moveTask(list, l.id, task.id); onClose() }} className="press rounded-md bg-fill px-3 py-2.5 text-[14px] font-semibold">{l.emoji} {l.label}</button>
        ))}
      </div>
      <button onClick={() => { deleteTask(list, task.id); onClose() }} className="press mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-red/10 py-2.5 text-[15px] font-semibold text-red">
        <Trash2 size={16} /> Löschen
      </button>
    </Sheet>
  )
}

function readList(): ListId {
  try {
    const v = localStorage.getItem(LIST_KEY)
    return LISTS.some((l) => l.id === v) ? (v as ListId) : 'today'
  } catch {
    return 'today'
  }
}
