import { Cake, Copy, MessageCircle, RefreshCw, Share2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { describeError, groqText } from '../../lib/ai'
import { findBirthdays, greetingPrompt, readGreetingStyle, whatsappUrl, type Birthday } from '../../lib/birthdays'
import { useConfig } from '../../lib/config'
import type { EventItem } from '../../lib/model'
import { useStore } from '../../store/useStore'

/** Geburtstage heute (Glückwunsch schreiben) und morgen (Geschenk?) – nur sichtbar, wenn es welche gibt */
export function BirthdayCard({ events, day }: { events: EventItem[]; day: string }) {
  const b = useMemo(() => findBirthdays(events, day), [events, day])
  const [sel, setSel] = useState<Birthday | null>(null)
  if (!b.today.length && !b.tomorrow.length) return null
  return (
    <>
      <div className="mt-2 rounded-lg bg-elev px-3 py-2 shadow-sm">
        {b.today.map((x) => (
          <div key={x.name} className="flex items-center gap-2 py-1">
            <span className="text-[18px]">🎂</span>
            <span className="min-w-0 flex-1 truncate text-[13.5px]"><b>{x.name}</b> hat heute Geburtstag{x.age ? ' · ' + x.age : ''}</span>
            <button onClick={() => setSel(x)} className="press shrink-0 rounded-full bg-accent px-3 py-1.5 text-[12px] font-semibold text-on-accent">Glückwunsch</button>
          </div>
        ))}
        {b.tomorrow.map((x) => (
          <div key={x.name} className="flex items-center gap-2 py-1 text-text-2">
            <span className="text-[18px]">🎁</span>
            <span className="min-w-0 flex-1 truncate text-[13px]"><b className="text-text">{x.name}</b> hat morgen Geburtstag{x.age ? ' · ' + x.age : ''}. Geschenk, Karte, Nachricht vorbereiten?</span>
          </div>
        ))}
      </div>
      {sel && <GreetingSheet key={sel.name} b={sel} onClose={() => setSel(null)} />}
    </>
  )
}

function GreetingSheet({ b, onClose }: { b: Birthday; onClose: () => void }) {
  const extra = useStore((s) => s.extra)
  const hasKey = useConfig((c) => !!c.groqKey)
  const style = useMemo(() => readGreetingStyle(extra), [extra])
  const [note, setNote] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const generate = async () => {
    setBusy(true); setError(null)
    try {
      const p = greetingPrompt(style, b, note.trim())
      const t = (await groqText(p.system, p.user, { maxTokens: 220, temperature: 0.9 })).trim().replace(/^["„“]|["“”]$/g, '')
      if (!t) throw new Error('Leere Antwort')
      setText(t)
    } catch (e) {
      setError(describeError(e))
    }
    setBusy(false)
  }
  const share = async () => {
    try {
      if (navigator.share) { await navigator.share({ text }); return }
      await navigator.clipboard.writeText(text)
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    } catch { /* abgebrochen */ }
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* egal */ }
  }

  return (
    <Sheet open onClose={onClose} title={'🎂 ' + b.name + (b.age ? ' wird ' + b.age : '')}>
      <label className="mb-1 block text-[12px] font-semibold uppercase tracking-wider text-text-3">Persönlicher Bezug (optional)</label>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={'z. B. „letzte Woche Rave zusammen", „Uni-Kumpel"'} className="w-full rounded-md bg-fill px-3 py-2.5 text-[15px] outline-none placeholder:text-text-3" />
      <button onClick={generate} disabled={busy || !hasKey} className="press mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-accent py-3 text-[15px] font-semibold text-on-accent disabled:opacity-60">
        {busy ? <RefreshCw size={18} className="animate-spin" /> : <Cake size={18} />} {busy ? 'Formuliere …' : text ? 'Neu formulieren' : 'Glückwunsch schreiben'}
      </button>
      {!hasKey && <p className="mt-2 text-[12px] text-text-3">Dafür braucht es den Groq-Key unter Mehr → KI.</p>}
      {error && <p className="mt-2 rounded-md bg-red/10 px-3 py-2 text-[13px] font-medium text-red">{error}</p>}
      {text && (
        <>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} className="mt-3 w-full resize-none rounded-md bg-fill px-3 py-2.5 text-[15px] leading-relaxed outline-none" />
          <div className="mt-2 grid grid-cols-3 gap-2">
            <a href={whatsappUrl(text)} target="_blank" rel="noreferrer" className="press flex items-center justify-center gap-1.5 rounded-md bg-green py-2.5 text-[13px] font-semibold text-white"><MessageCircle size={15} /> WhatsApp</a>
            <button onClick={share} className="press flex items-center justify-center gap-1.5 rounded-md bg-fill py-2.5 text-[13px] font-semibold"><Share2 size={15} /> Teilen</button>
            <button onClick={copy} className="press flex items-center justify-center gap-1.5 rounded-md bg-fill py-2.5 text-[13px] font-semibold"><Copy size={15} /> {copied ? 'Kopiert' : 'Kopieren'}</button>
          </div>
          <p className="mt-2 text-[11px] text-text-3">Ton und Beispiel unter Mehr → Geburtstage anpassen, damit es klingt wie du.</p>
        </>
      )}
    </Sheet>
  )
}
