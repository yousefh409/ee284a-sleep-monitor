export function EmptyState() {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <div
        aria-hidden
        className="h-12 w-12 rounded-full border border-rule"
        style={{ background: "var(--copper-soft)" }}
      />
      <h2 className="text-[22px] font-light tracking-[-0.01em] text-ink">Waiting for your first night</h2>
      <p className="text-[15px] text-ink-muted">
        Once the bedside device records a session, it will appear here.
      </p>
    </section>
  );
}
