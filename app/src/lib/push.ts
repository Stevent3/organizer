import type { WorkerApi } from './worker'

/** Öffentlicher VAPID-Schlüssel (Gegenstück liegt als Secret im Worker) */
export const VAPID_PUBLIC = 'BK9fTYKr7-r5MLZgLG3cbVXDg9QZsaXTUrbfeY2hZsDvSGCDYlI01ij12SDWXGp_U-nzQtuGKpTxpGu-JSusmSI'

export function urlB64ToUint8(b64: string): Uint8Array {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
/** iOS erlaubt Web Push nur in der installierten Homescreen-App */
export const isStandalone = () => (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia('(display-mode: standalone)').matches

export async function localSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

export type PushResult = { ok: true } | { ok: false; reason: string }

export async function enablePush(api: WorkerApi): Promise<PushResult> {
  if (!pushSupported()) return { ok: false, reason: 'Dieses Gerät unterstützt keine Web-Push-Benachrichtigungen.' }
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return { ok: false, reason: 'Benachrichtigungen wurden nicht erlaubt.' }
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(VAPID_PUBLIC) as BufferSource })
  await api.pushSubscribe(sub.toJSON())
  return { ok: true }
}

export async function disablePush(api: WorkerApi): Promise<void> {
  const sub = await localSubscription()
  if (sub) await sub.unsubscribe()
  await api.pushUnsubscribe()
}
