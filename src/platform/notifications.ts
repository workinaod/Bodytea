// ============================================================
// Notifications and the app-icon badge.
//
// The badge rule, learned the hard way: THE BADGE COUNTS
// NOTIFICATIONS THAT WERE ACTUALLY DELIVERED. Nothing else may
// raise it.
//
// The old code set it to 1 whenever a session was scheduled and
// unfinished. That is a workout flag, not a message count, so the
// user saw a red 1 with nothing behind it to read. Worse, it only
// re-evaluated while the app was open, so once set it sat on the
// home screen indefinitely with no way to clear it from inside a
// closed app. That is the stuck "1".
//
// Everything platform-specific lives here so the native wrapper
// swaps an implementation rather than a screen.
// ============================================================

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported'

export function notificationSupport(): NotificationPermissionState {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false
  let permission = Notification.permission
  if (permission === 'default') permission = await Notification.requestPermission()
  return permission === 'granted'
}

// ---- Badge ----

interface BadgeApi {
  setAppBadge?: (n?: number) => Promise<void>
  clearAppBadge?: () => Promise<void>
}

export function badgeSupported(): boolean {
  return typeof navigator !== 'undefined' && 'setAppBadge' in navigator
}

/** Show n unread notifications, or clear the badge entirely when n is 0. */
export async function setBadge(n: number): Promise<void> {
  try {
    const nav = navigator as Navigator & BadgeApi
    if (n > 0) await nav.setAppBadge?.(n)
    else await nav.clearAppBadge?.()
  } catch {
    /* unsupported platform, badge is optional everywhere */
  }
}

export const clearBadge = (): Promise<void> => setBadge(0)

// ---- Delivery ----

/**
 * Show a notification through the service worker registration.
 * Returns whether it was actually delivered, so the caller only counts
 * a badge for a message that exists.
 */
export async function showNotification(
  title: string,
  body: string,
  tag: string,
): Promise<boolean> {
  try {
    if (notificationSupport() !== 'granted') return false
    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg) return false
    await reg.showNotification(`BodyT · ${title}`, {
      body,
      tag,
      icon: 'icons/pwa-192.png',
      badge: 'icons/pwa-192.png',
    })
    return true
  } catch {
    return false
  }
}

// ---- Background delivery: what this platform can actually do ----

export type DeliveryCapability =
  /** Real pushes, whether or not the app is open. */
  | 'push'
  /** Wakes periodically in the background. Android/Chromium installs only. */
  | 'periodic-sync'
  /** Timers that only run while the app is open. */
  | 'foreground-only'
  | 'none'

/**
 * What background delivery this device supports.
 *
 * This is the honest answer behind the reminders toggle. iOS does not
 * implement Periodic Background Sync at all, so on an iPhone without a
 * push subscription the only thing that can fire is a timer inside an
 * open tab. A switch that silently does nothing is worse than a switch
 * that says what it does.
 */
export function deliveryCapability(): DeliveryCapability {
  if (typeof window === 'undefined') return 'none'
  if (typeof Notification === 'undefined') return 'none'
  const hasPush = 'serviceWorker' in navigator && 'PushManager' in window
  if (hasPush) return 'push'
  const reg = 'serviceWorker' in navigator
  if (reg && 'periodicSync' in (ServiceWorkerRegistration.prototype as object)) return 'periodic-sync'
  return 'foreground-only'
}

/** One plain sentence for the settings row. */
export function deliveryNote(cap: DeliveryCapability): string {
  switch (cap) {
    case 'push':
      return 'Reminders arrive whether the app is open or not.'
    case 'periodic-sync':
      return 'Reminders arrive in the background on this device.'
    case 'foreground-only':
      return 'This device only delivers while BodyT is open. Add it to your home screen for the rest.'
    case 'none':
      return 'This browser cannot show notifications.'
  }
}
