# OP12 VISUAL LAW — the approved concept, checked in

**This file is the source of truth for how BodyT looks. It is not a proposal.**

The owner reviewed five rounds of preview and approved this. Anything in `src/` that
disagrees with this file is a bug in `src/`, not a difference of opinion, and
`src/visualLaw.test.ts` fails when the two drift apart.

## Why this file exists

The approved concept lived in a scratchpad HTML file in a temporary session directory. A
session that lost its context had nothing to build against, improvised the visual language
from memory, and got the two biggest decisions backwards: it built on pure black when the
approved ground is slate, and kept Inter when the approved face is Nunito. The owner's
words: "that's how projects are ruined."

An approved decision that lives outside the repo is not an approved decision. It is a
rumour. Anything the owner signs off on gets written down here, in the repo, next to the
code it governs, with a test that bites.

## The law, in one paragraph

Flat sticker surfaces. Thick visible borders, always 2px. A slate dark ground, never pure
black. Zero gradients, zero glass, zero glow. Every button is a flat fill with a hard
bottom edge that it depresses onto. Rounded-heavy type. Colour arrives as FILLS with dark
text on them, not as tints behind pale text. Ceremony is earned and it plays.

## Palette (exact, approved)

```
--bg      #131F24   the ground. NOT #0a0a0a. The app's old "pure neutral black,
                    zero colour cast" comment in index.css predates this and is
                    superseded: a sticker surface needs a ground it can sit ON.
--panel   #1A2730   cards, tiles, the tab bar
--panel2  #22333E   raised things inside a panel: coins, nodes, bar tracks
--line    #37464F   THE border. 2px, on everything.
--line2   #2A3944   dividers and rules, the quieter cut

--ink     #F1F7FB   primary text
--dim     #93A8B4   secondary text
--faint   #5D7280   labels, eyebrows, disabled

--heat      #FF4F30   brand, primary action
--heat-edge #C33714   its lip and its outline
--heat-soft #FF8A66   heat as TEXT (never heat on dark)

--volt      #B9EC3E   completion, done, banked
--volt-edge #8CBC1E
--volt-ink  #1B2A08   text ON volt

--ice       #1CB0F6   information
--ice-edge  #1489C4
--ice-ink   #062736

--gold      #FFC800   records, trophies
--gold-edge #CFA100
--gold-ink  #2E2200

--bad       #FF4B4B   danger
```

Every colour that can be a fill has an `-edge` one step darker. The edge is BOTH the 2px
outline and the lip beneath. That is what makes a control read as one moulded object
rather than as a rectangle with a shadow.

## Type

**Nunito.** Weights 500-900. Bundled locally as woff2 like Inter is, never a CDN link:
this is an offline PWA and a webfont over the network is a blank screen on a gym floor.

