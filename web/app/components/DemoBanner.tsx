"use client";

import { useBridge } from "../lib/store";

export function DemoBanner() {
  const simulateInboundOrder = useBridge((s) => s.simulateInboundOrder);
  const resetToSeed = useBridge((s) => s.resetToSeed);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-red-600 px-6 py-2 text-sm text-white">
      <div className="flex items-center gap-3">
        <span className="rounded bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
          Demo
        </span>
        <span className="text-white/90">
          Prototype only — data lives in your browser&apos;s localStorage. No real money.
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => simulateInboundOrder()}
          className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-white/90"
        >
          Simulate inbound order
        </button>
        <button
          onClick={() => {
            if (confirm("Reset all transactions, orders, parties and rates to seed?")) {
              resetToSeed();
            }
          }}
          className="rounded-md border border-white/40 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
