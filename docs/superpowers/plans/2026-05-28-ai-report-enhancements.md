# AI Report Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the per-night LLM report with rigorous wake events (citations + confidence), a new sleep-health commentary paragraph, a richer prompt (15-column CSV + stats block + Sonnet 4.6), and a CLI script that regenerates any past night against the new pipeline.

**Architecture:** Extract the report-building pipeline from `lib/mqtt.ts` into `lib/sleepReport.ts` so the MQTT session-close path and a new `scripts/regenerate-report.ts` CLI share one code path. `lib/claude.ts` system prompt grows to ~80 lines, accepts a session-stats string alongside the CSV, and emits two new fields. Schema gains one nullable column; the rest is JSONB-shape-compatible.

**Tech Stack:** Next.js 16 (App Router), Postgres via `pg`, Anthropic SDK (`@anthropic-ai/sdk`), TypeScript, Tailwind v4. CLI uses `tsx` to run TS directly.

**Reference spec:** [docs/superpowers/specs/2026-05-28-ai-report-enhancements-design.md](../specs/2026-05-28-ai-report-enhancements-design.md)

**Working directory for all commands:** `/Users/yousefh/Desktop/Classes/EE284A/project/web`

**Note on TDD:** The `web/` package has no test framework configured (consistent with the prior dashboard plan). Each task ends with a manual verification step (build, lint, or running the regenerate script end-to-end).

---

## File Map

| File | Status | Responsibility |
|------|--------|----------------|
| `lib/schema.ts` | Modify | Add `ALTER TABLE reports ADD COLUMN IF NOT EXISTS sleep_health TEXT;` |
| `lib/types.ts` | Modify | Add `WakeEvent` type with optional `triggers` + `confidence`; add `sleep_health?` to `SleepReport` |
| `lib/claude.ts` | Rewrite (in place) | New system prompt; `generateSleepReport(stats, csv)` signature; bump model + max_tokens |
| `lib/sleepReport.ts` | Create | Extracted pipeline: query telemetry → build stats + CSV → call LLM → persist (insert or update) |
| `lib/mqtt.ts` | Modify | `closeSession` becomes a thin wrapper around `lib/sleepReport.ts` |
| `app/api/nights/[id]/route.ts` | Modify | Select `r.sleep_health` |
| `app/components/WakeEvents.tsx` | Modify | Render optional confidence pill + trigger chips |
| `app/components/SleepHealth.tsx` | Create | Render `sleep_health` paragraphs |
| `app/page.tsx` | Modify | Add `<SleepHealth>` to the layout; pass `sleep_health` from `detail` |
| `scripts/regenerate-report.ts` | Create | CLI: `npx tsx scripts/regenerate-report.ts <night_id>` |

---

## Task 1: Schema — add `sleep_health` column

**Files:**
- Modify: `lib/schema.ts`

- [ ] **Step 1: Add the ALTER statement**

Open `lib/schema.ts`. Inside the `SCHEMA_SQL` template literal, find the block of `ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS …` lines (around lines 46-69). After the entire telemetry block (and after the `reports` table definition further down), add a new line **right after the `reports` CREATE TABLE block**:

```sql
ALTER TABLE reports ADD COLUMN IF NOT EXISTS sleep_health TEXT;
```

The full reports section should now look like:

