// ============================================================
// Asking the browser not to throw the user's training away.
//
// Storage granted to a web app is evictable by default: under
// disk pressure the browser can clear it without asking, and for
// this app that is somebody's entire training history. Calling
// persist() promotes it to durable on every engine that supports
// it, and is a no-op on the ones that do not.
//
// Behind an adapter because a native wrapper answers this
// question completely differently — an installed app's storage
// is already durable, so the Capacitor version of this is
// `return true` rather than a permission request.
// ============================================================

/**
 * Ask for durable storage. Never throws, never blocks.
 *
 * Fire-and-forget on purpose: the answer changes nothing the
 * caller can act on. A browser that says no is one where the data
 * is still there until it is not, and there is no second thing to
 * try. The right moment to ask is when the user has just committed
 * to something — the prompt, where one appears, then reads as
 * being about the thing they just did.
 */
export function requestDurableStorage(): void {
  if (typeof navigator === 'undefined') return
  void navigator.storage?.persist?.().catch(() => {})
}
