import { ArrowUp, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { executeIntent } from '../lib/actions'
import { describeIntent, parseQuickAdd } from '../lib/quickAdd'
import { useUi } from '../lib/ui'

/** Dashboard-Schnell-Eingabe: erkennt Termin / Einkauf / To-do lokal und zeigt die Deutung vor dem Absenden */
export function QuickAdd() {
  const [text, setText] = useState('')
  const [focus, setFocus] = useState(false)
  const showToast = useUi((u) => u.showToast)
  const openChat = useUi((u) => u.openChat)
  const intent = useMemo(() => parseQuickAdd(text), [text])

  const submit = () => {
    if (!intent) return
    showToast(executeIntent(intent))
    setText('')
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit() }} className="rounded-lg bg-elev shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-soft text-accent"><Sparkles size={15} /></span>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          placeholder={'Schnell merken: „morgen 15 Uhr Zahnarzt", „Milch, Brot" …'}
          enterKeyHint="done"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-[15px] outline-none placeholder:text-text-3"
        />
        <button type="submit" aria-label="Eintragen" disabled={!intent} className="press grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-on-accent transition-opacity disabled:opacity-0">
          <ArrowUp size={16} strokeWidth={2.5} />
        </button>
      </div>
      {intent && (
        <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-1.5">
          <span className="truncate text-[12px] font-medium text-accent">{describeIntent(intent)}</span>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { openChat(text); setText('') }} className="press shrink-0 text-[12px] font-semibold text-text-3">Lieber die KI fragen</button>
        </div>
      )}
      {!intent && focus && (
        <p className="border-t border-line px-3 py-1.5 text-[12px] text-text-3">Datum oder Uhrzeit → Termin · bekannte Artikel → Einkauf · sonst To-do (#arbeit, #gesundheit)</p>
      )}
    </form>
  )
}
