import { notificationSupport, requestNotificationPermission } from './notifications'
import { motionSupported, requestMotionPermission } from './motion'

// ============================================================
// The three things the app has to ask the phone for, behind one
// door.
//
// They were asked from inside a screen, which meant a React
// component knew about Notification.permission and
// navigator.permissions and DeviceMotionEvent.requestPermission
// — three platform APIs, three different shapes, and a screen
// that could not be rendered on anything but a browser.
//
// Here they are one type and one call each. The Capacitor build
// swaps this file; every screen keeps working.
//
// One rule the web enforces and this file respects: a permission
// prompt must happen inside the gesture that asked for it. Every
// request() below is called straight from a tap, with nothing
// awaited before it, or iOS silently refuses to show the sheet.
// ============================================================

export type AskId = 'notifications' | 'motion' | 'location'

/**
 * `unsupported` is not a failure — it is a browser that will never
 * have this, and the screen should stop offering it rather than
 * showing a button that cannot do anything.
 */
export type AskState = 'granted' | 'denied' | 'prompt' | 'unsupported'

/**
 * Motion is the one the platform will not tell us about after the fact:
 * there is no `navigator.permissions.query({name:'accelerometer'})` that
 * works, and DeviceMotionEvent.requestPermission is write-only. So the
 * answer is remembered for the life of the page, which is enough to stop
 * a step somebody just granted from showing "Allow" again when they walk
 * back and forward through the wizard.
 */
let motionGranted = false

export function askState(id: AskId): AskState {
  switch (id) {
    case 'notifications': {
      const s = notificationSupport()
      return s === 'unsupported' ? 'unsupported' : s === 'default' ? 'prompt' : s
    }
    case 'motion':
      if (motionGranted) return 'granted'
      return motionSupported() ? 'prompt' : 'unsupported'
    case 'location':
      return typeof navigator !== 'undefined' && 'geolocation' in navigator ? 'prompt' : 'unsupported'
  }
}

/**
 * Ask the phone. Resolves to the state afterwards, so a caller can
 * render the answer without a second query.
 *
 * Location has no queryable "did they say yes" that works everywhere,
 * so it is asked by taking a single fix: the browser shows its prompt,
 * and a position coming back IS the grant.
 */
export async function requestAsk(id: AskId): Promise<AskState> {
  switch (id) {
    case 'notifications':
      return (await requestNotificationPermission()) ? 'granted' : 'denied'
    case 'motion': {
      motionGranted = await requestMotionPermission()
      return motionGranted ? 'granted' : 'denied'
    }
    case 'location':
      return new Promise<AskState>((resolve) => {
        if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return resolve('unsupported')
        navigator.geolocation.getCurrentPosition(
          () => resolve('granted'),
          () => resolve('denied'),
          { timeout: 10_000 },
        )
      })
  }
}

/**
 * What each one is for, in the fewest words that still answer "why
 * would I". Not a paragraph of reassurance: the screen shows the ask,
 * and the ask has to be able to stand on its own.
 */
export const ASK_LABEL: Record<AskId, string> = {
  notifications: 'Notifications',
  motion: 'Motion',
  location: 'Location',
}
