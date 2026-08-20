import { useMemo, useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { useToday } from '../../logic/clock'
import { buildJourney } from '../../engine/journey'
import { evaluateAchievements } from '../../engine/achievements'
import { athleteFacts } from '../../engine/achievementFacts'
import { groupCoverage, GROUP_ORDER, GROUP_REGIONS } from '../../engine/pickHelp'
import type { MuscleRegion } from '../../plan/muscleRegions'
import { PathLink, ScreenHeader, Tile, WeekNode } from '../../components/ui'
import { MuscleMap } from '../../components/MuscleMap'
import { Sticker } from '../../components/stickers'
import { ProfileStatsHeader } from './ProfileStatsHeader'
import { BadgeGrid, BadgeSheet } from './BadgeGrid'
import { MyRoomPreviewCard } from './MyRoomPreviewCard'
import { SettingsSheet } from '../coach/SettingsSheet'
import { AccountSheet } from '../coach/AccountSheet'
import { DataTransferSheet } from '../coach/DataTransferSheet'
import { ConnectedAppsSheet } from '../coach/ConnectedAppsSheet'
import { loadSyncMeta } from '../../cloud/logic'
import { daysBetween } from '../../engine/calendar'

// ============================================================
// Profile: who you are, not who is shouting at you.
//
// The Coach tab died to make room for this. Coaching did not:
// the quote and the push moved to Today where the decision is,
// the plan reader moved next to the plan, and the record moved
// to Progress next to the charts. What was left over was
// settings behind a gear, which is not a fifth of an app.
//
// What a fifth tab is worth is IDENTITY. The flame, the rank,
// the badges, the path you are on, the room your work builds.
// Every socket that is not built yet says so on its face.
//
// Contents per research/OP12-screen-law.md §8.
// ============================================================

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.7a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.7h4l.4-2.7a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z" />
    </svg>
  )
}

