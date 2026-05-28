type Row = { sleep_state: number | null };

type Props = { rows: Row[] };

const COLOR: Record<number, string> = {
  0: "var(--stage-out)",
  1: "var(--stage-awake)",
  2: "var(--stage-light)",
  3: "var(--stage-deep)",
};

function fill(state: number | null | undefined): string {
  if (state === null || state === undefined) return "var(--stage-out)";
  return COLOR[state] ?? "var(--stage-out)";
}

export function StageBand({ rows }: Props) {
  if (rows.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">Sleep stages</h2>
      <div className="flex h-8 w-full overflow-hidden rounded-lg">
        {rows.map((r, i) => (
          <div key={i} style={{ flex: 1, background: fill(r.sleep_state) }} />
        ))}
      </div>
      <div className="flex gap-4 text-[11px] text-ink-muted">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: "var(--stage-out)" }} />out</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: "var(--stage-awake)" }} />awake</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: "var(--stage-light)" }} />light</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: "var(--stage-deep)" }} />deep</span>
      </div>
    </section>
  );
}
