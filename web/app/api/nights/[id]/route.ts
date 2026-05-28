import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { rows: nightRows } = await pool.query(
    `SELECT n.*, r.headline, r.sleep_score AS report_score, r.stage_pct, r.vitals,
            r.wake_events, r.recommendations
     FROM nights n LEFT JOIN reports r ON r.night_id = n.id
     WHERE n.id = $1`, [id]);
  if (nightRows.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
  const night = nightRows[0];

  const { rows: telemetry } = await pool.query(
    `SELECT extract(epoch FROM date_trunc('minute', ts))::int AS t,
            avg(sleep_state)::int AS sleep_state,
            avg(breathing)::int AS breathing,
            avg(heart_rate)::int AS heart_rate,
            avg(temp_c) AS temp_c,
            avg(humidity) AS humidity,
            avg(gas_ohm)::int AS gas_ohm,
            avg(db_spl) AS db_spl,
            avg(light_raw)::int AS light_raw
     FROM telemetry WHERE device = $1 AND ts BETWEEN $2 AND $3
     GROUP BY date_trunc('minute', ts) ORDER BY t`,
    [night.device, night.started_at, night.ended_at]);

  return NextResponse.json({ night, telemetry });
}
