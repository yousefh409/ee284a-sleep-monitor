"use client";

import type { Slot } from "@/lib/slots";

type Props = {
  slot: Slot;
  prev: Slot | null;
  next: Slot | null;
  onPrev: () => void;
  onNext: () => void;
  onOpenCalendar: () => void;
  startedAt?: string | null;   // ISO timestamp of bedtime
  endedAt?: string | null;     // ISO timestamp of wake
  durationSec?: number | null; // total session duration
};

function fmt(date: string): string {
  // date is "YYYY-MM-DD" in PST; render as "Wed, May 27"
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function fmtClock(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function fmtDuration(sec: number | null | undefined): string | null {
  if (sec === null || sec === undefined) return null;
  const m = Math.round(sec / 60);
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

export function NightHeader({ slot, prev, next, onPrev, onNext, onOpenCalendar, startedAt, endedAt, durationSec }: Props) {
  const bed = fmtClock(startedAt);
  const wake = fmtClock(endedAt);
  const dur = fmtDuration(durationSec);
  const showSubtitle = !slot.inProgress && (bed || wake || dur);

  return (
    <header className="space-y-1 py-2">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onPrev}
          disabled={!prev}
          aria-label="Previous night"
          className="rounded-full p-3 text-4xl leading-none text-ink-muted transition disabled:opacity-30 enabled:hover:bg-rule enabled:hover:text-ink"
        >
          <span aria-hidden>‹</span>
        </button>

        <button
          type="button"
          onClick={onOpenCalendar}
          className="flex items-center gap-2 rounded-full px-4 py-1.5 text-[15px] text-ink transition hover:bg-rule"
        >
          <span>{fmt(slot.date)}</span>
          <span className="text-xs text-ink-muted" aria-hidden>▾</span>
        </button>

        <div className="flex items-center gap-3">
          {slot.inProgress && (
            <span className="flex items-center gap-1.5 rounded-full bg-copper-soft px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] text-copper">
              <span className="h-1.5 w-1.5 rounded-full bg-copper" />
              in progress
            </span>
          )}
          <button
            type="button"
            onClick={onNext}
            disabled={!next}
            aria-label="Next night"
            className="rounded-full p-3 text-4xl leading-none text-ink-muted transition disabled:opacity-30 enabled:hover:bg-rule enabled:hover:text-ink"
          >
            <span aria-hidden>›</span>
          </button>
        </div>
      </div>
      {showSubtitle && (
        <div className="flex justify-center gap-3 text-[12px] text-ink-muted">
          {bed && <span>asleep <span className="font-mono text-ink">{bed}</span></span>}
          {wake && (<>
            <span aria-hidden>·</span>
            <span>awake <span className="font-mono text-ink">{wake}</span></span>
          </>)}
          {dur && (<>
            <span aria-hidden>·</span>
            <span>total <span className="font-mono text-ink">{dur}</span></span>
          </>)}
        </div>
      )}
    </header>
  );
}
