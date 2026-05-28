# Dashboard Redesign — Design Spec

**Date:** 2026-05-28
**Scope:** Full overhaul of `web/app/page.tsx` and supporting components.

## Goal

Replace the current "live monitor + selectable night detail" dashboard with a single-night viewer anchored on **last night's stats**, navigated by a calendar heatmap popover and prev/next arrows. Drop the dedicated live view (live data continues ingesting and shows up on charts naturally). Establish a coherent visual language built on a bookish × mineral mood.

## Information architecture

- **One route, one page.** No sub-pages. The night view is the page.
- **Default selection:** the most recent completed night in the `nights` table (i.e. "last night").
- **Navigable slots:** every completed night (one per row in `nights`), plus a synthetic **today-in-progress slot** for the current PST date when no completed night row exists for that date.
- **Night → calendar date mapping:** a night maps to the PST date of its `started_at`. The today-in-progress slot maps to the current PST date.
- **Navigation:**
  - Prev/next arrows step through the ordered slot list (completed nights + today-in-progress when applicable). They skip past days that have no data. They are disabled at the first/last available slot.
  - Forward from "last night" lands on the today-in-progress slot when it exists.
  - The date label between the arrows is a button that opens the heatmap calendar popover.
- **All current content is preserved**, restructured for clearer hierarchy.

## Page structure (top to bottom)

1. **Header strip.** `← [Wed, May 27 ▾] →`. A small `● in progress` pill appears on the right when the selected slot is the today-in-progress slot.
2. **Hero.** Sleep score as the dominant element — very large, light weight, copper-tinted. Editorial headline beside or below it. Generous whitespace.
3. **At-a-glance stats row.** Five stats: awake %, light %, deep %, avg breathing, avg heart rate. Label-over-value pairs, no boxes — type hierarchy carries it.
4. **Sleep-stage timeline band.** Full-width colored strip (existing `StageBand`) using the new stage palette. Hour markers underneath.
5. **Two-column block: wake events (left) + recommendations (right).** Side-by-side on desktop, stacked on mobile. Typed lists, no card chrome.
6. **Charts (stacked).**
   - Vitals (heart rate + breathing)
   - Environment (temperature + humidity)
   - Audio + light
   Each scoped to the selected night's window. Section label above (uppercase eyebrow), no card surface.
7. **Raw telemetry table.** Collapsed by default behind a "Show raw data" toggle. When expanded, it sits on a slightly raised surface and contains the full 40-field filterable table.

## Calendar popover

- Trigger: click the date button in the header. Dismiss on outside click or Esc.
- Anchored to the date button, ~320px wide, single-month view.
- **Header:** month/year label with `‹ ›` to navigate months. "Today" link in the corner jumps back to the current month.
- **Grid:** 7 columns, **Mon → Sun**. Each cell is a square showing the day number in the top-left corner.
- **Heatmap fill:** copper at varying opacity (roughly 5 tints) based on sleep score. Days with no data have a transparent cell and a light-gray day number. The today-in-progress slot renders with a thin pulsing copper ring (no fill) instead of a heatmap color.
- **Selected day:** outlined with a thin ink-colored ring (no fill change, to preserve heatmap reading).
- **Hover:** subtle ring + tooltip showing date and score (e.g. "Wed, May 27 · 82"). Days with no data show "No data" and the click is a no-op.
- **Out-of-month days:** faded, but clickable if they have data.
- **Click on a data day:** loads that night and closes the popover.

## Edge cases

- **No-data day clicked:** popover stays open; cell shows "No data" tooltip; click is a no-op.
- **Prev/next at boundaries:** arrows disable (fade) at the first or last available slot.
- **Today-in-progress slot:**
  - Exists whenever the current PST date has no completed `nights` row. Detected purely from PST time + the `nights` table — no telemetry-recency check required.
  - `● in progress` pill in the header.
  - Hero score renders "—" with an "in progress" label beneath. No headline.
  - Stats row, stage band, wake events, recommendations: render whatever can be computed from today's telemetry; missing fields show "—".
  - Charts: scoped to today's PST window (00:00 → now). When no telemetry exists yet for today, charts render an empty-state placeholder.
  - Raw telemetry table: shows today's rows.
- **Empty state (no completed nights and no telemetry today):** the entire page is replaced with a single empty state — "Waiting for your first night" plus a faint device icon.
- **Loading state:** skeleton blocks matching the hero + stats layout, copper-tinted shimmer.

## Visual language

### Mood

Bookish × mineral blend. Warm, grounded, editorial. Quiet authority with one earned accent color.

### Color tokens

| Token | Value | Role |
|-------|-------|------|
| `--ground` | `#F5F1E8` | Page background (plaster cream) |
| `--ground-raised` | `#FFFFFF` | Raised surface (only used by the expanded telemetry table) |
| `--ink` | `#1A1815` | Primary text (warm near-black) |
| `--ink-muted` | `#5C574F` | Secondary text (warm-tinted weathered slate) |
| `--rule` | `#E5DFD2` | Hairlines, dividers |
| `--copper` | `#8B6F47` | Primary accent (oxidized copper, muted) |
| `--copper-soft` | `rgba(139, 111, 71, 0.15)` | Chart fills, heatmap pale steps |
| `--stage-out` | `#EBE5D6` | Sleep stage: out of bed |
| `--stage-awake` | `#C9C0AC` | Sleep stage: awake |
| `--stage-light` | `#7A7468` | Sleep stage: light sleep |
| `--stage-deep` | `#1A1815` | Sleep stage: deep sleep |

