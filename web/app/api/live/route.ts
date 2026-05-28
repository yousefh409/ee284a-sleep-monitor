import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const device = url.searchParams.get("device") ?? "sleep01";
  const { rows } = await pool.query(
    `SELECT extract(epoch FROM ts)::int AS t, *
     FROM telemetry
     WHERE device = $1 AND ts > now() - interval '10 minutes'
     ORDER BY ts ASC`,
    [device]
  );
  return NextResponse.json({ device, rows });
}