```sql
CREATE TABLE IF NOT EXISTS reports (
  id              BIGSERIAL PRIMARY KEY,
  night_id        BIGINT NOT NULL REFERENCES nights(id) ON DELETE CASCADE,
  headline        TEXT NOT NULL,
  sleep_score     INT,
  stage_pct       JSONB,
  vitals          JSONB,
  wake_events     JSONB,
  recommendations JSONB,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE reports ADD COLUMN IF NOT EXISTS sleep_health TEXT;

CREATE INDEX IF NOT EXISTS reports_night_idx ON reports (night_id);
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: clean compile.

- [ ] **Step 3: Apply the migration on dev**

The schema is applied at boot via `instrumentation.ts`. Restart the dev server (or run a one-shot script) to ensure the ALTER runs. If a dev server is already up, kill it and restart it. On boot you should see `[migrate] schema applied` in the log (or no error from migrate).

If you can run a one-off query, verify:
```
psql ... -c "\d reports"
```
Expected: `sleep_health | text` column present.

- [ ] **Step 4: Commit**

```bash
git add lib/schema.ts
git commit -m "AI report: add reports.sleep_health column"
```

---

## Task 2: Types — extend `WakeEvent` and `SleepReport`

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Replace the `SleepReport` block**

Open `lib/types.ts`. At the bottom of the file, find:

```ts
export type SleepReport = {
  headline: string;
  sleep_score: number;
  stage_pct: { awake: number; light: number; deep: number };
  vitals: { avg_breathing: number; avg_heart_rate: number };
  wake_events: { ts: string; likely_cause: string }[];
  recommendations: string[];
};
```

Replace it with:

```ts
export type WakeEvent = {
  ts: string;
  likely_cause: string;
  triggers?: string[];
  confidence?: "low" | "medium" | "high";
};

