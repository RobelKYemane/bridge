"use client";

import { useBridge } from "../lib/store";

export function DemoBanner() {
  const simulateInboundOrder = useBridge((s) => s.simulateInboundOrder);
  const resetToSeed = useBridge((s) => s.resetToSeed);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-300 bg-amber-100 px-6 py-2 text-sm text-amber-950">
      <div className="flex items-center gap-3">
        <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900">
          Demo
        </span>
        <span className="text-amber-900/90">
          Prototype only — data lives in your browser&apos;s localStorage. No real money.
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => simulateInboundOrder()}
          className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
        >
          Simulate inbound order
        </button>
        <button
          onClick={() => {
            if (confirm("Reset all transactions, orders, parties and rates to seed?")) {
              resetToSeed();
            }
          }}
          className="rounded-md border border-amber-400 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-200"
        >
          Reset demo
        </button>
      </div>
    </div>
  );
}
