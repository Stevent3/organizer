import { Check, Plus, ShoppingBasket, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card } from '../Card'
import { Sheet } from '../Sheet'
import type { Task } from '../../lib/model'
import { capitalize, groupByCat, recommendations, shopBaseName, shopInfo, suggest } from '../../lib/shopping'
import { useStore } from '../../store/useStore'

/** Einkaufsliste im Bring-Stil: Eingabe mit Vorschlägen, Empfehlungen, Kacheln nach Kategorie, Korb */
export function ShoppingView() {
  const items = useStore((s) => s.tasks.shopping)
  const history = useStore((s) => s.shopHistory)
  const extra = useStore((s) => s.extra)
  const addTask = useStore((s) => s.addTask)
  const toggleTask = useStore((s) => s.toggleTask)
  const deleteTask = useStore((s) => s.deleteTask)
  const completeShopping = useStore((s) => s.completeShopping)
  const [text, setText] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [editing, setEditing] = useState<Task | null>(null)

  const open = items.filter((t) => !t.done)
  const cart = items.filter((t) => t.done)
  const onList = useMemo(() => new Set(items.map((t) => shopBaseName(t.text))), [items])
  const tips = useMemo(() => suggest(text, onList, 6), [text, onList])
  const recos = useMemo(() => recommendations(items, history, extra), [items, history, extra])
  const groups = useMemo(() => groupByCat(open), [open])

  const flash = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(null), 2000)
  }
  const add = (name: string) => {
    const n = name.trim()
    if (!n) return
    if (onList.has(shopBaseName(n))) { flash(capitalize(n) + ' steht schon drauf'); setText(''); return }
    addTask('shopping', capitalize(n))
    setText('')
    flash(shopInfo(n).emoji + ' ' + capitalize(n) + ' hinzugefügt')
  }
  const finish = () => {
    const n = completeShopping()
    if (n) flash('Einkauf abgeschlossen, ' + n + ' Artikel gemerkt')
  }

  return (
    <>
      <Card className="mt-3 p-0">
        <form onSubmit={(e) => { e.preventDefault(); add(text) }} className="flex items-center gap-2 px-3 py-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center text-accent"><Plus size={18} strokeWidth={2.5} /></span>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Artikel hinzufügen" enterKeyHint="done" autoCapitalize="sentences" className="flex-1 bg-transparent py-1 text-[15px] outline-none placeholder:text-text-3" />
        </form>
        {tips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-t border-line px-3 py-2">
            {tips.map((k) => (
              <button key={k} onClick={() => add(k)} className="press rounded-full bg-fill px-2.5 py-1 text-[13px] font-medium">{shopInfo(k).emoji} {capitalize(k)}</button>
            ))}
          </div>
        )}
      </Card>
      {toast && <p className="mt-2 rounded-md bg-accent-soft px-3 py-2 text-center text-[13px] font-medium text-accent">{toast}</p>}

      {recos.length > 0 && !text && (
        <>
          <h2 className="mb-2 mt-5 px-1 text-[13px] font-semibold uppercase tracking-wider text-text-3">Empfehlungen</h2>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {recos.map((r) => (
              <button key={r} onClick={() => add(r)} className="press shrink-0 rounded-full bg-elev px-3 py-1.5 text-[13px] font-medium shadow-sm">{shopInfo(r).emoji} {capitalize(r)}</button>
            ))}
          </div>
        </>
      )}

      {open.length === 0 && cart.length === 0 && (
        <Card className="mt-4 text-center">
          <ShoppingBasket size={28} className="mx-auto text-text-3" />
          <p className="mt-2 text-[15px] font-semibold">Liste ist leer</p>
          <p className="mt-1 text-[13px] text-text-2">Tipp oben etwas ein oder nimm eine Empfehlung.</p>
        </Card>
      )}

      {groups.map(({ cat, items: list }) => (
        <section key={cat.id}>
          <h2 className="mb-2 mt-5 px-1 text-[13px] font-semibold uppercase tracking-wider text-text-3">{cat.emoji} {cat.name}</h2>
          <div className="grid grid-cols-3 gap-2">
            {list.map((t) => <Tile key={t.id} t={t} onTap={() => toggleTask('shopping', t.id)} onLong={() => setEditing(t)} />)}
          </div>
        </section>
      ))}

      {cart.length > 0 && (
        <section>
          <h2 className="mb-2 mt-6 px-1 text-[13px] font-semibold uppercase tracking-wider text-text-3">Im Korb · {cart.length}</h2>
          <div className="grid grid-cols-3 gap-2">
            {cart.map((t) => <Tile key={t.id} t={t} inCart onTap={() => toggleTask('shopping', t.id)} onLong={() => setEditing(t)} />)}
          </div>
          <button onClick={finish} className="press mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-accent py-3 text-[15px] font-semibold text-on-accent shadow-md">
            <Check size={18} strokeWidth={2.5} /> Einkauf abschließen ({cart.length})
          </button>
        </section>
      )}

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing?.text}>
        <p className="text-[13px] text-text-2">{shopInfo(editing?.text ?? '').emoji} Artikel von der Liste entfernen?</p>
        <button onClick={() => { if (editing) deleteTask('shopping', editing.id); setEditing(null) }} className="press mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-red/10 py-2.5 text-[15px] font-semibold text-red">
          <Trash2 size={16} /> Entfernen
        </button>
      </Sheet>
    </>
  )
}

function Tile({ t, inCart = false, onTap, onLong }: { t: Task; inCart?: boolean; onTap: () => void; onLong: () => void }) {
  const info = shopInfo(t.text)
  let timer: ReturnType<typeof setTimeout> | null = null
  let fired = false
  const start = () => { fired = false; timer = setTimeout(() => { fired = true; onLong() }, 500) }
  const stop = () => { if (timer) clearTimeout(timer); timer = null }
  return (
    <button
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => { if (!fired) onTap() }}
      className={'press flex h-[84px] flex-col items-center justify-center gap-1 rounded-md px-2 text-center transition-colors ' + (inCart ? 'bg-accent-soft opacity-70' : 'bg-elev shadow-sm')}
    >
      <span className="text-[26px] leading-none">{info.emoji}</span>
      <span className={'line-clamp-2 text-[12px] font-medium leading-tight ' + (inCart ? 'line-through text-text-2' : '')}>{t.text}</span>
    </button>
  )
}
