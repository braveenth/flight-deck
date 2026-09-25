# ✈ Flight Deck

A thirteen-app system for a 120-day transformation. Built around your original
`study_flight_checklist_addictive.html`, which is now the Study Flight module.

## Start it

```
./serve.command
```

Or double-click `serve.command` in Finder. It opens <http://localhost:8420>.

**Bookmark that URL** and set it as your browser's homepage. That's the whole
setup — it's meant to be the first page you open in the morning and the last at
night.

> Run it through the local server rather than double-clicking `index.html`.
> Browsers treat `file://` pages inconsistently for storage, and the thirteen
> apps share one data store. On `http://localhost` it always works.

## The modules

| Module | Cadence | What it does |
|---|---|---|
| **Mission Control** (`index.html`) | Always | Hub. Time-aware next action, four daily rings, streak, 120-day clock |
| **Preflight** | Daily, AM | Six-step launch: light/water/movement, identity, top three, WOOP, scheduling |
| **Study Flight** | Daily | 25/50/90-min timers, four-phase checklist, session log, cockpit mode |
| **Recall Bay** | Daily | Real SM-2 spaced repetition. Bulk import with `question :: answer` |
| **Habit Reactor** | Daily | Context-cued habits, per-habit streaks, 66-day automaticity bars |
| **Airframe** | Daily | Sleep, bedtime regularity, training, daylight. Weekly targets vs WHO guidelines |
| **Cabin Pressure** | Daily | Animated breathing pacer — cyclic sighing, box, 4-7-8, coherent |
| **Firewall** | On demand | Ten-minute urge-surfing timer, if-then rule library, commitment devices |
| **Debrief** | Daily, PM | Score the day, three good things, friction repair, tomorrow's first action |
| **Weekly Debrief** | Sundays | Auto scorecard vs last week, bottleneck analysis, one system change |
| **Flight Plan** | Set once | Up to three 120-day goals with pace projection |
| **Rhythm** | Anytime | When you start, when you stop, gaps between blocks, hour-of-day dead zones |
| **Flight Recorder** | Anytime | Heatmap, trends, records, export/import |
| **Evidence Log** | Reference | 35 citations, plus what was deliberately left out and why |

## Your day doesn't end at midnight

Flight Deck runs on a **logical day** that rolls over at **4:00am** by default, not at
midnight. A Debrief — or a study block — at 1:30am closes out the day that just
ended, rather than starting a new one. Everything keyed by day follows the same
clock: XP, streaks, habits, the heatmap. A late-night Debrief will not silently
hand you a phantom streak day.

Change the hour in **Rhythm → When your day rolls over** (0–8am; set it to
midnight to switch the behaviour off). Changing it only affects future entries —
nothing already logged moves.

When you're past midnight but before the rollover, the top bar shows a
`◐ STILL TUE` chip so you always know which day you're writing to.

## Timing

Every Preflight commit, study block, breathing session and Debrief commit is
timestamped. **Rhythm** turns that into:

- typical start / finish / day length, and how consistent your start time is
- start and finish plotted over time, so drift is visible
- a daily timeline showing every block and the gaps between them
- focused minutes by hour of day, which surfaces the hours you never use
- gap stats: typical gap between blocks, Preflight → first block latency,
  last block → Debrief

Days logged before timestamping existed show as empty rows — the history is
intact, it just has no clock attached.

## Your data

Everything lives in `localStorage` under one key (`flightdeck.v1`) in one
browser on one machine. Roughly 45 KB for a full 120 days.

**Export weekly.** Flight Recorder → Export JSON. Make it part of the Sunday
review. Clearing site data or switching browsers loses everything.

## Keyboard

- `M` — module drawer, `Esc` to close
- Study Flight: `Space` pause/resume, `C` cockpit mode
- Recall Bay: `Space` reveal, `1`–`4` grade

## Files

```
index.html            Mission Control
evidence.html         Citation log
serve.command         Launcher
assets/core.css       Design system
assets/core.js        Shared engine — storage, XP, streaks, nav, logical day
apps/*.html           The eleven modules
archive/              Your original file, untouched
```

## XP

`level = floor(sqrt(xp / 125)) + 1` — early levels are cheap on purpose, later
ones are earned. Ranks run Cadet → Astronaut. Awards carry a 12% chance of a
double-XP "tailwind" (variable-ratio reinforcement). You earn one streak freeze
per seven unbroken days, spent automatically on a single missed day so one lapse
can't zero the counter.