export type SleepReport = {
  headline: string;
  sleep_score: number;
  stage_pct: { awake: number; light: number; deep: number };
  vitals: { avg_breathing: number; avg_heart_rate: number };
  wake_events: WakeEvent[];
  recommendations: string[];
  sleep_health?: string;
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | tail -5`
Expected: no errors. The existing consumers in `app/page.tsx`, `app/components/WakeEvents.tsx`, and `lib/mqtt.ts` only read fields that already exist on the new types, so no callsite changes are needed yet.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "AI report: extend WakeEvent and SleepReport types"
```

---

## Task 3: Rewrite `lib/claude.ts` — new system prompt, stats parameter, Sonnet 4.6

**Files:**
- Modify (rewrite): `lib/claude.ts`

- [ ] **Step 1: Replace the entire file contents**

Open `lib/claude.ts`. Replace the entire file with:

```ts
import Anthropic from "@anthropic-ai/sdk";
import type { SleepReport } from "./types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are a sleep coach analyzing one night of contactless mmWave radar data.

You receive: (1) a session-summary stats block and (2) a per-minute CSV of
telemetry. Your job is interpretation, not arithmetic — the numerical
summaries are already computed; cite them, don't recompute them.

Output ONLY a single JSON object with this exact shape (no prose outside it):

{
  "headline": "one short sentence summarizing the night",
  "sleep_score": <0-100 integer, your overall judgement>,
  "stage_pct": { "awake": <%>, "light": <%>, "deep": <%> },
  "vitals": { "avg_breathing": <bpm>, "avg_heart_rate": <bpm> },
  "wake_events": [
    {
      "ts": "H:MM AM/PM",
      "likely_cause": "one short sentence",
      "triggers": ["sound 62 dB", "HR 58→71 bpm", "state 1→2 for 4 min"],
      "confidence": "low" | "medium" | "high"
    }
  ],
  "recommendations": ["one specific suggestion for tonight"],
  "sleep_health": "1-3 short paragraphs of educational commentary"
}

CSV columns (one row per minute, local time):
  minute, sleep_state, breathing, hr, temp_c, humidity, pressure_hpa,
  gas_ohm, db_spl, light_raw, body_move_large, body_move_small,
  turnover, apnea_events, hr_instant

sleep_state values: 0=deep, 1=light, 2=awake, 3=out of bed
Movement fields are percentages of the minute spent moving.

=== Wake event rules ===

A wake event is a moment during the session when the radar or the vitals
suggest you came out of sleep, briefly or for longer.

Each event MUST include at least one entry in "triggers" — a short data
citation drawn from the CSV. Format each trigger as "channel value" or
"channel delta", e.g. "sound 62 dB", "HR 58→71 bpm", "state 1→2 for 4 min",
"temp drop 1.5°C", "movement 80% for 2 min".

Assign "confidence":
  - "high"   when ≥2 independent channels agree (sound spike AND HR jump,
             or state flip AND movement burst).
  - "medium" when one strong unambiguous channel (HR jumped ≥15 bpm but
             nothing else; or state flipped to awake for ≥3 minutes).
  - "low"    when only a weak signal (≤10 bpm HR dip, no other corroboration).

Do not invent wake events for periods where state stayed in light or deep
sleep AND no other channel showed an anomaly. Better to return an empty
wake_events array than to fabricate.

Use the wall-clock times from the CSV directly (they are already local).

=== Sleep health rules ===

The "sleep_health" field holds 1-3 short paragraphs of educational
commentary about this night, distinct from "recommendations".

  - "recommendations" = tactical things to do tonight ("dim lights earlier",
    "drop the thermostat 2°F").
  - "sleep_health" = what the data means, what the patterns suggest, how
    this night compares to typical adult sleep architecture, what's worth
    paying attention to over time.

Tone: calm, observational, educational. The voice of a thoughtful clinician,
not a wellness coach. No emoji, no exclamation marks. Cite specific numbers
from the stats block or CSV when making claims (e.g. "your 0 minutes of
deep sleep is unusual — most adults log 60-110 minutes per night").

Do not duplicate the tactical content of "recommendations" inside
"sleep_health".

=== General tone ===

Calm, concise, friendly but not effusive. No emoji. No prose outside the
JSON object. Do not pad. If a section has nothing to say, return an empty
array or a brief, honest sentence.`;

export async function generateSleepReport(stats: string, csvData: string): Promise<SleepReport> {
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    messages: [
      {
        role: "user",
        content: `${stats}\n\nPer-minute telemetry:\n${csvData}\n\nGenerate the JSON report.`,
      },
    ],
  });
  const text = resp.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in Claude response");
  return JSON.parse(match[0]) as SleepReport;
}
```

Note the signature is now `generateSleepReport(stats, csvData)` — the existing caller in `mqtt.ts` passes only `csv`, so this will break the build until Task 4/5 fix it.

- [ ] **Step 2: Verify TypeScript (build expected to fail)**

Run: `npx tsc --noEmit 2>&1 | tail -10`
Expected: an error in `lib/mqtt.ts` line ~98 about `generateSleepReport` expected 2 args, got 1. This is intentional — fixed in Task 5.

- [ ] **Step 3: Commit (intentionally broken — will be fixed in Task 5)**

```bash
git add lib/claude.ts
git commit -m "AI report: rewrite system prompt; add stats parameter; switch to Sonnet 4.6"
```

---

## Task 4: Create `lib/sleepReport.ts` — extracted pipeline

**Files:**
- Create: `lib/sleepReport.ts`

- [ ] **Step 1: Create the file**

Create `lib/sleepReport.ts`:

```ts
import { pool } from "./db";
import { generateSleepReport } from "./claude";

// Format a Date as local America/Los_Angeles "YYYY-MM-DD HH:MM" (24-hour).
function fmtMinute(d: Date): string {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)!.value;
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

