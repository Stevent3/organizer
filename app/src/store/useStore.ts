import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { EMPTY_STATE, type AppState, type CalOverride, type EventItem, type Energy, type ListId, type Task, uid } from '../lib/model'

/** Eigener localStorage-Key – v7 (`organizer_v3`) bleibt unangetastet, bis der Umzug fertig ist. */
export const STORAGE_KEY = 'organizer_v8'

type Actions = {
  addEvent: (e: Omit<EventItem, 'id'> & { id?: string }) => EventItem
  updateEvent: (id: string, patch: Partial<EventItem>) => void
  deleteEvent: (id: string) => void
  setOverride: (key: string, patch: CalOverride) => void
  setEnergy: (e: Energy | null) => void
  addTask: (list: ListId, text: string) => Task
  toggleTask: (list: ListId, id: string) => void
  replaceState: (s: AppState) => void
}

export type Store = AppState & Actions

const touch = (s: AppState): Pick<AppState, 'updatedAt'> => ({ updatedAt: Math.max(Date.now(), s.updatedAt + 1) })

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...EMPTY_STATE,
      tasks: { ...EMPTY_STATE.tasks },

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
      addTask: (list, text) => {
        const t: Task = { id: uid('t'), text, done: false }
        set((s) => ({ tasks: { ...s.tasks, [list]: [...s.tasks[list], t] }, ...touch(s) }))
        return t
      },
      toggleTask: (list, id) =>
        set((s) => ({ tasks: { ...s.tasks, [list]: s.tasks[list].map((t) => (t.id === id ? { ...t, done: !t.done } : t)) }, ...touch(s) })),
      replaceState: (n) => set({ ...n }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        version: s.version, updatedAt: s.updatedAt, energy: s.energy, tasks: s.tasks,
        events: s.events, calOverrides: s.calOverrides, lastCalendarSync: s.lastCalendarSync,
      }),
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