- body: 15.5px / 1.5 / weight **600** (the app's old 400 body is too light for this face)
- h1-h3: weight **900**, letter-spacing -0.01em
- mission title: 27px / 1.05 / 900
- ceremony number: 56px / 1 / 900
- eyebrow: 10-11px / 900 / letter-spacing 0.18em / uppercase / `--faint`
- button label: 15px / 900 / letter-spacing 0.08em / **uppercase**
- quiet link: 12px / 800 / `--faint` / underlined, 3px offset, **sentence case**

## Components (approved geometry)

| Thing | Spec |
|---|---|
| **tile / card** | `--panel`, 2px `--line`, radius 16, `box-shadow: 0 3px 0 var(--line)`, padding 14px 16px |
| tile, coloured | same, border and shadow swap to that colour's `-edge` |
| tile, filled | background becomes the colour, text becomes its `-ink` |
| **button** | radius 14, padding 15px 16px, `box-shadow: 0 4px 0 <edge>`, `:active { transform: translateY(4px); box-shadow: 0 0 0 transparent }` |
| button, ghost | `--panel` fill, 2px `--line`, `0 4px 0 var(--line)`, padding 13px 16px |
| **chip** | radius 11, padding 4px 10px, 11px/800, 2px border in the tone's `-edge`, `--panel` fill |
| **coin** (icon disc) | 52px circle; heat fill with `0 4px 0 --heat-edge`, or `--panel2` with 2px `--line` and `0 3px 0` |
| **avatar** | 34px, radius 12, `--panel2`, 2px `--line`, `0 2px 0 var(--line)` |
| **segmented** | 2px `--line`, radius 14, `--panel`, 3px pad, `0 3px 0 var(--line)`; active tab = `--heat` fill, radius 10, `0 2px 0 --heat-edge` |
| **progress bar** | height 12, radius 99, `--panel2` track, 2px `--line`, fill in heat / volt / gold |
| **list row** | padding 10px 2px, separated by a **2px** `--line2` rule (not 1px) |
| row leading disc | 40px, radius 12, `--panel2`, 2px `--line`, `0 2px 0 var(--line)` |
| **tab bar** | docked to the bottom edge, `--panel`, `border-top: 2px var(--line)`, padding 8/8/12. Tab: radius 12, 2px transparent border; active gets `--heat` border, `rgba(255,79,48,.1)` fill, `--heat-soft` text. Centre button: 42px circle, `--heat`, `0 4px 0 --heat-edge` |
| **week path** | node 17px circle, `--panel2`, 2px `--line`, `0 2px 0`; done = `--volt` fill + `--volt-edge` + a tick in `--volt-ink`; today = 21px, `--heat`, **white** border; rest = 13px at 0.6; connector 3px `--line2`, lit = `--volt-edge` |
| **section title** | eyebrow + a 2px `--line2` rule filling the remaining width |

## The one place glass survives, on purpose

Map chrome. `RouteMap` and `RunReplay` draw controls and labels OVER a photographic satellite
tile, and a flat panel with a 2px edge is unreadable there while a translucent scrim is exactly
right. The law governs the app's own surfaces; it does not govern a pill floating over someone's
neighbourhood. Anything not sitting on a map is flat.

## What is deliberately NOT this

The **onboarding** world keeps its own look: cream paper `#EAE7E0` with ink `#0D0D0C`, and
the dark room `#0B0B0C` on the first screen. It is a separate world on purpose and it is
also a lane this session does not own.

## This applies to EVERY surface, not the six the concept drew

The preview drew Today, Train, My Plan, Progress, Profile and Badges. It did not draw the
logger, the twenty-odd sheets, the pickers, the reviews or the trackers, and for one round that
was read as "those are out of scope". They are not. The concept is a LOOK, and a look that stops
at the six screens somebody mocked up is a redesign that makes the rest of the app look broken.

`src/paintLaw.test.ts` scans every `.tsx` under `src/` (and both stylesheets) for the idioms
this file bans by name:

| Banned | Because | Use instead |
|---|---|---|
| `bg-white/[0.0x]` | a fill made of opacity | `bg-surface-2` |
| `ring-1` | a hairline | `border-2 border-edge` |
| `gradient-to-*` | depth faked with light | a flat fill |
| `blur` / `backdrop-blur` | glass | nothing |
| `shadow-lg\|xl\|2xl` | a glow | `shadow-[0_3px_0_var(--color-edge)]` |
| any `box-shadow` with blur | a halo | the same hard lip |

Three files are exempt and the list only shrinks: `RouteMap`, `RunReplay` and `RunTrackerSheet`
draw chrome over satellite imagery, and `TabBar` keeps the scrim that fades a scrolling page
into the ground behind the docked bar, which the approved preview draws too (its `.fade`).

## The one gap that is named rather than closed: 23 sport emoji

The law says zero emoji, and the app's own icons now obey it: `components/stickers.tsx` draws
every mark the rebuilt screens use, and the badge categories, the cardio doors and the launcher
coins all went through it.

What is left is `plan/cardio.ts`, where **23 distinct emoji** identify 24 activities: run, bike,
swim, row, ski, box, yoga, basketball, football, and so on. That is not a sweep, it is 23 pieces
of artwork, and the honest reason it is not done here is that the cheap version is worse than
the emoji: mapping 23 sports onto five generic marks would make a run and a swim look identical,
which loses information the emoji actually carry.

`src/paintLaw.test.ts` pins the count. It can only go DOWN. Every sticker somebody draws for
that table is one fewer emoji, and nobody can add a 24th activity with an emoji without the
guard saying so.

## Enforcement

`src/visualLaw.test.ts` reads `src/index.css` and asserts the approved values are present.
It fails loudly and names this file. If a value here genuinely needs to change, the owner
changes it, this file changes with it, and the test moves in the same commit.
