import { uid } from './model'

/**
 * Wunsch-Sammler (CLAUDE.md §11): Ideen und Wünsche für die App, gespeichert in state.extra.wishes
 * (synchronisiert). Der Export-Text ist gedacht als Einstieg für die nächste Entwicklungs-Sitzung.
 */
export type Wish = { id: string; text: string; ts: number; done?: boolean }

export function readWishes(extra: Record<string, unknown>): Wish[] {
  const w = extra.wishes
  return Array.isArray(w) ? (w as Wish[]).filter((x) => x && typeof x.text === 'string') : []
}

export function addWish(list: Wish[], text: string, ts = Date.now()): Wish[] {
  const t = text.trim()
  if (!t) return list
  return [{ id: uid('w'), text: t, ts }, ...list]
}

export function toggleWish(list: Wish[], id: string): Wish[] {
  return list.map((w) => (w.id === id ? { ...w, done: !w.done } : w))
}

export function removeWish(list: Wish[], id: string): Wish[] {
  return list.filter((w) => w.id !== id)
}

/** Offene Wünsche als Markdown-Liste, z. B. zum Einfügen in eine Claude-Code-Sitzung */
export function wishesToText(list: Wish[]): string {
  const open = list.filter((w) => !w.done)
  if (!open.length) return ''
  return 'Wünsche aus der Organizer-App:\n' + open.map((w) => '- ' + w.text + ' (' + new Date(w.ts).toLocaleDateString('de-DE') + ')').join('\n')
}
