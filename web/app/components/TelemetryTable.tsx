"use client";

import { useState } from "react";

export type TelemetryTableRow = {
  ts: string;
  [key: string]: number | string | null;
};

type Col = {
  key: string;
  label: string;
  fmt?: (v: number | string | null | undefined) => string;
};

function fmtTs(ts: string) {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
}

const dash = (v: number | string | null | undefined) =>
  v === null || v === undefined || v === "" ? "—" : String(v);

const num = (digits = 0) => (v: number | string | null | undefined) => {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n.toFixed(digits) : "—";
};

const yesNo = (v: number | string | null | undefined) => {
  if (v === null || v === undefined) return "—";
  return v ? "yes" : "no";
};

// Column definitions per group
const GROUPS: { id: string; label: string; cols: Col[] }[] = [
  {
    id: "radar_basic",
    label: "Radar — basic",
    cols: [
      { key: "presence", label: "Presence", fmt: yesNo },
      { key: "in_bed", label: "In bed", fmt: yesNo },
      { key: "sleep_state", label: "Sleep state" },
      { key: "breathing", label: "Breath (avg)", fmt: num(0) },
      { key: "heart_rate", label: "HR (avg)", fmt: num(0) },
      { key: "hum_dist_cm", label: "Distance (cm)", fmt: num(0) },
    ],
  },
  {
    id: "radar_motion",
    label: "Radar — movement",
    cols: [
      { key: "turnover", label: "Turnover", fmt: num(0) },
      { key: "body_move_large", label: "Large mv %", fmt: num(0) },
      { key: "body_move_small", label: "Small mv %", fmt: num(0) },
      { key: "apnea_events", label: "Apnea events", fmt: num(0) },
      { key: "hum_motion", label: "hum motion" },
      { key: "hum_range", label: "hum range" },
      { key: "hum_presence", label: "hum presence", fmt: yesNo },
    ],
  },
  {
    id: "radar_instant",
    label: "Radar — instant vitals",
    cols: [
      { key: "hr_instant", label: "HR instant", fmt: num(0) },
      { key: "breath_state", label: "Breath state" },
      { key: "breath_value", label: "Breath value", fmt: num(0) },
    ],
  },
  {
    id: "sleep_stats",
    label: "Sleep statistics",
    cols: [
      { key: "wake_dur", label: "Wake dur" },
      { key: "light_sleep_dur", label: "Light sleep dur" },
      { key: "deep_sleep_dur", label: "Deep sleep dur" },
      { key: "sleep_quality", label: "Sleep qual" },
      { key: "disturbances", label: "Disturb." },
      { key: "quality_rating", label: "Qual rating" },
      { key: "abnormal_struggle", label: "Abn struggle" },
      { key: "unattended_state", label: "Unattended" },
      { key: "unattended_time", label: "Unatt time" },
      { key: "sleep_score", label: "Sleep score" },
      { key: "sleep_time_min", label: "Sleep min" },
      { key: "shallow_pct", label: "Shallow %" },
      { key: "deep_pct", label: "Deep %" },
      { key: "time_out_of_bed", label: "Out-of-bed min" },
      { key: "exit_count", label: "Exits" },
      { key: "turnover_total", label: "Turnover total" },
    ],
  },
  {
    id: "environment",
    label: "Environment",
    cols: [
      { key: "temp_c", label: "Temp (°C)", fmt: num(1) },
      { key: "humidity", label: "Humidity (%)", fmt: num(1) },
      { key: "pressure_hpa", label: "Pressure (hPa)", fmt: num(1) },
      { key: "gas_ohm", label: "Gas (Ω)", fmt: num(0) },
    ],
  },
  {
    id: "audio_light",
    label: "Audio + light",
    cols: [
      { key: "db_spl", label: "dB SPL", fmt: num(1) },
      { key: "light_raw", label: "Light (raw)", fmt: num(0) },
    ],
  },
];

const ALL_COLS: Col[] = GROUPS.flatMap((g) => g.cols);

export function TelemetryTable({ rows, limit = 50 }: { rows: TelemetryTableRow[]; limit?: number }) {
  const [filter, setFilter] = useState<string>("all");
  const newestFirst = [...rows].reverse().slice(0, limit);

  const visibleCols =
    filter === "all" ? ALL_COLS : GROUPS.find((g) => g.id === filter)?.cols ?? ALL_COLS;

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500">
          Recent telemetry
        </h2>
        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs text-stone-700"
          >
            <option value="all">All fields ({ALL_COLS.length})</option>
            {GROUPS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label} ({g.cols.length})
              </option>
            ))}
          </select>
          <span className="text-xs text-stone-400">{newestFirst.length} rows</span>
        </div>
      </div>
      <div className="max-h-[28rem] overflow-auto">
        <table className="min-w-full text-left">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
              <th className="whitespace-nowrap py-2 pr-4 font-normal">Time</th>
              {visibleCols.map((c) => (
                <th key={c.key} className="whitespace-nowrap py-2 pr-4 font-normal">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {newestFirst.map((r, i) => (
              <tr key={i} className="border-t border-stone-100 text-stone-700">
                <td className="whitespace-nowrap py-2 pr-4 text-sm">{fmtTs(r.ts)}</td>
                {visibleCols.map((c) => {
                  const v = r[c.key];
                  const txt = c.fmt ? c.fmt(v) : dash(v);
                  return (
                    <td key={c.key} className="whitespace-nowrap py-2 pr-4 font-mono text-xs">
                      {txt}
                    </td>
                  );
                })}
              </tr>
            ))}
            {newestFirst.length === 0 && (
              <tr>
                <td className="py-4 text-sm text-stone-500" colSpan={visibleCols.length + 1}>
                  No telemetry rows yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
