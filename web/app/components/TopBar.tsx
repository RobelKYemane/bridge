"use client";

import { useBridge } from "../lib/store";

export function TopBar() {
  const branches = useBridge((s) => s.branches);
  const activeBranchId = useBridge((s) => s.activeBranchId);
  const setActiveBranch = useBridge((s) => s.setActiveBranch);
  const resetToSeed = useBridge((s) => s.resetToSeed);
  const active = branches.find((b) => b.id === activeBranchId) ?? branches[0];

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-8 py-4">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted">Active branch</div>
        <div className="mt-1 flex items-center gap-2">
          <select
            value={activeBranchId}
            onChange={(e) => setActiveBranch(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1 text-sm font-medium"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} — {b.city}, {b.country}
              </option>
            ))}
          </select>
          {active && (
            <span className="text-xs text-muted">
              ({branches.length} {branches.length === 1 ? "branch" : "branches"})
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-xs uppercase tracking-wider text-muted">Today</div>
          <div className="text-sm font-medium">
            {new Date().toLocaleDateString(undefined, {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </div>
        </div>
        <button
          onClick={() => {
            if (confirm("Reset all transactions and parties to seed state?")) resetToSeed();
          }}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-muted hover:bg-background"
        >
          Reset demo
        </button>
      </div>
    </header>
  );
}
