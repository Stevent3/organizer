import { create } from 'zustand'
import { eventsOnDay } from './calendar'
import { useConfig } from './config'
import { ENERGY_LEVELS, type AppState, type ListId } from './model'
import { addDaysKey, todayKey } from './time'
import { useStore } from '../store/useStore'

export const GROQ_MODEL = 'llama-3.3-70b-versatile'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

export type ToolCall = { id: string; type: 'function'; function: { name: string; arguments: string } }
export type ChatMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }

/** Sichtbare Chat-Zeile (Tool-Ergebnisse werden als Chips angezeigt) */
export type ChatLine = { id: string; role: 'user' | 'ai' | 'tool' | 'error'; text: string }

type ChatState = {
  history: ChatMessage[]
  lines: ChatLine[]
  busy: boolean
  reset: () => void
}

/** Chat lebt nur im Speicher (wie v7): App-Neustart = frischer Chat */
export const useChat = create<ChatState>()((set) => ({
  history: [],
  lines: [],
  busy: false,
  reset: () => set({ history: [], lines: [] }),
}))

const LIST_LABEL: Record<ListId, string> = { today: 'Heute', work: 'Arbeit', health: 'Gesundheit', shopping: 'Einkauf' }

export function buildContext(s: AppState, now = new Date()): string {
  const day = todayKey()
  const fmt = (list: { text: string; done: boolean }[]) => list.filter((t) => !t.done).map((t) => t.text).join(', ') || 'keine'
  const evs = (d: string) => eventsOnDay(s.events, d).map((e) => (e.allDay ? 'ganztägig' : e.time + (e.end ? '–' + e.end : '')) + ' ' + e.text + (e.sub ? ' (' + e.sub + ')' : '')).join(', ') || 'leer'
  const meal = todayMeals(s.extra)
  return [
    'Du bist der persönliche KI-Assistent im Organizer von Steven.',
    '',
    'PROFIL:',
    '- Steven, Bachelor-Student (Leuphana Lüneburg), schreibt Thesis über OCR-Systeme für klinische Dokumente (Pneumologie, MHH Hannover)',
    '- Arbeitet nebenbei in einem Tee-Laden mit Kulturraum',
    '- Raum Hannover, Partnerin seit 7 Jahren',
    '- Mag Fantasy (Rothfuss, Tolkien, Tad Williams) und Hörbücher',
    '- Studentisches Budget, kostenbewusst',
    '',
    'AKTUELLER STAND (' + now.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }) + ', ' + now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ', heutiges Datum ISO ' + day + '):',
    '- Energie: ' + (s.energy ? s.energy.label + ' (' + s.energy.pct + '%)' : 'nicht gesetzt'),
    '- Termine heute: ' + evs(day),
    '- Termine morgen: ' + evs(addDaysKey(day, 1)),
    '- Offene Aufgaben heute: ' + fmt(s.tasks.today),
    '- Arbeit/Thesis offen: ' + fmt(s.tasks.work),
    '- Gesundheit offen: ' + fmt(s.tasks.health),
    '- Einkaufsliste offen: ' + fmt(s.tasks.shopping),
    '- Essensplan heute: ' + meal,
    '',
    'Du kannst Aktionen ausführen: Aufgaben/Einkäufe/Termine (auch an anderen Tagen, mehrtägig, ganztägig) anlegen, Aufgaben abhaken, Termine löschen, Energie setzen. Nutze dafür die Tools, wenn Steven darum bittet. Frag nicht unnötig nach, handle direkt und bestätige knapp.',
    'Datumsangaben immer als ISO (YYYY-MM-DD) an Tools übergeben, relative Angaben wie „morgen" oder „Freitag" selbst auflösen.',
    'Antworte kurz, konkret, persönlich und auf Deutsch. Kein Geschwafel.',
  ].join('\n')
}

function todayMeals(extra: Record<string, unknown>): string {
  const mp = extra.mealPlan as { createdAt?: number; days?: { tag?: string; fruehstueck?: { name?: string }; mittag?: { name?: string }; abend?: { name?: string } }[] } | undefined
  if (!mp?.days?.length) return 'keiner'
  const wd = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][new Date().getDay()]
  const d = mp.days.find((x) => (x.tag ?? '').startsWith(wd)) ?? mp.days[0]
  return [d.fruehstueck?.name, d.mittag?.name, d.abend?.name].filter(Boolean).join(' / ') || 'keiner'
}