export function ProfileScreen({ onOpenProgress }: { onOpenProgress?: () => void } = {}) {
  const data = useAppStore((s) => s.data)
  const today = useToday()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [badgesOpen, setBadgesOpen] = useState(false)
  const [appsOpen, setAppsOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [dataOpen, setDataOpen] = useState(false)
  /**
   * Settings is where Account and Backup are reached from, so dismissing
   * either has to land back in Settings rather than on this screen.
   *
   * Closed and reopened rather than stacked: two open sheets means two
   * aria-modal dialogs and two document-level Escape handlers, and Escape
   * would dismiss both. Carried over from the Coach tab this replaced,
   * where it was a real bug the settings spec still guards.
   */
  const [backToSettings, setBackToSettings] = useState(false)
  const leaveSettingsFor = (openIt: (v: boolean) => void) => () => {
    setSettingsOpen(false)
    setBackToSettings(true)
    openIt(true)
  }
  const returnToSettings = (closeIt: (v: boolean) => void) => () => {
    closeIt(false)
    if (backToSettings) {
      setBackToSettings(false)
      setSettingsOpen(true)
    }
  }

  // Two different questions about backup, and Settings used to answer one
  // of them with the other's data: whether a FILE was ever exported, and
  // whether the ACCOUNT is syncing.
  const backupDays = data.settings.lastExportAt
    ? daysBetween(data.settings.lastExportAt.slice(0, 10), today)
    : null
  const cloudSyncedAt = loadSyncMeta()?.lastSyncAt ?? null

  const badges = useMemo(
    () => evaluateAchievements(data, today, athleteFacts(data, today)).filter((s) => s.earned).length,
    [data, today],
  )
  const journey = useMemo(() => buildJourney(data, today), [data, today])
  const body = useMemo(() => {
    const cover = groupCoverage(data, today, 7)
    const lit: MuscleRegion[] = []
    for (const g of cover) if (g.sets > 0) lit.push(...GROUP_REGIONS[g.group])
    return { lit, trained: cover.filter((g) => g.sets > 0).length }
  }, [data, today])

  // Six nodes: what you have cleared, where you are, and the summit. The
  // full climb with its estimates lives on Progress; this is the glance.
  const path = useMemo(() => {
    const done = journey.path.filter((s) => s.state === 'done')
    const ahead = journey.path.filter((s) => s.state !== 'done')
    return {
      done: Math.min(3, done.length),
      ahead: Math.min(2, Math.max(0, ahead.length - 1)),
      hasSummit: ahead.length > 0,
    }
  }, [journey])

  return (
    <div className="stagger space-y-3 pb-6">
      <ScreenHeader
        title="Profile"
        right={
          <button
            aria-label="Settings"
            onClick={() => setSettingsOpen(true)}
            className="press-down flex h-[30px] w-[30px] items-center justify-center rounded-[10px] border-2 border-edge bg-surface text-ink-dim [--lip:var(--lip-quiet)]"
          >
            <GearIcon />
          </button>
        }
      />

      <ProfileStatsHeader data={data} today={today} badges={badges} onOpenProgress={onOpenProgress} />

      {/* What you said you were here for, and how far along it is. */}
      <Tile onClick={onOpenProgress} ariaLabel="Open the climb">
        <div className="eyebrow text-ink-faint">Training path</div>
        {data.plan.goalStatement && (
          <p className="mt-0.5 text-[12.5px] font-extrabold italic text-accent-soft">
            “{data.plan.goalStatement}”
          </p>
        )}
        <div className="mt-2.5 flex items-center gap-1">
          {Array.from({ length: path.done }, (_, i) => (
            <span key={`d${i}`} className="flex flex-1 items-center gap-1">
              <WeekNode state="done" />
              <PathLink lit />
            </span>
          ))}
          <WeekNode state="today" />
          {Array.from({ length: path.ahead }, (_, i) => (
            <span key={`a${i}`} className="flex flex-1 items-center gap-1">
              <PathLink lit={false} />
              <WeekNode state="future" />
            </span>
          ))}
          {path.hasSummit && (
            <>
              <PathLink lit={false} />
              <span className="flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border-2 border-edge bg-surface-2 shadow-[0_2px_0_var(--color-edge)]">
                <Sticker name="trophy" size={10} />
              </span>
            </>
          )}
        </div>
        <div className="mt-1.5 text-[10.5px] font-extrabold text-ink-faint">
          {journey.totalCount === 0
            ? 'The climb fills in once there is history to read.'
            : `Stage ${journey.doneCount} of ${journey.totalCount}${journey.next ? ` · next: ${journey.next.label}` : ''}`}
        </div>
      </Tile>

      <div className="flex gap-2">
        <Tile className="flex-1 !px-3 !py-3">
          <div className="eyebrow text-[9px] text-ink-faint">Your body</div>
          <div className="mt-1 flex justify-center">
            <MuscleMap primary={body.lit} compact />
          </div>
          <div className="mt-1 text-center text-[9.5px] font-extrabold text-ink-faint">
            {body.trained}/{GROUP_ORDER.length} this week
          </div>
        </Tile>
        {/* A socket, labelled. Nothing here pretends the pact exists. */}
        <Tile className="flex-[1.4] !px-3 !py-3">
          <div className="flex items-baseline justify-between gap-2">
            <div className="eyebrow whitespace-nowrap text-[9px] text-ink-faint">Training pact</div>
            <span className="rounded-[10px] border-2 border-[var(--lip-gold)] px-1.5 py-px text-[8px] font-black uppercase text-gold">
              soon
            </span>
          </div>
          {/* Not a flame: a flame here would be showing somebody a streak
              that is not theirs, on a card about a feature that does not
              exist yet. Two of those in one tile is one too many. */}
          <div className="mt-2 flex items-center gap-1.5">
            <Sticker name="person" size={13} />
            <b className="text-[12px] font-black">You + a friend</b>
          </div>
          <p className="mt-1.5 text-[10px] font-bold leading-snug text-ink-faint">
            Both keep your own plans, the pact counts the days. Props from friends land here.
          </p>
        </Tile>
      </div>

      <MyRoomPreviewCard data={data} today={today} />

      <BadgeGrid data={data} today={today} onOpenAll={() => setBadgesOpen(true)} />

      <Tile onClick={() => setAppsOpen(true)} ariaLabel="Connected apps" className="!py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] font-black">Connected apps</div>
            <div className="mt-px text-[10.5px] font-bold text-ink-faint">
              Health sync, and what is real today
            </div>
          </div>
          <span className="text-[16px] font-black text-ink-faint">›</span>
        </div>
      </Tile>

      <BadgeSheet data={data} today={today} open={badgesOpen} onClose={() => setBadgesOpen(false)} />
      <ConnectedAppsSheet open={appsOpen} onClose={() => setAppsOpen(false)} />
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenAccount={leaveSettingsFor(setAccountOpen)}
        onOpenData={leaveSettingsFor(setDataOpen)}
        backupDays={backupDays}
        cloudSyncedAt={cloudSyncedAt}
      />
      <AccountSheet open={accountOpen} onClose={returnToSettings(setAccountOpen)} />
      <DataTransferSheet open={dataOpen} onClose={returnToSettings(setDataOpen)} />
    </div>
  )
}
