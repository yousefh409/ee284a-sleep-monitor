import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

// PST window: midnight America/Los_Angeles → now.
// Returns telemetry aggregated per minute, all 40 fields,
// matching the shape of /api/nights/:id telemetry rows.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const device = url.searchParams.get("device") ?? "sleep01";

  const { rows: telemetry } = await pool.query(
    `WITH bounds AS (
       SELECT GREATEST(
                date_trunc('day', now() AT TIME ZONE 'America/Los_Angeles')
                  AT TIME ZONE 'America/Los_Angeles',
                COALESCE((SELECT MAX(ended_at) FROM nights WHERE device = $1), 'epoch'::timestamptz)
              ) AS start_ts,
              now() AS end_ts
     )
     SELECT extract(epoch FROM date_trunc('minute', t.ts))::int AS t,
            min(t.ts) AS ts,
            avg(t.presence)::int AS presence,
            avg(t.in_bed)::int AS in_bed,
            avg(t.sleep_state)::int AS sleep_state,
            avg(t.breathing)::int AS breathing,
            avg(t.heart_rate)::int AS heart_rate,
            avg(t.turnover)::int AS turnover,
            avg(t.body_move_large)::int AS body_move_large,
            avg(t.body_move_small)::int AS body_move_small,
            avg(t.apnea_events)::int AS apnea_events,
            avg(t.hum_presence)::int AS hum_presence,
            avg(t.hum_motion)::int AS hum_motion,
            avg(t.hum_range)::int AS hum_range,
            avg(t.hum_dist_cm)::int AS hum_dist_cm,
            avg(t.hr_instant)::int AS hr_instant,
            avg(t.breath_state)::int AS breath_state,
            avg(t.breath_value)::int AS breath_value,
            avg(t.wake_dur)::int AS wake_dur,
            avg(t.light_sleep_dur)::int AS light_sleep_dur,
            avg(t.deep_sleep_dur)::int AS deep_sleep_dur,
            avg(t.sleep_quality)::int AS sleep_quality,
            avg(t.disturbances)::int AS disturbances,
            avg(t.quality_rating)::int AS quality_rating,
            avg(t.abnormal_struggle)::int AS abnormal_struggle,
            avg(t.unattended_state)::int AS unattended_state,
            avg(t.unattended_time)::int AS unattended_time,
            avg(t.sleep_score)::int AS sleep_score,
            avg(t.sleep_time_min)::int AS sleep_time_min,
            avg(t.shallow_pct)::int AS shallow_pct,
            avg(t.deep_pct)::int AS deep_pct,
            avg(t.time_out_of_bed)::int AS time_out_of_bed,
            avg(t.exit_count)::int AS exit_count,
            avg(t.turnover_total)::int AS turnover_total,
            avg(t.temp_c) AS temp_c,
            avg(t.humidity) AS humidity,
            avg(t.pressure_hpa) AS pressure_hpa,
            avg(t.gas_ohm)::int AS gas_ohm,
            avg(t.db_spl) AS db_spl,
            avg(t.light_raw)::int AS light_raw
     FROM telemetry t, bounds b
     WHERE t.device = $1 AND t.ts BETWEEN b.start_ts AND b.end_ts
     GROUP BY date_trunc('minute', t.ts) ORDER BY t`,
    [device]);

  return NextResponse.json({ device, telemetry });
}