export const AI_TOOLS = [
  { type: 'function', function: { name: 'add_task', description: 'Fügt eine Aufgabe zu einer Liste hinzu', parameters: { type: 'object', properties: { text: { type: 'string' }, list: { type: 'string', enum: ['today', 'work', 'health'] } }, required: ['text'] } } },
  { type: 'function', function: { name: 'add_shopping_item', description: 'Fügt einen oder mehrere Artikel zur Einkaufsliste hinzu', parameters: { type: 'object', properties: { items: { type: 'array', items: { type: 'string' } } }, required: ['items'] } } },
  { type: 'function', function: { name: 'add_calendar_event', description: 'Trägt einen Termin ein (Datum ISO, Zeit HH:MM; ohne Zeit = ganztägig; end_date für mehrtägig)', parameters: { type: 'object', properties: { title: { type: 'string' }, date: { type: 'string', description: 'YYYY-MM-DD, Standard heute' }, end_date: { type: 'string', description: 'YYYY-MM-DD bei mehrtägigen Terminen' }, time: { type: 'string', description: 'HH:MM' }, end: { type: 'string', description: 'HH:MM' }, location: { type: 'string' } }, required: ['title'] } } },
  { type: 'function', function: { name: 'delete_calendar_event', description: 'Löscht einen Termin (Teiltext des Titels, optional Datum ISO)', parameters: { type: 'object', properties: { title: { type: 'string' }, date: { type: 'string' } }, required: ['title'] } } },
  { type: 'function', function: { name: 'complete_task', description: 'Hakt eine offene Aufgabe ab (Teiltext genügt, sucht in allen Listen)', parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } } },
  { type: 'function', function: { name: 'set_energy', description: 'Setzt das Energielevel', parameters: { type: 'object', properties: { level: { type: 'string', enum: ['low', 'good', 'top'] } }, required: ['level'] } } },
]

const isTime = (t: unknown): t is string => typeof t === 'string' && /^\d{1,2}:\d{2}$/.test(t)
const isDate = (d: unknown): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)

/** Führt ein Tool gegen den Store aus und liefert eine knappe Bestätigung für Modell und UI */
export function executeTool(name: string, args: Record<string, unknown>): string {
  const st = useStore.getState()
  try {
    if (name === 'add_task') {
      const list = (['today', 'work', 'health'] as const).find((l) => l === args.list) ?? 'today'
      const text = String(args.text ?? '').trim()
      if (!text) return 'Kein Text angegeben.'
      st.addTask(list, text)
      return 'Aufgabe „' + text + '" zu ' + LIST_LABEL[list] + ' hinzugefügt.'
    }
    if (name === 'add_shopping_item') {
      const items = (Array.isArray(args.items) ? args.items : [args.text]).map((x) => String(x ?? '').trim()).filter(Boolean)
      if (!items.length) return 'Keine Artikel angegeben.'
      const have = new Set(st.tasks.shopping.map((t) => t.text.toLowerCase()))
      const added = items.filter((i) => !have.has(i.toLowerCase()))
      for (const i of added) st.addTask('shopping', i.charAt(0).toUpperCase() + i.slice(1))
      return added.length ? added.join(', ') + ' auf die Einkaufsliste gesetzt.' : 'Steht schon alles auf der Liste.'
    }
    if (name === 'add_calendar_event') {
      const title = String(args.title ?? '').trim()
      if (!title) return 'Kein Titel angegeben.'
      const date = isDate(args.date) ? args.date : todayKey()
      const time = isTime(args.time) ? args.time.padStart(5, '0') : undefined
      const end = isTime(args.end) ? args.end.padStart(5, '0') : undefined
      const endDate = isDate(args.end_date) && args.end_date > date ? args.end_date : undefined
      st.addEvent({ date, endDate, allDay: !time, time, end, text: title, sub: args.location ? String(args.location) : undefined, color: 'accent', source: 'manual' })
      return 'Termin „' + title + '" am ' + date + (time ? ' um ' + time : ' (ganztägig)') + (endDate ? ' bis ' + endDate : '') + ' eingetragen.'
    }
    if (name === 'delete_calendar_event') {
      const q = String(args.title ?? '').toLowerCase()
      const date = isDate(args.date) ? args.date : undefined
      const ev = st.events.find((e) => e.text.toLowerCase().includes(q) && (!date || e.date === date))
      if (!ev) return 'Keinen passenden Termin gefunden.'
      st.deleteEvent(ev.id)
      return 'Termin „' + ev.text + '" gelöscht.'
    }
    if (name === 'complete_task') {
      const q = String(args.text ?? '').toLowerCase()
      for (const list of ['today', 'work', 'health', 'shopping'] as ListId[]) {
        const t = st.tasks[list].find((x) => !x.done && x.text.toLowerCase().includes(q))
        if (t) { st.toggleTask(list, t.id); return '„' + t.text + '" abgehakt.' }
      }
      return 'Keine passende offene Aufgabe gefunden.'
    }
    if (name === 'set_energy') {
      const l = ENERGY_LEVELS.find((x) => x.level === args.level)
      if (!l) return 'Unbekanntes Level.'
      st.setEnergy({ level: l.level, label: l.label, pct: l.pct })
      return 'Energie auf ' + l.label + ' gesetzt.'
    }
  } catch (e) {
    return 'Fehler: ' + (e instanceof Error ? e.message : String(e))
  }
  return 'Unbekanntes Tool.'
}

