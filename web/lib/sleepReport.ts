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
