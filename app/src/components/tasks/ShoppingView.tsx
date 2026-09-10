import { Check, Minus, Plus, ShoppingBasket, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Card } from '../Card'
import { Sheet } from '../Sheet'
import type { Task } from '../../lib/model'
import { UNITS, capitalize, defaultUnit, groupByCat, parseQuantity, recentItems, recommendations, shopBaseName, shopInfo, suggest, type Unit } from '../../lib/shopping'
import { useStore } from '../../store/useStore'

/** Einkaufsliste im Bring-Stil: Eingabe mit Vorschlägen, Liste nach Kategorie, Korb, Empfehlungen, zuletzt gekauft, Mengen */
export function ShoppingView() {
  const items = useStore((s) => s.tasks.shopping)
  const history = useStore((s) => s.shopHistory)
  const extra = useStore((s) => s.extra)
  const addTask = useStore((s) => s.addTask)
  const toggleTask = useStore((s) => s.toggleTask)
  const completeShopping = useStore((s) => s.completeShopping)
  const [text, setText] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [editing, setEditing] = useState<Task | null>(null)

  const open = items.filter((t) => !t.done)
  const cart = items.filter((t) => t.done)
  const onList = useMemo(() => new Set(items.map((t) => shopBaseName(t.text))), [items])
  const tips = useMemo(() => suggest(parseQuantity(text).name, onList, 6), [text, onList])
  const recos = useMemo(() => recommendations(items, history, extra), [items, history, extra])
  const recent = useMemo(() => recentItems(items, history).filter((r) => !recos.includes(r)), [items, history, recos])
  const groups = useMemo(() => groupByCat(open), [open])

  const flash = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(null), 2000)
  }
  const add = (raw: string) => {
    const { name, qty } = parseQuantity(raw)
    const n = name.trim()
    if (!n) return
    if (onList.has(shopBaseName(n))) { flash(capitalize(n) + ' steht schon drauf'); setText(''); return }
    addTask('shopping', capitalize(n), qty)
    setText('')
    flash(shopInfo(n).emoji + ' ' + capitalize(n) + (qty ? ' (' + qty + ')' : '') + ' hinzugefügt')
  }
  const finish = () => {
    const n = completeShopping()
    if (n) flash('Einkauf abgeschlossen, ' + n + ' Artikel gemerkt')
  }

  const Label = ({ children }: { children: React.ReactNode }) => <h2 className="mb-2 mt-5 px-1 text-[13px] font-semibold uppercase tracking-wider text-text-3">{children}</h2>

  return (
    <>
      <Card className="mt-3 p-0">
        <form onSubmit={(e) => { e.preventDefault(); add(text) }} className="flex items-center gap-2 px-3 py-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center text-accent"><Plus size={18} strokeWidth={2.5} /></span>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Artikel, z. B. 2 kg Kartoffeln" enterKeyHint="done" autoCapitalize="sentences" className="flex-1 bg-transparent py-1 text-[15px] outline-none placeholder:text-text-3" />
        </form>
        {tips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-t border-line px-3 py-2">
            {tips.map((k) => (
              <button key={k} onClick={() => add((parseQuantity(text).qty ? parseQuantity(text).qty + ' ' : '') + k)} className="press rounded-full bg-fill px-2.5 py-1 text-[13px] font-medium">{shopInfo(k).emoji} {capitalize(k)}</button>
            ))}
          </div>
        )}
      </Card>
      {toast && <p className="mt-2 rounded-md bg-accent-soft px-3 py-2 text-center text-[13px] font-medium text-accent">{toast}</p>}

      {open.length === 0 && cart.length === 0 && (
        <Card className="mt-4 text-center">
          <ShoppingBasket size={28} className="mx-auto text-text-3" />
          <p className="mt-2 text-[15px] font-semibold">Liste ist leer</p>
          <p className="mt-1 text-[13px] text-text-2">Tipp oben etwas ein oder nimm einen Vorschlag von unten.</p>
        </Card>
      )}

      {groups.map(({ cat, items: list }) => (
        <section key={cat.id}>
          <Label>{cat.emoji} {cat.name}</Label>
          <div className="grid grid-cols-3 gap-2">
            {list.map((t) => <Tile key={t.id} t={t} onTap={() => toggleTask('shopping', t.id)} onLong={() => setEditing(t)} />)}
          </div>
        </section>
      ))}

      {cart.length > 0 && (
        <section>
          <Label>Im Korb · {cart.length}</Label>
          <div className="grid grid-cols-3 gap-2">
            {cart.map((t) => <Tile key={t.id} t={t} inCart onTap={() => toggleTask('shopping', t.id)} onLong={() => setEditing(t)} />)}
          </div>
          <button onClick={finish} className="press mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-accent py-3 text-[15px] font-semibold text-on-accent shadow-md">
            <Check size={18} strokeWidth={2.5} /> Einkauf abschließen ({cart.length})
          </button>
        </section>
      )}

      {recos.length > 0 && (
        <section>
          <Label>Empfehlungen</Label>
          <div className="grid grid-cols-3 gap-2">
            {recos.map((r) => <SuggestTile key={r} name={r} onTap={() => add(r)} />)}
          </div>
        </section>
      )}
      {recent.length > 0 && (
        <section>
          <Label>Zuletzt gekauft</Label>
          <div className="grid grid-cols-3 gap-2">
            {recent.map((r) => <SuggestTile key={r} name={r} onTap={() => add(r)} />)}
          </div>
        </section>
      )}

      <ItemSheet task={editing} onClose={() => setEditing(null)} />
    </>
  )
}

