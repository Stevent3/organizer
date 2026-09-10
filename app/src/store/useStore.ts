import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { EMPTY_STATE, type AppState, type CalOverride, type EventItem, type Energy, type ListId, type Task, uid } from '../lib/model'

/** Eigener localStorage-Key – v7 (organizer_v3) bleibt unangetastet, bis der Umzug fertig ist. */
export const STORAGE_KEY = 'organizer_v8'

type Actions = {
  addEvent: (e: Omit<EventItem, 'id'> & { id?: string }) => EventItem
  updateEvent: (id: string, patch: Partial<EventItem>) => void
  deleteEvent: (id: string) => void
  setOverride: (key: string, patch: CalOverride) => void
  setEnergy: (e: Energy | null) => void
  addTask: (list: ListId, text: string, qty?: string) => Task
  toggleTask: (list: ListId, id: string) => void
  deleteTask: (list: ListId, id: string) => void
  renameTask: (list: ListId, id: string, text: string) => void
  setTaskQty: (list: ListId, id: string, qty: string) => void
  moveTask: (from: ListId, to: ListId, id: string) => void
  clearDone: (list: ListId) => void
  /** Korb abschließen: erledigte Einkäufe in den Verlauf, von der Liste nehmen. Liefert Anzahl. */
  completeShopping: () => number
  /** Kompletten Stand setzen (Sync/Import) – ohne updatedAt zu verändern */
  replaceState: (s: AppState) => void
  /** Reiner Datenstand ohne Aktionen */
  snapshot: () => AppState
}

export type Store = AppState & Actions

const touch = (s: AppState): Pick<AppState, 'updatedAt'> => ({ updatedAt: Math.max(Date.now(), s.updatedAt + 1) })

const DATA_KEYS: (keyof AppState)[] = ['version', 'updatedAt', 'energy', 'tasks', 'events', 'calOverrides', 'lastCalendarSync', 'shopHistory', 'extra']

function pickData(s: AppState): AppState {
  const out = {} as Record<string, unknown>
  for (const k of DATA_KEYS) out[k] = s[k]
  return out as AppState
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...EMPTY_STATE,
      tasks: { ...EMPTY_STATE.tasks },
      shopHistory: {},
      extra: {},

      addEvent: (e) => {
        const ev: EventItem = { ...e, id: e.id ?? uid('e') }
        set((s) => ({ events: [...s.events, ev], ...touch(s) }))
        return ev
      },
      updateEvent: (id, patch) => {
        const s = get()
        const ev = s.events.find((x) => x.id === id)
        if (!ev) return
        // Apple-Termin: Änderung als Override merken, damit sie den nächsten Sync überlebt (Lesson #3/#4)
        const overrides = ev.source === 'calendar' && ev.key
          ? { ...s.calOverrides, [ev.key]: { ...(s.calOverrides[ev.key] ?? {}), ...pickOverride(patch) } }
          : s.calOverrides
        set({ events: s.events.map((x) => (x.id === id ? { ...x, ...patch } : x)), calOverrides: overrides, ...touch(s) })
      },
      deleteEvent: (id) => {
        const s = get()
        const ev = s.events.find((x) => x.id === id)
        if (!ev) return
        const overrides = ev.source === 'calendar' && ev.key
          ? { ...s.calOverrides, [ev.key]: { ...(s.calOverrides[ev.key] ?? {}), deleted: true } }
          : s.calOverrides
        set({ events: s.events.filter((x) => x.id !== id), calOverrides: overrides, ...touch(s) })
      },
      setOverride: (key, patch) =>
        set((s) => ({ calOverrides: { ...s.calOverrides, [key]: { ...(s.calOverrides[key] ?? {}), ...patch } }, ...touch(s) })),
      setEnergy: (energy) => set((s) => ({ energy, ...touch(s) })),
      addTask: (list, text, qty) => {
        const t: Task = { id: uid('t'), text, done: false, ...(qty ? { qty } : {}) }
        set((s) => ({ tasks: { ...s.tasks, [list]: [...s.tasks[list], t] }, ...touch(s) }))
        return t
      },
      toggleTask: (list, id) =>
        set((s) => ({ tasks: { ...s.tasks, [list]: s.tasks[list].map((t) => (t.id === id ? { ...t, done: !t.done } : t)) }, ...touch(s) })),
      deleteTask: (list, id) =>
        set((s) => ({ tasks: { ...s.tasks, [list]: s.tasks[list].filter((t) => t.id !== id) }, ...touch(s) })),
      renameTask: (list, id, text) =>
        set((s) => ({ tasks: { ...s.tasks, [list]: s.tasks[list].map((t) => (t.id === id ? { ...t, text } : t)) }, ...touch(s) })),
      setTaskQty: (list, id, qty) =>
        set((s) => ({ tasks: { ...s.tasks, [list]: s.tasks[list].map((t) => (t.id === id ? { ...t, qty: qty || undefined } : t)) }, ...touch(s) })),
      moveTask: (from, to, id) => {
        const s = get()
        const t = s.tasks[from].find((x) => x.id === id)
        if (!t || from === to) return
        set({ tasks: { ...s.tasks, [from]: s.tasks[from].filter((x) => x.id !== id), [to]: [...s.tasks[to], t] }, ...touch(s) })
      },
      clearDone: (list) => set((s) => ({ tasks: { ...s.tasks, [list]: s.tasks[list].filter((t) => !t.done) }, ...touch(s) })),
      completeShopping: () => {
        const s = get()
        const cart = s.tasks.shopping.filter((t) => t.done)
        if (!cart.length) return 0
        const history = { ...s.shopHistory }
        for (const t of cart) {
          const n = t.text.toLowerCase().replace(/\(.*?\)/g, '').trim()
          if (!n) continue
          history[n] = { n: (history[n]?.n ?? 0) + 1, ts: Date.now() }
        }
        set({ tasks: { ...s.tasks, shopping: s.tasks.shopping.filter((t) => !t.done) }, shopHistory: history, ...touch(s) })
        return cart.length
      },
      replaceState: (n) => set({ ...pickData(n), tasks: { ...EMPTY_STATE.tasks, ...n.tasks }, shopHistory: n.shopHistory ?? {}, extra: n.extra ?? {} }),
      snapshot: () => pickData(get()),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => pickData(s),
    },
  ),
)

function pickOverride(p: Partial<EventItem>): CalOverride {
  const o: CalOverride = {}
  if (p.time !== undefined) o.time = p.time
  if (p.end !== undefined) o.end = p.end
  if (p.text !== undefined) o.text = p.text
  if (p.sub !== undefined) o.sub = p.sub
  if (p.date !== undefined) o.date = p.date
  return o
}
