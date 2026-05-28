type StagePct = { awake: number; light: number; deep: number };
type Vitals = { avg_breathing: number; avg_heart_rate: number };

type Props = {
  stagePct: StagePct | null;
  vitals: Vitals | null;
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

export function StatsRow({ stagePct, vitals }: Props) {
  const fmt = (n: number | null | undefined) =>
    n === null || n === undefined ? "—" : String(n);
  return (
    <section className="grid grid-cols-2 gap-x-8 gap-y-4 border-t border-rule pt-6 sm:grid-cols-5">
      <Stat label="Awake" value={fmt(stagePct?.awake)} unit="%" />
      <Stat label="Light" value={fmt(stagePct?.light)} unit="%" />
      <Stat label="Deep" value={fmt(stagePct?.deep)} unit="%" />
      <Stat label="Avg br" value={fmt(vitals?.avg_breathing)} unit="bpm" />
      <Stat label="Avg hr" value={fmt(vitals?.avg_heart_rate)} unit="bpm" />
    </section>
  );
}