function Tile({ t, inCart = false, onTap, onLong }: { t: Task; inCart?: boolean; onTap: () => void; onLong: () => void }) {
  const info = shopInfo(t.text)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fired = useRef(false)
  const start = () => { fired.current = false; timer.current = setTimeout(() => { fired.current = true; onLong() }, 450) }
  const stop = () => { if (timer.current) clearTimeout(timer.current); timer.current = null }
  return (
    <button
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => { if (!fired.current) onTap() }}
      className={'press relative flex h-[88px] flex-col items-center justify-center gap-1 rounded-md px-2 text-center transition-colors ' + (inCart ? 'bg-accent-soft opacity-70' : 'bg-elev shadow-sm')}
      style={{ WebkitTouchCallout: 'none' }}
    >
      {t.qty && <span className="absolute right-1.5 top-1.5 rounded-full bg-fill px-1.5 py-0.5 text-[10px] font-semibold text-text-2">{t.qty}</span>}
      <span className="text-[26px] leading-none">{info.emoji}</span>
      <span className={'line-clamp-2 text-[12px] font-medium leading-tight ' + (inCart ? 'line-through text-text-2' : '')}>{t.text}</span>
    </button>
  )
}

function SuggestTile({ name, onTap }: { name: string; onTap: () => void }) {
  return (
    <button onClick={onTap} className="press flex h-[72px] flex-col items-center justify-center gap-1 rounded-md border border-dashed border-line bg-transparent px-2 text-center">
      <span className="text-[22px] leading-none">{shopInfo(name).emoji}</span>
      <span className="line-clamp-1 text-[12px] font-medium text-text-2">{capitalize(name)}</span>
    </button>
  )
}

/** Menge (Zahl + Einheit) und Entfernen */
function ItemSheet({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const setTaskQty = useStore((s) => s.setTaskQty)
  const deleteTask = useStore((s) => s.deleteTask)
  const [num, setNum] = useState(1)
  const [unit, setUnit] = useState<Unit>('Stk.')
  const [key, setKey] = useState<string | null>(null)
  if (task && key !== task.id) {
    setKey(task.id)
    const m = /^(\d+(?:,\d+)?)\s*(.+)$/.exec(task.qty ?? '')
    setNum(m ? Number(m[1].replace(',', '.')) : 1)
    setUnit(m && (UNITS as readonly string[]).includes(m[2]) ? (m[2] as Unit) : defaultUnit(shopInfo(task.text).cat))
  }
  if (!task) return null
  const step = unit === 'g' || unit === 'ml' ? 50 : unit === 'kg' || unit === 'L' ? 0.5 : 1
  const fmt = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',')
  const save = () => { setTaskQty('shopping', task.id, fmt(num) + ' ' + unit); onClose() }
  const clear = () => { setTaskQty('shopping', task.id, ''); onClose() }
  return (
    <Sheet open onClose={onClose} title={shopInfo(task.text).emoji + ' ' + task.text} right={<button onClick={save} className="press rounded-full bg-accent px-4 py-1.5 text-[14px] font-semibold text-on-accent">Fertig</button>}>
      <p className="text-[13px] font-semibold uppercase tracking-wider text-text-3">Menge</p>
      <div className="mt-2 flex items-center justify-center gap-4">
        <button aria-label="Weniger" onClick={() => setNum((n) => Math.max(step, n - step))} className="press grid h-11 w-11 place-items-center rounded-full bg-fill"><Minus size={18} /></button>
        <span className="min-w-[110px] text-center text-[28px] font-bold tabular-nums">{fmt(num)} <span className="text-[16px] font-semibold text-text-2">{unit}</span></span>
        <button aria-label="Mehr" onClick={() => setNum((n) => n + step)} className="press grid h-11 w-11 place-items-center rounded-full bg-fill"><Plus size={18} /></button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {UNITS.map((u) => (
          <button key={u} onClick={() => { setUnit(u); setNum(u === 'g' || u === 'ml' ? 250 : 1) }} className={'press rounded-full px-3 py-1.5 text-[13px] font-semibold ' + (u === unit ? 'bg-accent text-on-accent' : 'bg-fill text-text-2')}>{u}</button>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        {task.qty && <button onClick={clear} className="press flex-1 rounded-md bg-fill py-2.5 text-[14px] font-semibold">Menge entfernen</button>}
        <button onClick={() => { deleteTask('shopping', task.id); onClose() }} className="press flex flex-1 items-center justify-center gap-2 rounded-md bg-red/10 py-2.5 text-[14px] font-semibold text-red"><Trash2 size={15} /> Von der Liste</button>
      </div>
    </Sheet>
  )
}
