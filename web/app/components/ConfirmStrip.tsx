import type { ReactNode } from "react";

export function ConfirmStrip({
  title,
  lines,
  onConfirm,
  onCancel,
}: {
  title: string;
  lines: ReactNode[];
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-md border border-brand bg-brand-soft p-4 text-sm">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand">{title}</div>
      <ul className="space-y-1 font-mono text-foreground">
        {lines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-background">
          Edit
        </button>
        <button onClick={onConfirm} className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90">
          Confirm & save
        </button>
      </div>
    </div>
  );
}