// Format a Date as a local clock "H:MM AM/PM".
function fmtClock(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function fmtHM(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

type MinuteRow = {
  minute: Date;
  sleep_state: number | null;
  breathing: number | null;
  hr: number | null;
  temp_c: number | null;
  humidity: number | null;
  pressure_hpa: number | null;
  gas_ohm: number | null;
  db_spl: number | null;
  light_raw: number | null;
  body_move_large: number | null;
  body_move_small: number | null;
  turnover: number | null;
  apnea_events: number | null;
  hr_instant: number | null;
};

// Fetch per-minute aggregated telemetry for a session window (15 columns the LLM uses).
async function fetchMinuteRows(device: string, startedAt: Date, endedAt: Date): Promise<MinuteRow[]> {
  const { rows } = await pool.query<MinuteRow>(
    `SELECT date_trunc('minute', ts) AS minute,
            avg(sleep_state)::int AS sleep_state,
            avg(breathing)::int AS breathing,
            avg(heart_rate)::int AS hr,
            avg(temp_c) AS temp_c,
            avg(humidity) AS humidity,
            avg(pressure_hpa) AS pressure_hpa,
            avg(gas_ohm)::int AS gas_ohm,
            avg(db_spl) AS db_spl,
            avg(light_raw)::int AS light_raw,
            avg(body_move_large)::int AS body_move_large,
            avg(body_move_small)::int AS body_move_small,
            avg(turnover)::int AS turnover,
            avg(apnea_events)::int AS apnea_events,
            avg(hr_instant)::int AS hr_instant
     FROM telemetry WHERE device = $1 AND ts BETWEEN $2 AND $3
     GROUP BY minute ORDER BY minute`,
    [device, startedAt, endedAt]
  );
  return rows;
}

// Build the CSV body string (15 columns, header + one row per minute).
function buildCsv(rows: MinuteRow[]): string {
  const header =
    "minute,sleep_state,breathing,hr,temp_c,humidity,pressure_hpa,gas_ohm,db_spl,light_raw,body_move_large,body_move_small,turnover,apnea_events,hr_instant";
  const lines = rows.map((r) => {
    const c = [
      fmtMinute(r.minute),
      r.sleep_state,
      r.breathing,
      r.hr,
      r.temp_c !== null ? Number(r.temp_c).toFixed(1) : "",
      r.humidity !== null ? Number(r.humidity).toFixed(1) : "",
      r.pressure_hpa !== null ? Number(r.pressure_hpa).toFixed(1) : "",
      r.gas_ohm,
      r.db_spl !== null ? Number(r.db_spl).toFixed(1) : "",
      r.light_raw,
      r.body_move_large,
      r.body_move_small,
      r.turnover,
      r.apnea_events,
      r.hr_instant,
    ];
    return c.map((v) => (v === null || v === undefined ? "" : String(v))).join(",");
  });
  return [header, ...lines].join("\n");
}

// Build the session-summary stats block prepended to the user message.
async function buildStats(device: string, startedAt: Date, endedAt: Date): Promise<string> {
  const durationSec = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);
  const { rows: agg } = await pool.query<{
    light_max: number | null;
    deep_max: number | null;
    wake_max: number | null;
    turnover_max: number | null;
    apnea_max: number | null;
    quality_max: number | null;
  }>(
    `SELECT max(light_sleep_dur)::int AS light_max,
            max(deep_sleep_dur)::int AS deep_max,
            max(wake_dur)::int AS wake_max,
            max(turnover_total)::int AS turnover_max,
            max(apnea_events)::int AS apnea_max,
            max(sleep_quality)::int AS quality_max
     FROM telemetry WHERE device = $1 AND ts BETWEEN $2 AND $3`,
    [device, startedAt, endedAt]
  );
  const a = agg[0] ?? { light_max: null, deep_max: null, wake_max: null, turnover_max: null, apnea_max: null, quality_max: null };
  const line = (label: string, val: string | number | null) =>
    val === null || val === undefined ? `${label}: unavailable` : `${label}: ${val}`;
  return [
    `Session: ${fmtHM(Math.round(durationSec / 60))}`,
    `Asleep at: ${fmtClock(startedAt)}, awake at: ${fmtClock(endedAt)}`,
    line("Light sleep (sensor)", a.light_max !== null ? `${a.light_max} min` : null),
    line("Deep sleep (sensor)", a.deep_max !== null ? `${a.deep_max} min` : null),
    line("Awake in bed", a.wake_max !== null ? `${a.wake_max} min` : null),
    line("Turnover", a.turnover_max),
    line("Apnea events", a.apnea_max),
    line("Sensor sleep quality", a.quality_max !== null ? `${a.quality_max}/100` : null),
  ].join("\n");
}

// Build and persist (insert or update) the LLM report for a given night.
// Used by both the MQTT session-close path and the regenerate-report CLI.
export async function buildAndStoreReport(
  device: string,
  nightId: number,
  startedAt: Date,
  endedAt: Date,
): Promise<{ headline: string; sleep_score: number }> {
  const rows = await fetchMinuteRows(device, startedAt, endedAt);
  const csv = buildCsv(rows);
  const stats = await buildStats(device, startedAt, endedAt);

  const report = await generateSleepReport(stats, csv);

  await pool.query(
    `INSERT INTO reports (night_id, headline, sleep_score, stage_pct, vitals, wake_events, recommendations, sleep_health)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (night_id) DO UPDATE SET
       headline = EXCLUDED.headline,
       sleep_score = EXCLUDED.sleep_score,
       stage_pct = EXCLUDED.stage_pct,
       vitals = EXCLUDED.vitals,
       wake_events = EXCLUDED.wake_events,
       recommendations = EXCLUDED.recommendations,
       sleep_health = EXCLUDED.sleep_health,
       generated_at = now()`,
    [
      nightId,
      report.headline,
      report.sleep_score,
      report.stage_pct,
      report.vitals,
      JSON.stringify(report.wake_events),
      JSON.stringify(report.recommendations),
      report.sleep_health ?? null,
    ],
  );
  await pool.query(`UPDATE nights SET sleep_score = $1 WHERE id = $2`,
    [report.sleep_score, nightId]);

  return { headline: report.headline, sleep_score: report.sleep_score };
}
```

The `ON CONFLICT (night_id) DO UPDATE` requires a unique constraint on `reports.night_id`. The current schema has `reports_night_idx` as a non-unique index, so this ON CONFLICT won't fire. Two options to handle: either delete-then-insert, or add a unique constraint.

- [ ] **Step 2: Add a unique constraint on `reports.night_id`**

Modify `lib/schema.ts` again. After the existing `CREATE INDEX IF NOT EXISTS reports_night_idx ON reports (night_id);` line, add:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS reports_night_unique_idx ON reports (night_id);
```

This is safe to add: any existing duplicate `night_id` rows would cause the index creation to fail. If that happens, the operator can manually deduplicate; current behavior already only inserts one report per night, so duplicates shouldn't exist.

- [ ] **Step 3: Verify build (still broken by Task 3 — that's expected)**

Run: `npm run build 2>&1 | tail -10`
Expected: the same `generateSleepReport` arity error from Task 3 in `lib/mqtt.ts`. Will be fixed in Task 5.

- [ ] **Step 4: Commit**

```bash
git add lib/sleepReport.ts lib/schema.ts
git commit -m "AI report: extract report-building pipeline into lib/sleepReport.ts"
```

---

## Task 5: Refactor `lib/mqtt.ts` `closeSession` to delegate to `sleepReport.ts`

**Files:**
- Modify: `lib/mqtt.ts`

- [ ] **Step 1: Replace imports**

In `lib/mqtt.ts`, find the imports at the top:

```ts
import { generateSleepReport } from "./claude";
```

Replace with:

```ts
import { buildAndStoreReport } from "./sleepReport";
```

- [ ] **Step 2: Simplify `closeSession`**

Find the entire `closeSession` function (currently lines 48-110 in the file). Replace its body so it inserts the `nights` row and delegates report building:

```ts
async function closeSession(dev: string, endedAt: Date) {
  const s = getSession(dev);
  if (!s.startedAt) return;
  const startedAt = s.startedAt;
  const durationSec = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);
  s.startedAt = null;
  s.consecutiveInBed = 0;
  s.consecutiveOutOfBed = 0;
  s.consecutiveAwake = 0;

  if (durationSec < MIN_VALID_SESSION_HOURS * 3600) return;

  const { rows: nightRows } = await pool.query<{ id: number }>(
    `INSERT INTO nights (device, started_at, ended_at, duration_sec)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [dev, startedAt, endedAt, durationSec]
  );
  const nightId = nightRows[0].id;

  try {
    await buildAndStoreReport(dev, nightId, startedAt, endedAt);
  } catch (err) {
    console.error("[mqtt] LLM report failed for night", nightId, err);
  }
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | tail -10`
Expected: clean compile. The arity error from Task 3 is now resolved.

- [ ] **Step 4: Verify lint**

Run: `npm run lint 2>&1 | tail -10`
Expected: only pre-existing warnings. No new errors.

- [ ] **Step 5: Commit**

```bash
git add lib/mqtt.ts
git commit -m "AI report: simplify closeSession to delegate to buildAndStoreReport"
```

---

## Task 6: API route selects `sleep_health`

**Files:**
- Modify: `app/api/nights/[id]/route.ts`

- [ ] **Step 1: Add `r.sleep_health` to the SELECT**

Open `app/api/nights/[id]/route.ts`. Find the night row query (around lines 8-12). Update the SELECT to include `r.sleep_health`:

```ts
const { rows: nightRows } = await pool.query(
  `SELECT n.*, r.headline, r.sleep_score AS report_score, r.stage_pct, r.vitals,
          r.wake_events, r.recommendations, r.sleep_health
   FROM nights n LEFT JOIN reports r ON r.night_id = n.id
   WHERE n.id = $1`, [id]);
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: clean compile.

- [ ] **Step 3: Commit**

```bash
git add app/api/nights/[id]/route.ts
git commit -m "AI report: return sleep_health from /api/nights/:id"
```

---

## Task 7: `WakeEvents` — confidence pill + trigger chips

**Files:**
- Modify: `app/components/WakeEvents.tsx`

- [ ] **Step 1: Add the optional fields to the local `WakeEvent` type and update render**

Open `app/components/WakeEvents.tsx`. Replace the local `WakeEvent` type definition at the top:

```ts
type WakeEvent = {
  ts: string;
  likely_cause: string;
  triggers?: string[];
  confidence?: "low" | "medium" | "high";
};
```

Then, inside the `events.map` JSX block, replace the current `<li>` with this richer version:

```tsx
{events.map((e, i) => (
  <li key={i} className="space-y-1">
    <div className="flex items-baseline gap-4">
      <span className="font-mono text-[13px] text-ink-muted">
        {fmtWakeTs(e.ts, nightStartedAt, nightEndedAt)}
      </span>
      <span className="flex-1">{e.likely_cause}</span>
      {e.confidence && (
        <span
          className="rounded-full bg-copper-soft px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-copper"
        >
          {e.confidence === "medium" ? "med" : e.confidence}
        </span>
      )}
    </div>
    {e.triggers && e.triggers.length > 0 && (
      <div className="flex flex-wrap gap-1.5 pl-[5.5rem]">
        {e.triggers.map((t, j) => (
          <span
            key={j}
            className="rounded border border-rule px-1.5 py-0.5 font-mono text-[11px] text-ink-muted"
          >
            {t}
          </span>
        ))}
      </div>
    )}
  </li>
))}
```

The `pl-[5.5rem]` aligns the trigger chips under the cause text, past the timestamp column. Adjust if your design eye disagrees.

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit 2>&1 | tail -5`
Expected: no errors. The wider `WakeEvent` type in `lib/types.ts` (Task 2) is compatible with the local definition.

- [ ] **Step 3: Commit**

```bash
git add app/components/WakeEvents.tsx
git commit -m "AI report: render confidence pill and trigger chips on wake events"
```

---

## Task 8: New `SleepHealth` component

**Files:**
- Create: `app/components/SleepHealth.tsx`

- [ ] **Step 1: Create the component**

Create `app/components/SleepHealth.tsx`:

```tsx
type Props = { text: string | null | undefined };

export function SleepHealth({ text }: Props) {
  if (!text || text.trim().length === 0) return null;
  // Split on blank lines for paragraphs.
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <section className="space-y-3">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">Sleep health</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-ink">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit 2>&1 | tail -5`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add app/components/SleepHealth.tsx
git commit -m "AI report: add SleepHealth component"
```

---

## Task 9: Wire `SleepHealth` into the page

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add the type field and import**

In `app/page.tsx`, at the top imports block, add `SleepHealth` import:

```ts
import { SleepHealth } from "./components/SleepHealth";
```

Find the `NightDetail` type's `night` shape and add `sleep_health` to it:

```ts
type NightDetail = {
  night: {
    id: number;
    device: string;
    started_at: string;
    ended_at: string;
    duration_sec: number;
    sleep_score: number | null;
    headline: string | null;
    report_score: number | null;
    stage_pct: StagePct | null;
    vitals: Vitals | null;
    wake_events: WakeEvent[] | null;
    recommendations: string[] | null;
    sleep_health: string | null;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  telemetry: any[];
};
```

- [ ] **Step 2: Render `SleepHealth` in the two-column block**

Find the existing two-column block (currently `WakeEvents` + `Recommendations` in a `grid sm:grid-cols-2`). Restructure to a three-section layout: wake events on the left, Tonight + Sleep health stacked on the right.

Replace:

```tsx
{!slot.inProgress && (
  <div className="grid gap-10 sm:grid-cols-2">
    <WakeEvents
      events={detail?.night.wake_events ?? null}
      nightStartedAt={detail?.night.started_at ?? null}
      nightEndedAt={detail?.night.ended_at ?? null}
    />
    <Recommendations items={detail?.night.recommendations ?? null} />
  </div>
)}
```

With:

```tsx
{!slot.inProgress && (
  <div className="grid gap-10 sm:grid-cols-2">
    <WakeEvents
      events={detail?.night.wake_events ?? null}
      nightStartedAt={detail?.night.started_at ?? null}
      nightEndedAt={detail?.night.ended_at ?? null}
    />
    <div className="space-y-8">
      <Recommendations items={detail?.night.recommendations ?? null} />
      <SleepHealth text={detail?.night.sleep_health ?? null} />
    </div>
  </div>
)}
```

- [ ] **Step 3: Verify build + lint**

Run: `npm run build 2>&1 | tail -10`
Expected: clean.

Run: `npm run lint 2>&1 | tail -10`
Expected: only pre-existing warnings.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "AI report: render SleepHealth alongside Recommendations"
```

---

## Task 10: Regenerate CLI script

**Files:**
- Create: `scripts/regenerate-report.ts`

- [ ] **Step 1: Confirm `tsx` is available**

Run: `npx tsx --version 2>&1 | tail -2`
Expected: a version number printed (e.g. `tsx v4.x.x`). If it fails with "not found", install it as a dev dependency:

```bash
npm install --save-dev tsx
```

- [ ] **Step 2: Create the script**

Create `scripts/regenerate-report.ts`:

```ts
import { config } from "dotenv";
config({ path: ".env.local" });

import { pool } from "../lib/db";
import { buildAndStoreReport } from "../lib/sleepReport";

async function main() {
  const idArg = process.argv[2];
  if (!idArg) {
    console.error("usage: npx tsx scripts/regenerate-report.ts <night_id>");
    process.exit(1);
  }
  const nightId = Number(idArg);
  if (!Number.isInteger(nightId) || nightId <= 0) {
    console.error(`invalid night id: ${idArg}`);
    process.exit(1);
  }

  const { rows } = await pool.query<{
    device: string;
    started_at: string;
    ended_at: string;
  }>(
    `SELECT device, started_at, ended_at FROM nights WHERE id = $1`,
    [nightId],
  );
  if (rows.length === 0) {
    console.error(`night not found: ${nightId}`);
    process.exit(1);
  }

  const { device, started_at, ended_at } = rows[0];
  console.log(`Regenerating report for night ${nightId} (device=${device}) ...`);

  const result = await buildAndStoreReport(
    device,
    nightId,
    new Date(started_at),
    new Date(ended_at),
  );

  console.log(`Done. score=${result.sleep_score}`);
  console.log(`headline: ${result.headline}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

Note `dotenv` may already be a dependency via Next.js, but the script runs outside Next so it needs to load `.env.local` explicitly. If `dotenv` isn't installed, install it: `npm install --save-dev dotenv`.

- [ ] **Step 3: Install missing deps if any**

```bash
npm ls dotenv tsx 2>&1 | tail -10
```

Install whichever are missing:
```bash
npm install --save-dev tsx dotenv
```

- [ ] **Step 4: Verify it parses**

Run: `npx tsc --noEmit 2>&1 | tail -5`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add scripts/regenerate-report.ts package.json package-lock.json
git commit -m "AI report: add scripts/regenerate-report.ts CLI"
```

---

## Task 11: End-to-end smoke test — regenerate last night

**Files:** none (verification only).

- [ ] **Step 1: Identify the most recent night id**

Hit the running dev server's `/api/nights` endpoint (must be logged in in the browser), or use psql if available:

```
SELECT id, started_at, ended_at FROM nights ORDER BY started_at DESC LIMIT 1;
```

Note the returned `id`.

- [ ] **Step 2: Restart dev server so schema migration applies**

If the dev server is currently running, kill it and restart it (`npm run dev`). On boot the `instrumentation.ts` migration runs and adds the `sleep_health` column and unique index.

Confirm in the dev server log there are no migration errors. If the `CREATE UNIQUE INDEX` fails due to duplicate `night_id` rows in `reports`, manually deduplicate first:

```
DELETE FROM reports a USING reports b WHERE a.id < b.id AND a.night_id = b.night_id;
```

Then restart.

- [ ] **Step 3: Run the regenerate script for that night**

```bash
npx tsx scripts/regenerate-report.ts <night_id>
```

Expected: prints "Regenerating report for night ... (device=sleep01)" then "Done. score=N" and "headline: ...". Total runtime ~10-30s (one Sonnet 4.6 call).

If you see "no JSON in Claude response" or a JSON parse error, the LLM didn't follow the schema. Re-run; if it persists, inspect the raw response by temporarily logging `text` in `lib/claude.ts` before the JSON match.

- [ ] **Step 4: Verify in the dashboard**

Open the dev server in browser. Navigate to that night (date picker or prev/next). Expect:
- The hero headline reflects the new prompt's voice.
- Wake events (if any) now show a confidence pill on the right and trigger chips beneath each cause.
- A new "Sleep health" section appears beside (or below) "Tonight," with 1-3 paragraphs.
- No console errors.

- [ ] **Step 5: Smoke-test fallback for a legacy night**

Pick an older night that hasn't been regenerated. Open it in the dashboard. Expect:
- Wake events render as today (no confidence pill, no trigger chips).
- No "Sleep health" section appears.
- No console errors.

- [ ] **Step 6: Final commit if any fixes were needed**

If you had to tweak anything during the smoke test (e.g. dedupe rows, fix a typo), commit it:

```bash
git commit -am "AI report: smoke-test fixes"
```

Otherwise skip.

---

## Self-review checklist (applied — do not re-run if reading)

- **Spec coverage:** schema/types/prompt/UI/regenerate script all mapped to tasks (1-10). Last-night regeneration mapped to Task 11. The split of `lib/sleepReport.ts` matches the spec's "Components and boundaries" section.
- **Placeholders:** every code block contains actual code. No "TBD" / "implement later" / "similar to Task N".
- **Type consistency:** `generateSleepReport(stats, csvData)` is the new signature used in Tasks 3 and 4; old single-arg call removed in Task 5. `WakeEvent` extended in Task 2; consumed in Task 7. `sleep_health` flows from DB (Task 1) → API (Task 6) → page (Task 9) → component (Task 8).
- **Risks called out in spec are addressed in plan:** the `ON CONFLICT (night_id) DO UPDATE` requirement led to a unique-index addition (Task 4 step 2) plus a dedupe escape hatch in the smoke test (Task 11 step 2).
