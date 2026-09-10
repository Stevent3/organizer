import { create } from 'zustand'
import type { TabId } from '../app/tabs'

/** Navigation + globale Overlays als Store, damit jede Karte im Dashboard in Planer/KI springen kann. */
type UiStore = {
  tab: TabId
  /** Vollbild-KI-Chat offen? Optional mit vorausgefüllter Frage */
  chatOpen: boolean
  chatPrefill: string | null
  /** Kurzer Hinweis unten (z. B. nach einem Kurzbefehl) */
  toast: string | null
  go: (tab: TabId) => void
  openChat: (prefill?: string) => void
  closeChat: () => void
  showToast: (msg: string) => void
}

let toastTimer: ReturnType<typeof setTimeout> | null = null

export const useUi = create<UiStore>()((set) => ({
  tab: 'today',
  chatOpen: false,
  chatPrefill: null,
  toast: null,
  go: (tab) => set({ tab }),
  openChat: (prefill) => set({ chatOpen: true, chatPrefill: prefill ?? null }),
  closeChat: () => set({ chatOpen: false, chatPrefill: null }),
  showToast: (msg) => {
    if (toastTimer) clearTimeout(toastTimer)
    set({ toast: msg })
    toastTimer = setTimeout(() => set({ toast: null }), 3000)
  },
}))
