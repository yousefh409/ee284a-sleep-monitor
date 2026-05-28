"use client";

export type TelemetryTableRow = {
  ts: string;
  in_bed: number | null;
  hum_presence: number | null;
  hum_dist_cm: number | null;
  breathing: number | null;
  heart_rate: number | null;
  temp_c: number | null;
  humidity: number | null;
  db_spl: number | null;
  gas_ohm: number | null;
  light_raw: number | null;
};

function fmtTs(ts: string) {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function num(v: number | null | undefined, digits = 0): string {
  if (v === null || v === undefined) return "—";
  if (v === 0) return "—";
  return v.toFixed(digits);
}

function yesNo(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return v ? "yes" : "no";
}

export function TelemetryTable({ rows, limit = 30 }: { rows: TelemetryTableRow[]; limit?: number }) {
  const newestFirst = [...rows].reverse().slice(0, limit);

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500">Recent telemetry</h2>
        <span className="text-xs text-stone-400">{newestFirst.length} rows</span>
      </div>
      <div className="max-h-96 overflow-auto">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-white">
            <tr className="text-xs uppercase tracking-wide text-stone-500">
              <th className="py-2 pr-4 font-normal">Time</th>
              <th className="py-2 pr-4 font-normal">In bed</th>
              <th className="py-2 pr-4 font-normal">Presence</th>
              <th className="py-2 pr-4 font-normal">Dist</th>
              <th className="py-2 pr-4 font-normal">Breath</th>
              <th className="py-2 pr-4 font-normal">HR</th>
              <th className="py-2 pr-4 font-normal">Temp</th>
              <th className="py-2 pr-4 font-normal">Hum</th>
              <th className="py-2 pr-4 font-normal">dB</th>
              <th className="py-2 pr-4 font-normal">Gas</th>
              <th className="py-2 font-normal">Light</th>
            </tr>
          </thead>
          <tbody>
            {newestFirst.map((r, i) => (
              <tr key={i} className="border-t border-stone-100 text-stone-700">
                <td className="py-2 pr-4 text-sm">{fmtTs(r.ts)}</td>
                <td className="py-2 pr-4 font-mono text-xs">{yesNo(r.in_bed)}</td>
                <td className="py-2 pr-4 font-mono text-xs">{yesNo(r.hum_presence)}</td>
                <td className="py-2 pr-4 font-mono text-xs">{num(r.hum_dist_cm)}</td>
                <td className="py-2 pr-4 font-mono text-xs">{num(r.breathing)}</td>
                <td className="py-2 pr-4 font-mono text-xs">{num(r.heart_rate)}</td>
                <td className="py-2 pr-4 font-mono text-xs">{r.temp_c == null ? "—" : r.temp_c.toFixed(1)}</td>
                <td className="py-2 pr-4 font-mono text-xs">{r.humidity == null ? "—" : r.humidity.toFixed(1)}</td>
                <td className="py-2 pr-4 font-mono text-xs">{r.db_spl == null ? "—" : r.db_spl.toFixed(0)}</td>
                <td className="py-2 pr-4 font-mono text-xs">{r.gas_ohm == null ? "—" : (r.gas_ohm / 1000).toFixed(1) + "k"}</td>
                <td className="py-2 font-mono text-xs">{num(r.light_raw)}</td>
              </tr>
            ))}
            {newestFirst.length === 0 && (
              <tr>
                <td className="py-4 text-sm text-stone-500" colSpan={11}>No telemetry rows yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
