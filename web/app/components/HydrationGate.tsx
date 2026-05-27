"use client";

import { useEffect, type ReactNode } from "react";
import { useBridge, useHasHydrated } from "../lib/store";

export function HydrationGate({ children }: { children: ReactNode }) {
  useEffect(() => {
    useBridge.persist.rehydrate();
  }, []);
  const hydrated = useHasHydrated();
  if (!hydrated) {
    return <div className="px-8 py-8 text-sm text-muted">Loading ledger…</div>;
  }
  return <>{children}</>;
}
