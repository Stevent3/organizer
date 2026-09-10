import { Check, Link2, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { describeError, groqJson } from '../../lib/ai'
import { useConfig } from '../../lib/config'
import { parseJsonObject } from '../../lib/planner'
import { parseIngredient, shopInfo } from '../../lib/shopping'
import { WorkerApi } from '../../lib/worker'
import { Sheet } from '../Sheet'

type Item = { name: string; qty?: string; on: boolean }

const EXTRACT_SYSTEM =
  'Du bekommst den Text einer Rezeptseite. Extrahiere NUR die Zutatenliste des Rezepts als Einkaufsposten mit Menge, Deutsch, kurz („500 g Kartoffeln", „2 Zwiebeln"). ' +
  'Lass Salz, Pfeffer, Wasser weg. Antworte NUR mit JSON: {"title":"…","zutaten":["…"]}. Wenn kein Rezept erkennbar ist: {"title":"","zutaten":[]}.'

/** Zutaten aus einem Rezept-Link (Chefkoch & Co.) holen: schema.org-Recipe über den Worker, sonst Groq aus dem Seitentext */
export function RecipeImportSheet({ onClose, onAdd }: { onClose: () => void; onAdd: (items: { name: string; qty?: string }[]) => void }) {
  const cfg = useConfig()
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    const u = url.trim()
    if (!/^https?:\/\//i.test(u)) { setError('Bitte einen vollständigen Link (https://…) einfügen'); return }
    setBusy(true); setError(null); setItems([])
    try {
      const page = await new WorkerApi(cfg.url, cfg.secret).fetchPage(u)
      let list = page.ingredients ?? []
      let t = page.title
      if (!list.length) {
        if (!cfg.groqKey) throw new Error('Die Seite hat keine strukturierte Zutatenliste, und ohne Groq-Key kann ich sie nicht auslesen')
        const parsed = parseJsonObject(await groqJson(EXTRACT_SYSTEM, page.text.slice(0, 9000), { maxTokens: 600, temperature: 0.2 }))
        list = Array.isArray(parsed.zutaten) ? parsed.zutaten.map(String) : []
        if (typeof parsed.title === 'string' && parsed.title) t = parsed.title
      }
      if (!list.length) throw new Error('Keine Zutaten gefunden – ist das eine Rezeptseite?')
      setTitle(t)
      setItems(list.map((z) => ({ ...parseIngredient(z), on: true })))
    } catch (e) {
      setError(describeError(e))
    }
    setBusy(false)
  }
  const chosen = items.filter((i) => i.on)

  return (
    <Sheet open onClose={onClose} title="Zutaten aus Rezept">
      <div className="flex gap-2">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.chefkoch.de/rezepte/…" inputMode="url" autoCapitalize="none" className="min-w-0 flex-1 rounded-md bg-fill px-3 py-2.5 text-[15px] outline-none placeholder:text-text-3" />
        <button onClick={load} disabled={busy || !url.trim()} className="press grid w-12 shrink-0 place-items-center rounded-md bg-accent text-on-accent disabled:opacity-40">{busy ? <RefreshCw size={18} className="animate-spin" /> : <Link2 size={18} />}</button>
      </div>
      <p className="mt-1 text-[12px] text-text-3">Link aus Safari, Chefkoch, Instagram-Bio … einfügen. Mengen kommen mit, Grundzutaten bleiben draußen.</p>
      {error && <p className="mt-2 rounded-md bg-red/10 px-3 py-2 text-[13px] font-medium text-red">{error}</p>}
      {items.length > 0 && (
        <>
          {title && <p className="mt-3 text-[15px] font-semibold">{title}</p>}
          <ul className="mt-2 divide-y divide-line rounded-md bg-fill">
            {items.map((it, i) => (
              <li key={i}>
                <button onClick={() => setItems((l) => l.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))} className="press flex w-full items-center gap-3 px-3 py-2 text-left">
                  <span className={'grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ' + (it.on ? 'border-accent bg-accent text-on-accent' : 'border-fill-strong')}>{it.on && <Check size={12} strokeWidth={3} />}</span>
                  <span className="text-[16px]">{shopInfo(it.name).emoji}</span>
                  <span className={'min-w-0 flex-1 truncate text-[14px] ' + (it.on ? '' : 'text-text-3 line-through')}>{it.name}</span>
                  {it.qty && <span className="shrink-0 text-[12px] text-text-2">{it.qty}</span>}
                </button>
              </li>
            ))}
          </ul>
          <button onClick={() => onAdd(chosen)} disabled={!chosen.length} className="press mt-3 w-full rounded-md bg-accent py-3 text-[15px] font-semibold text-on-accent disabled:opacity-40">{chosen.length} auf die Einkaufsliste</button>
        </>
      )}
    </Sheet>
  )
}