async function groqCall(key: string, messages: ChatMessage[], useTools: boolean) {
  const body: Record<string, unknown> = { model: GROQ_MODEL, messages, max_tokens: 700, temperature: 0.7 }
  if (useTools) { body.tools = AI_TOOLS; body.tool_choice = 'auto' }
  const res = await fetch(GROQ_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(res.status + ': ' + (await res.text()).slice(0, 200))
  return (await res.json()) as { choices: { message: { content: string | null; tool_calls?: ToolCall[] } }[] }
}

let seq = 0
const line = (role: ChatLine['role'], text: string): ChatLine => ({ id: 'l' + Date.now() + '-' + seq++, role, text })

/** Nachricht senden: Kontext + Verlauf an Groq, Tool-Calls ausführen, Antwort anhängen */
export async function sendChat(text: string): Promise<void> {
  const t = text.trim()
  if (!t || useChat.getState().busy) return
  const key = useConfig.getState().groqKey
  useChat.setState((c) => ({ busy: true, history: [...c.history, { role: 'user', content: t }], lines: [...c.lines, line('user', t)] }))
  if (!key) {
    useChat.setState((c) => ({ busy: false, lines: [...c.lines, line('error', 'Kein Groq-Key hinterlegt. Unter „Mehr" eintragen, dann antworte ich richtig.')] }))
    return
  }
  try {
    const sys: ChatMessage = { role: 'system', content: buildContext(useStore.getState().snapshot()) }
    const msgs: ChatMessage[] = [sys, ...useChat.getState().history.slice(-12)]
    let data = await groqCall(key, msgs, true)
    let msg = data.choices[0].message
    if (msg.tool_calls?.length) {
      const assistant: ChatMessage = { role: 'assistant', content: msg.content ?? '', tool_calls: msg.tool_calls }
      msgs.push(assistant)
      useChat.setState((c) => ({ history: [...c.history, assistant] }))
      for (const tc of msg.tool_calls) {
        let args: Record<string, unknown> = {}
        try { args = JSON.parse(tc.function.arguments || '{}') } catch { /* leer */ }
        const result = executeTool(tc.function.name, args)
        const toolMsg: ChatMessage = { role: 'tool', tool_call_id: tc.id, content: result }
        msgs.push(toolMsg)
        useChat.setState((c) => ({ history: [...c.history, toolMsg], lines: [...c.lines, line('tool', result)] }))
      }
      data = await groqCall(key, msgs, false)
      msg = data.choices[0].message
    }
    const reply = msg.content?.trim() || 'Erledigt.'
    useChat.setState((c) => ({ busy: false, history: [...c.history, { role: 'assistant', content: reply }], lines: [...c.lines, line('ai', reply)] }))
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e)
    const txt = m.startsWith('401') ? 'Groq-Key ungültig. Bitte unter „Mehr" neu eintragen.' : m.startsWith('429') ? 'Groq ist gerade ausgelastet. Gleich nochmal.' : 'Verbindung fehlgeschlagen. Versuch es nochmal.'
    useChat.setState((c) => ({ busy: false, lines: [...c.lines, line('error', txt)] }))
  }
}
