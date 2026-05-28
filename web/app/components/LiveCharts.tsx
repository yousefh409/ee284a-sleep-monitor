"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  TimeScale
);

export type ChartRow = {
  ts: string;
  breathing: number | null;
  heart_rate: number | null;
  temp_c: number | null;
  humidity: number | null;
  pressure_hpa: number | null;
  gas_ohm: number | null;
  db_spl: number | null;
  light_raw: number | null;
};

const STONE_900 = "#1c1917";
const STONE_500 = "#78716c";
const STONE_400 = "#a8a29e";
const STONE_300 = "#d6d3d1";
const STONE_200 = "#e7e5e4";

function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function nullZero(v: number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (v === 0) return null;
  return v;
}

function baseOptions(extra: Record<string, unknown> = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      legend: {
        display: true,
        position: "bottom" as const,
        labels: {
          color: STONE_500,
          font: { size: 11 },
          boxWidth: 10,
          boxHeight: 10,
          padding: 12,
        },
      },
      tooltip: {
        backgroundColor: "#ffffff",
        borderColor: STONE_200,
        borderWidth: 1,
        titleColor: STONE_900,
        bodyColor: STONE_500,
        padding: 10,
        displayColors: true,
      },
    },
    elements: {
      line: { tension: 0.3, borderWidth: 1.5 },
      point: { radius: 0, hoverRadius: 4 },
    },
    ...extra,
  };
}

function xAxis() {
  return {
    type: "category" as const,
    grid: { display: false, drawBorder: false },
    ticks: {
      color: STONE_400,
      font: { size: 10 },
      maxTicksLimit: 6,
      autoSkip: true,
    },
  };
}

function yAxis(opts: { color?: string; position?: "left" | "right"; suggestedMin?: number; suggestedMax?: number } = {}) {
  return {
    type: "linear" as const,
    position: opts.position ?? ("left" as const),
    grid: {
      color: STONE_200,
      drawBorder: false,
    },
    ticks: {
      color: opts.color ?? STONE_400,
      font: { size: 10 },
      maxTicksLimit: 5,
    },
    suggestedMin: opts.suggestedMin,
    suggestedMax: opts.suggestedMax,
  };
}

function CardShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-stone-500">{title}</h2>
      <div className="h-56">{children}</div>
    </section>
  );
}

export function VitalsChart({ rows }: { rows: ChartRow[] }) {
  const data = useMemo(() => ({
    labels: rows.map((r) => fmtTime(r.ts)),
    datasets: [
      {
        label: "breathing",
        data: rows.map((r) => nullZero(r.breathing)),
        borderColor: STONE_900,
        backgroundColor: STONE_900,
        spanGaps: false,
      },
      {
        label: "heart rate",
        data: rows.map((r) => nullZero(r.heart_rate)),
        borderColor: STONE_500,
        backgroundColor: STONE_500,
        spanGaps: false,
      },
    ],
  }), [rows]);

  const options = useMemo(() => baseOptions({
    scales: {
      x: xAxis(),
      y: yAxis({ suggestedMin: 0, suggestedMax: 30 }),
    },
  }), []);

  return (
    <CardShell title="Vitals · bpm">
      <Line data={data} options={options} />
    </CardShell>
  );
}

export function EnvironmentChart({ rows }: { rows: ChartRow[] }) {
  const labels = rows.map((r) => fmtTime(r.ts));

  const tempData = useMemo(() => ({
    labels,
    datasets: [{
      label: "temp °C",
      data: rows.map((r) => r.temp_c ?? null),
      borderColor: STONE_900,
      backgroundColor: STONE_900,
      spanGaps: true,
    }],
  }), [rows]);

  const humData = useMemo(() => ({
    labels,
    datasets: [{
      label: "humidity %",
      data: rows.map((r) => r.humidity ?? null),
      borderColor: STONE_500,
      backgroundColor: STONE_500,
      spanGaps: true,
    }],
  }), [rows]);

  const presData = useMemo(() => ({
    labels,
    datasets: [{
      label: "pressure hPa",
      data: rows.map((r) => r.pressure_hpa ?? null),
      borderColor: STONE_900,
      backgroundColor: STONE_900,
      spanGaps: true,
    }],
  }), [rows]);

  const gasData = useMemo(() => ({
    labels,
    datasets: [{
      label: "gas Ω",
      data: rows.map((r) => r.gas_ohm ?? null),
      borderColor: STONE_500,
      backgroundColor: STONE_500,
      spanGaps: true,
    }],
  }), [rows]);

  const sparkOptions = useMemo(() => baseOptions({
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#ffffff",
        borderColor: STONE_200,
        borderWidth: 1,
        titleColor: STONE_900,
        bodyColor: STONE_500,
        padding: 10,
      },
    },
    scales: {
      x: xAxis(),
      y: yAxis(),
    },
  }), []);

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-stone-500">Environment</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="mb-2 text-xs text-stone-500">temp °C</p>
          <div className="h-32"><Line data={tempData} options={sparkOptions} /></div>
        </div>
        <div>
          <p className="mb-2 text-xs text-stone-500">humidity %</p>
          <div className="h-32"><Line data={humData} options={sparkOptions} /></div>
        </div>
        <div>
          <p className="mb-2 text-xs text-stone-500">pressure hPa</p>
          <div className="h-32"><Line data={presData} options={sparkOptions} /></div>
        </div>
        <div>
          <p className="mb-2 text-xs text-stone-500">gas Ω</p>
          <div className="h-32"><Line data={gasData} options={sparkOptions} /></div>
        </div>
      </div>
    </section>
  );
}

export function AudioLightChart({ rows }: { rows: ChartRow[] }) {
  const data = useMemo(() => ({
    labels: rows.map((r) => fmtTime(r.ts)),
    datasets: [
      {
        label: "dB SPL",
        data: rows.map((r) => r.db_spl ?? null),
        borderColor: STONE_900,
        backgroundColor: STONE_900,
        yAxisID: "y",
        spanGaps: true,
      },
      {
        label: "light",
        data: rows.map((r) => r.light_raw ?? null),
        borderColor: STONE_500,
        backgroundColor: STONE_500,
        yAxisID: "y1",
        spanGaps: true,
      },
    ],
  }), [rows]);

  const options = useMemo(() => baseOptions({
    scales: {
      x: xAxis(),
      y: { ...yAxis({ position: "left" }), title: { display: true, text: "dB", color: STONE_400, font: { size: 10 } } },
      y1: {
        ...yAxis({ position: "right", suggestedMin: 0, suggestedMax: 4095 }),
        grid: { drawOnChartArea: false },
        title: { display: true, text: "light", color: STONE_400, font: { size: 10 } },
      },
    },
  }), []);

  return (
    <CardShell title="Audio & light">
      <Line data={data} options={options} />
    </CardShell>
  );
}
