"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBridge } from "../lib/store";
import { incomingOrders } from "../lib/selectors";

const NAV = [
  { href: "/", label: "Dashboard", glyph: "◆" },
  { href: "/transactions", label: "Transactions", glyph: "≡" },
  { href: "/sellers", label: "Sellers", glyph: "↓" },
  { href: "/buyers", label: "Buyers", glyph: "↑" },
  { href: "/daily-close", label: "Daily Close", glyph: "▣" },
  { href: "/audit-log", label: "Audit Log", glyph: "◷" },
];

export function Sidebar() {
  const pathname = usePathname();
  const pendingCount = useBridge((s) => incomingOrders(s.orders).length);
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-card md:flex md:flex-col">
      <div className="px-6 pt-6 pb-8">
        <div className="text-lg font-semibold tracking-tight">Bridge</div>
        <div className="text-xs text-muted">Currency Agent Ledger</div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
          const badge = item.href === "/inbox" && pendingCount > 0 ? pendingCount : null;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-brand-soft text-brand font-medium"
                  : "text-foreground/80 hover:bg-background"
              }`}
            >
              <span className="w-4 text-muted">{item.glyph}</span>
              <span className="flex-1">{item.label}</span>
              {badge !== null && (
                <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-medium text-white">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="px-6 py-4 text-xs text-muted">Prototype · saved locally</div>
    </aside>
  );
}
