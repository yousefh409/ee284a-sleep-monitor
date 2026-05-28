type StagePct = { awake: number; light: number; deep: number };
type Vitals = { avg_breathing: number; avg_heart_rate: number };

type Props = {
  stagePct: StagePct | null;
  vitals: Vitals | null;
  // Sensor-derived totals (preferred for time stats — match the per-stage breakdown)
  sleepTimeMin: number | null;      // sensor: total sleep minutes (light + deep)
  wakeDurMin: number | null;        // sensor: minutes awake in bed
  sensorScore: number | null;       // sensor's sleep_score (max value across session)
  sleepQuality: number | null;      // sensor's sleep_quality (last value)
  turnover: number | null;          // turnover_total (max)
  apneaEvents: number | null;       // apnea_events (max)
  lightSleepMin: number | null;     // sensor: light_sleep_dur (max)
  deepSleepMin: number | null;      // sensor: deep_sleep_dur (max)
};

function Stat({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">{label}</span>
      <span className="text-[22px] font-normal leading-none tracking-[-0.01em] text-ink">
        {value}
        {unit && <span className="ml-1 text-sm text-ink-muted">{unit}</span>}
      </span>
    </div>
  );
}

function fmtMin(min: number | null): string {
  if (min === null || min === undefined) return "—";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmt(n: number | null | undefined): string {
  return n === null || n === undefined ? "—" : String(n);
}

export function StatsRow({
  stagePct, vitals, sleepTimeMin, wakeDurMin, sensorScore, sleepQuality, turnover, apneaEvents, lightSleepMin, deepSleepMin,
}: Props) {
  return (
    <section className="space-y-6 border-t border-rule pt-6">
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-5">
        <Stat label="Awake" value={fmt(stagePct?.awake)} unit="%" />
        <Stat label="Light" value={fmt(stagePct?.light)} unit="%" />
        <Stat label="Deep" value={fmt(stagePct?.deep)} unit="%" />
        <Stat label="Avg br" value={fmt(vitals?.avg_breathing)} unit="bpm" />
        <Stat label="Avg hr" value={fmt(vitals?.avg_heart_rate)} unit="bpm" />
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
        <Stat label="Time sleeping" value={fmtMin(sleepTimeMin)} />
        <Stat label="Awake in bed" value={fmtMin(wakeDurMin)} />
        <Stat label="Light sleep" value={fmtMin(lightSleepMin)} />
        <Stat label="Deep sleep" value={fmtMin(deepSleepMin)} />
        <Stat label="Turnover" value={fmt(turnover)} />
        <Stat label="Apnea" value={fmt(apneaEvents)} />
        <Stat label="Sensor score" value={fmt(sensorScore)} />
        <Stat label="Sleep quality" value={fmt(sleepQuality)} />
      </div>
    </section>
  );
}
