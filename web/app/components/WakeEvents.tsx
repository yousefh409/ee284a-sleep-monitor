type WakeEvent = { ts: string; likely_cause: string };

type Props = { events: WakeEvent[] | null };

function fmtWakeTs(ts: string): string {
  const m = ts.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return ts;
  const h = parseInt(m[1], 10);
  const min = m[2];
  if (h < 0 || h > 23) return ts;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${min} ${period}`;
}

export function WakeEvents({ events }: Props) {
  if (!events || events.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">Wake events</h2>
      <ul className="space-y-1.5 text-[15px] text-ink">
        {events.map((e, i) => (
          <li key={i} className="flex gap-4">
            <span className="font-mono text-[13px] text-ink-muted">{fmtWakeTs(e.ts)}</span>
            <span>{e.likely_cause}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
