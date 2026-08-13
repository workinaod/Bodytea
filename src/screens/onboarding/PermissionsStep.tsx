import { useState } from 'react'
import { ASK_LABEL, askState, requestAsk, type AskId, type AskState } from '../../platform/permissions'
import { enableReminders } from '../../logic/reminders'
import { Bar, Kicker, Title } from './kit'

// ============================================================
// The last thing, and the only screen that asks the phone for
// anything.
//
// It used to be a block bolted onto the bottom of the numbers
// step, in the middle of the wizard, under a header that said
// "set up now, never think about it again" and two paragraphs
// promising not to spam. Three sentences of reassurance is what
// somebody with something to hide writes.
//
// So: three asks, named, no explaining. Tap one and the phone's
// own prompt appears — which is the only honest description of
// what the button does. Skip is a real button, because all
// three are genuinely optional and pretending otherwise to get
// a higher grant rate is the trick this app does not do.
// ============================================================

const ASKS: AskId[] = ['notifications', 'motion', 'location']

/**
 * Saying yes to the OS is only half of turning reminders on — the other
 * half is the setting, the background-sync registration and the page
 * timers, which is what enableReminders does. Granting the permission
 * and leaving reminders switched off would be the worst of both: a
 * prompt answered and nothing to show for it.
 */
function grant(id: AskId): Promise<AskState> {
  if (id === 'notifications') return enableReminders().then((ok) => (ok ? 'granted' : 'denied'))
  return requestAsk(id)
}

export function PermissionsStep({ onDone }: { onDone: () => void }) {
  const [state, setState] = useState<Record<AskId, AskState>>(() => ({
    notifications: askState('notifications'),
    motion: askState('motion'),
    location: askState('location'),
  }))
  // Location is asked by taking a fix, which can sit there for ten
  // seconds behind the OS prompt. Without this the button looks broken
  // and gets tapped again, and the second tap is the one that races.
  const [asking, setAsking] = useState<AskId | null>(null)

  const live = ASKS.filter((id) => state[id] !== 'unsupported')
  const answered = live.filter((id) => state[id] !== 'prompt').length

  return (
    <div className="flex flex-1 flex-col">
      <Kicker>Entry 08</Kicker>
      <Title>Last thing</Title>

      <div className="mt-7 border-t border-white/[0.14]">
        {live.map((id) => {
          const st = state[id]
          const on = st === 'granted'
          const busy = asking === id
          return (
            <button
              key={id}
              type="button"
              disabled={on || busy}
              onClick={() => {
                setAsking(id)
                void grant(id)
                  .then((next) => setState((p) => ({ ...p, [id]: next })))
                  .finally(() => setAsking(null))
              }}
              className={`press -mx-5 flex w-[calc(100%+2.5rem)] items-center justify-between border-b px-5 py-4 text-left transition-colors ${
                on ? 'border-lime/50 bg-lime/[0.08]' : 'border-white/[0.09] active:bg-white/[0.04]'
              }`}
            >
              <span className={`headline text-[19px] uppercase leading-none tracking-[-0.02em] ${on ? 'text-lime' : 'text-ink'}`}>
                {ASK_LABEL[id]}
              </span>
              <span
                className={`text-[10px] font-black uppercase tracking-[0.2em] ${on ? 'text-lime' : 'text-ink-faint'}`}
              >
                {on ? 'On' : busy ? 'Asking' : st === 'denied' ? 'Blocked' : 'Allow'}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-auto pt-10">
        <Bar onClick={onDone} disabled={asking !== null}>
          {answered === live.length ? 'Done' : 'Skip'}
        </Bar>
      </div>
    </div>
  )
}
