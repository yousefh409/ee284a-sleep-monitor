import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const { rows } = await pool.query(
    `SELECT n.id, n.started_at, n.ended_at, n.duration_sec, n.sleep_score, r.headline
     FROM nights n LEFT JOIN reports r ON r.night_id = n.id
     ORDER BY n.started_at DESC LIMIT 30`
  );
  return NextResponse.json({ nights: rows });
}
