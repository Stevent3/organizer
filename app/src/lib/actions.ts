import { TABS, type TabId } from '../app/tabs'
import { ENERGY_LEVELS, type ListId } from './model'
import { parseQuickAdd, type QuickAddIntent } from './quickAdd'
import { capitalize, parseQuantity, shopBaseName } from './shopping'
import { syncNow } from './syncEngine'
import { useUi } from './ui'
import { useStore } from '../store/useStore'

const LIST_LABEL: Record<ListId, string> = { today: 'To-dos', work: 'Arbeit', health: 'Gesundheit', shopping: 'Einkauf' }

/** Eine erkannte Schnell-Eingabe ausführen (Dashboard und Kurzbefehl teilen sich das). Liefert die Bestätigung. */
export function executeIntent(i: QuickAddIntent): string {
  const st = useStore.getState()
  if (i.kind === 'shopping') {
    const have = new Set(st.tasks.shopping.map((t) => shopBaseName(t.text)))
    const added: string[] = []
    for (const raw of i.items) {
      const { name, qty } = parseQuantity(raw)
      const base = shopBaseName(name)
      if (!base || have.has(base)) continue
      have.add(base)
      st.addTask('shopping', capitalize(name), qty)
      added.push(capitalize(name))
    }
    return added.length ? '🛒 ' + added.join(', ') + ' auf die Einkaufsliste' : 'Steht schon alles auf der Liste'
  }
  if (i.kind === 'event') {
    st.addEvent({ date: i.date, allDay: i.allDay, time: i.time, end: i.end, text: i.title, color: 'accent', source: 'manual' })
    const d = new Date(i.date + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' })
    return '📅 „' + i.title + '" ' + d + (i.time ? ' ' + i.time : '') + ' eingetragen'
  }
  st.addTask(i.list, i.text)
  return '✅ „' + i.text + '" → ' + LIST_LABEL[i.list]
}

/** Kurzbefehl-Parameter (aus der URL) ausführen. Exportiert für Tests; null = kein bekannter Befehl. */
export function runAction(params: URLSearchParams): string | null {
  const action = (params.get('action') ?? '').toLowerCase()
  if (!action) return null
  const text = (params.get('text') ?? params.get('q') ?? params.get('title') ?? '').trim()
  const st = useStore.getState()
  const ui = useUi.getState()

  switch (action) {
    case 'quick': {
      const i = parseQuickAdd(text)
      return i ? executeIntent(i) : 'Kurzbefehl ohne Text'
    }
    case 'add-task': {
      if (!text) return 'Kurzbefehl ohne Text'
      const list = (['today', 'work', 'health'] as const).find((l) => l === params.get('list')) ?? 'today'
      return executeIntent({ kind: 'task', list, text })
    }
    case 'add-shopping': {
      const items = (params.get('items') ?? text).split(/[,;\n]| und /).map((s) => s.trim()).filter(Boolean)
      return items.length ? executeIntent({ kind: 'shopping', items }) : 'Kurzbefehl ohne Artikel'
    }
    case 'add-event': {
      if (!text) return 'Kurzbefehl ohne Titel'
      const date = params.get('date')
      const time = params.get('time')
      const end = params.get('end')
      const isDate = (d: string | null): d is string => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d)
      const isTime = (t: string | null): t is string => !!t && /^\d{1,2}:\d{2}$/.test(t)
      // Ohne Datum/Zeit in der URL darf der Titel selbst Datum/Zeit enthalten („morgen 15 Uhr Zahnarzt")
      if (!isDate(date) && !isTime(time)) {
        const i = parseQuickAdd(text)
        if (i?.kind === 'event') return executeIntent(i)
      }
      const day = isDate(date) ? date : new Date().toISOString().slice(0, 10)
      return executeIntent({ kind: 'event', title: text, date: day, allDay: !isTime(time), time: isTime(time) ? time.padStart(5, '0') : undefined, end: isTime(end) ? end.padStart(5, '0') : undefined })
    }
    case 'set-energy': {
      const l = ENERGY_LEVELS.find((x) => x.level === params.get('level'))
      if (!l) return 'Unbekanntes Energielevel (low, good, top)'
      st.setEnergy({ level: l.level, label: l.label, pct: l.pct })
      return '⚡ Energie: ' + l.label
    }
    case 'ask':
      ui.openChat(text || undefined)
      return null
    case 'import-calendar':
      void syncNow()
      return '🔄 Synchronisiere …'
    case 'open': {
      const tab = TABS.find((t) => t.id === params.get('tab'))?.id as TabId | undefined
      if (tab) ui.go(tab)
      return null
    }
    default:
      return 'Unbekannter Kurzbefehl „' + action + '"'
  }
}

/** Beim Start: `?action=…` auswerten, Toast zeigen, Parameter aus der URL entfernen. */
export function applyActionFromUrl(): boolean {
  let params: URLSearchParams
  try { params = new URLSearchParams(window.location.search) } catch { return false }
  if (!params.get('action')) return false
  const msg = runAction(params)
  if (msg) useUi.getState().showToast(msg)
  for (const k of ['action', 'text', 'q', 'title', 'list', 'items', 'date', 'time', 'end', 'level', 'tab']) params.delete(k)
  const clean = window.location.pathname + (params.toString() ? '?' + params.toString() : '') + window.location.hash
  try { window.history.replaceState(null, '', clean) } catch { /* egal */ }
  return true
}

/** Beispiele für Siri-Kurzbefehle (Doku unter Mehr). `{text}` ersetzt der Kurzbefehl durch die Eingabe. */
export const SHORTCUT_EXAMPLES: { label: string; hint: string; url: string }[] = [
  { label: 'Schnell merken', hint: 'Erkennt selbst, ob Termin, Einkauf oder To-do', url: '?action=quick&text={text}' },
  { label: 'To-do anlegen', hint: 'Optional &list=work oder &list=health', url: '?action=add-task&text={text}' },
  { label: 'Einkauf ergänzen', hint: 'Mehrere Artikel mit Komma', url: '?action=add-shopping&items={text}' },
  { label: 'Termin eintragen', hint: '&date=YYYY-MM-DD&time=HH:MM&end=HH:MM, oder Datum/Zeit im Text', url: '?action=add-event&title={text}' },
  { label: 'Energie setzen', hint: 'low, good oder top', url: '?action=set-energy&level=good' },
  { label: 'KI fragen', hint: 'Öffnet den Chat mit der Frage', url: '?action=ask&q={text}' },
  { label: 'Kalender laden', hint: 'Nach dem Kalender-Shortcut', url: '?action=import-calendar' },
]

export const APP_URL = 'https://stevent3.github.io/organizer/'