Heatmap scale: 5 steps from low → high sleep score, derived from `--copper` by varying opacity/saturation.

### Type scale (Geist Sans + Geist Mono, already loaded)

| Role | Family | Weight | Size | Tracking | Line height |
|------|--------|--------|------|----------|-------------|
| Display (sleep score) | Geist Sans | 200 | ~120px | -0.04em | 1.0 |
| Editorial headline | Geist Sans | 500 | ~28px | -0.01em | 1.2 |
| Section label / eyebrow | Geist Sans | 500 | 11px | +0.08em | 1.2 (uppercase) |
| Body / list | Geist Sans | 400 | 15px | 0 | 22px |
| Stat label | Geist Sans | 500 | 11px | +0.08em | 1.2 (uppercase) |
| Stat value | Geist Sans | 400 | 22px | -0.01em | 1.2 |
| Mono (timestamps, numerics) | Geist Mono | 400 | 13px | 0 | 1.4 |

## Chart styling

- No card chrome. Charts sit directly on `--ground` with only a section label above.
- Primary series stroke: `--copper`. Secondary series: `--ink-muted`.
- Axes: hairline `--rule`. Axis labels in Geist Mono, `--ink-muted`.
- Hover: thin `--ink` crosshair plus a small ink-on-cream tooltip card.
- Gridlines: drop most. Keep only the baseline and at most one or two value lines.
- **Vitals chart:** heart rate (copper) + breathing (ink-muted) on a shared axis.
- **Environment chart:** temperature (copper) + humidity (ink-muted) on a dual axis.
- **Audio/light chart:** dB (copper) area or bars + light (ink-muted) line.
- **Sleep stage band:** structurally unchanged; uses the new stage palette.
- **Telemetry table (collapsed by default):** sits on `--ground-raised` when expanded; mono font; hairline row borders in `--rule`.

## Components and boundaries

The redesign reorganizes responsibilities so each component has one job and a clean interface. Files to add or change in `web/app`:

- `components/NightHeader.tsx` — header strip with prev/next arrows, the date popover trigger, and the in-progress pill. Owns the disabled-state logic for arrows.
- `components/CalendarPopover.tsx` — the heatmap calendar popover. Receives the slot list (nights + today-in-progress) and the selected date; emits a date selection.
- `components/NightHero.tsx` — the big sleep score + headline block. Handles the in-progress variant ("—" score, no headline).
- `components/StatsRow.tsx` — the five at-a-glance stats. Renders "—" for missing values.
- `components/StageBand.tsx` — existing, restyled with new stage palette.
- `components/WakeEvents.tsx` — list of wake events.
- `components/Recommendations.tsx` — list of recommendations.
- `components/LiveCharts.tsx` — existing; restyled (no card chrome, copper accent, hairline axes).
- `components/TelemetryTable.tsx` — existing; collapsed by default behind a toggle.
- `components/EmptyState.tsx` — "Waiting for your first night" screen.
- `app/page.tsx` — slim orchestrator: fetch the nights list and the selected night detail, render the components.
- `app/globals.css` — define the color tokens and base typographic rhythm.

## Data and API

Minor backend changes are required.

- `GET /api/nights` — bump the `LIMIT 30` to `LIMIT 365` so the calendar heatmap can show ~12 months of history. Response shape unchanged: id, started_at, ended_at, duration_sec, sleep_score, headline. Used to color heatmap cells and to determine prev/next neighbors.
- `GET /api/nights/:id` — extend the telemetry aggregation query so the per-minute rows include **all 40 telemetry fields**, not just the 8 it currently averages. Field set matches the live endpoint. Used to render the hero, stats, stage band, wake events, recommendations, charts, and the raw telemetry table.
- `GET /api/today` (new) — returns today's telemetry rows for the today-in-progress slot. Aggregated per minute, all 40 fields. Window is PST 00:00 → now. The client uses this whenever the user navigates to the in-progress slot. Implementation can reuse the same aggregation logic as `/api/nights/:id`.
- `GET /api/live?minutes=N` — no longer used by the UI; kept for the `/api/export` flow and for backwards compatibility. Not removed in this redesign.

**Slot identifier in the URL.** Selection state lives in a query param: `/?d=YYYY-MM-DD` (PST date). The client maps date → night row (or today-in-progress slot). Default with no query is "last night" (the most recent completed `nights` row). A specific date is shareable and deep-linkable.

## Out of scope

- New telemetry fields or schema changes.
- Authentication or user-account changes.
- Mobile-native apps. Layout is responsive but stays a single web page.
- Multi-device support beyond the existing `device` query param.
- Per-night editing, notes, or sharing features.

## Success criteria

- Landing on `/` shows last night's full detail without any clicks.
- The date button opens a calendar heatmap where score patterns are visible at a glance.
- Prev/next arrows step between slots (completed nights + today-in-progress when applicable) and disable at boundaries.
- All current content from the existing dashboard remains accessible (charts, table, briefing, wake events, recommendations).
- The page reads as one coherent visual system — bookish/mineral mood, copper accent used sparingly, editorial type hierarchy.
- The today-in-progress slot, no-data-day, and no-nights edge cases each have intentional handling.
- The today-in-progress slot is reachable by pressing the forward arrow from "last night".
