import { ArrowUp, ChevronDown, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { currentModel, sendChat, useChat } from '../../lib/ai'
import { useConfig } from '../../lib/config'
import { useUi } from '../../lib/ui'
import { FullSheet } from '../FullSheet'

/** Schwebende Sprechblase unten rechts, öffnet den KI-Chat als Vollbild-Overlay */
export function AiBubble({ hidden = false }: { hidden?: boolean }) {
  const open = useUi((u) => u.chatOpen)
  const openChat = useUi((u) => u.openChat)
  const closeChat = useUi((u) => u.closeChat)
  if (hidden) return null
  return (
    <>
      <button
        aria-label="KI-Assistent öffnen"
        onClick={() => openChat()}
        className="press fixed right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-accent text-on-accent shadow-lg"
        style={{ bottom: 'calc(var(--tabbar-h) + var(--safe-bottom) + 16px)' }}
      >
        <Sparkles size={24} strokeWidth={2.2} />
      </button>
      <AiOverlay open={open} onClose={closeChat} />
    </>
  )
}

const SUGGESTIONS = ['Was steht heute an?', 'Plan mir den Tag', 'Setz Milch und Brot auf die Liste', 'Was koche ich heute?']

export function AiOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lines, busy, reset } = useChat()
  const hasKey = useConfig((c) => !!c.groqKey)
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  // Vorausgefüllte Frage (Kurzbefehl „ask" oder Dashboard-Karte) beim Öffnen übernehmen
  const prefill = useUi((u) => u.chatPrefill)
  useEffect(() => {
    if (open && prefill) { setText(prefill); useUi.setState({ chatPrefill: null }) }
  }, [open, prefill])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [lines.length, busy])

  const submit = (t = text) => {
    const v = t.trim()
    if (!v) return
    setText('')
    sendChat(v)
  }

  const header = (
    <div className="flex items-center justify-between pb-2 pt-3">
      <div>
        <p className="text-[13px] font-medium text-text-2">Groq · {currentModel().replace(/^.*\//, '')}</p>
        <h1 className="font-display text-[26px] font-bold leading-tight tracking-tight">Assistent</h1>
      </div>
      <div className="flex items-center gap-1">
        {lines.length > 0 && <button aria-label="Chat leeren" onClick={reset} className="press grid h-9 w-9 place-items-center rounded-full bg-elev text-text-2 shadow-sm"><Trash2 size={16} /></button>}
        <button aria-label="Schließen" onClick={onClose} className="press grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-accent"><ChevronDown size={20} strokeWidth={2.5} /></button>
      </div>
    </div>
  )

  return (
    <FullSheet open={open} onClose={onClose} label="KI-Assistent" header={header}>
      <div ref={listRef} className="no-scrollbar mx-auto w-full max-w-lg min-h-0 flex-1 overflow-y-auto px-4 pb-3">
        {lines.length === 0 && (
          <div className="mt-6 space-y-2">
            <p className="px-1 text-[13px] text-text-2">{hasKey ? 'Ich kenne deinen Tag, deine Aufgaben und deine Einkaufsliste. Sag mir, was ich tun soll.' : 'Noch kein Groq-Key. Trag ihn unter „Mehr" ein, dann geht es los.'}</p>
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => submit(s)} className="press block w-full rounded-md bg-elev px-4 py-3 text-left text-[14px] shadow-sm">{s}</button>
            ))}
          </div>
        )}
        {lines.map((l) => (
          <div key={l.id} className={'mt-2 flex ' + (l.role === 'user' ? 'justify-end' : 'justify-start')}>
            {l.role === 'tool' ? (
              <span className="rounded-full bg-accent-soft px-3 py-1 text-[12px] font-medium text-accent">✓ {l.text}</span>
            ) : (
              <div className={'max-w-[85%] whitespace-pre-wrap rounded-lg px-3.5 py-2.5 text-[15px] leading-relaxed ' + (l.role === 'user' ? 'rounded-br-sm bg-accent text-on-accent' : l.role === 'error' ? 'bg-red/10 text-red' : 'rounded-bl-sm bg-elev shadow-sm')}>
                {l.text}
              </div>
            )}
          </div>
        ))}
        {busy && <div className="mt-2 inline-block rounded-lg rounded-bl-sm bg-elev px-3.5 py-2.5 text-[14px] text-text-3 shadow-sm">denkt nach …</div>}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); submit() }}
        className="mx-auto w-full max-w-lg shrink-0 border-t border-line bg-bg px-4 pt-2"
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 10px)' }}
      >
        <div className="flex items-end gap-2 rounded-xl bg-elev px-3 py-2 shadow-sm">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
            placeholder="Frag mich was oder gib mir eine Aufgabe"
            rows={1}
            enterKeyHint="send"
            className="max-h-32 flex-1 resize-none bg-transparent py-1.5 text-[15px] outline-none placeholder:text-text-3"
          />
          <button type="submit" aria-label="Senden" disabled={busy || !text.trim()} className="press grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-on-accent disabled:opacity-40">
            <ArrowUp size={18} strokeWidth={2.5} />
          </button>
        </div>
      </form>
    </FullSheet>
  )
}
