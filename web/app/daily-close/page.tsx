"use client";

import { Card } from "../components/Card";
import { useBridge } from "../lib/store";
import {
  buyTotalsToday,
  fmtMoney,
  formatMap,
  grossSpread,
  isBuy,
  isSell,
  ledger,
  localStockByCurrency,
  sellTotalsToday,
  sumAcrossBuyers,
  sumAcrossSellers,
} from "../lib/selectors";

export default function DailyClosePage() {
  const transactions = useBridge((s) => s.transactions);
  const sellers = useBridge((s) => s.sellers);
  const buyers = useBridge((s) => s.buyers);
  const branches = useBridge((s) => s.branches);
  const activeBranchId = useBridge((s) => s.activeBranchId);
  const branch = branches.find((b) => b.id === activeBranchId);

  const todayISO = new Date().toISOString();
  const buys = buyTotalsToday(transactions, todayISO);
  const sells = sellTotalsToday(transactions, todayISO);
  const stock = localStockByCurrency(transactions);
  const spread = grossSpread(transactions, sellers);

  const confirmed = ledger(transactions);

  const sellerLines = sellers.flatMap((w) => {
    const supplied = confirmed
      .filter((t) => isBuy(t) && t.sellerId === w.id)
      .reduce<Record<string, number>>((acc, t) => {
        if (!isBuy(t)) return acc;
        acc[t.localCurrency] = (acc[t.localCurrency] ?? 0) + t.localAmount;
        return acc;
      }, {});
    const owed = sumAcrossSellers(transactions, [w.id], sellers);
    if (Object.keys(supplied).length === 0 && Object.keys(owed).length === 0) return [];
    return [{ name: w.name, supplied, owed }];
  });

  const buyerLines = buyers.flatMap((b) => {
    const requested = confirmed
      .filter((t) => isSell(t) && t.buyerId === b.id)
      .reduce<Record<string, number>>((acc, t) => {
        if (!isSell(t)) return acc;
        acc[t.localCurrency] = (acc[t.localCurrency] ?? 0) + t.localAmount;
        return acc;
      }, {});
    const owed = sumAcrossBuyers(transactions, [b.id]);
    if (Object.keys(requested).length === 0 && Object.keys(owed).length === 0) return [];
    return [{ name: b.name, requested, owed }];
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Daily Close</h1>
        <p className="text-sm text-muted">
          {branch?.city ?? "—"} ·{" "}
          {new Date().toLocaleDateString(undefined, {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </header>

      <Card title="Local currency stock">
        {Object.keys(stock).length === 0 && Object.keys(buys).length === 0 && Object.keys(sells).length === 0 ? (
          <p className="text-sm text-muted">No activity yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted">
              <tr className="border-b border-border">
                <th className="px-2 py-2 text-left font-medium">Currency</th>
                <th className="px-2 py-2 text-right font-medium">Opening</th>
                <th className="px-2 py-2 text-right font-medium">Received</th>
                <th className="px-2 py-2 text-right font-medium">Paid out</th>
                <th className="px-2 py-2 text-right font-medium">Closing</th>
              </tr>
            </thead>
            <tbody>
              {currenciesFromMaps(stock, buys, sells).map((ccy) => {
                const received = buys[ccy] ?? 0;
                const paidOut = sells[ccy] ?? 0;
                const closing = stock[ccy] ?? 0;
                const opening = closing - received + paidOut;
                return (
                  <tr key={ccy} className="border-b border-border last:border-0">
                    <td className="px-2 py-3 font-mono">{ccy}</td>
                    <td className="px-2 py-3 text-right font-mono">{fmtMoney(opening, ccy)}</td>
                    <td className="px-2 py-3 text-right font-mono text-positive">+{fmtMoney(received, ccy)}</td>
                    <td className="px-2 py-3 text-right font-mono text-negative">−{fmtMoney(paidOut, ccy)}</td>
                    <td className="px-2 py-3 text-right font-mono font-semibold">{fmtMoney(closing, ccy)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Sellers">
          {sellerLines.length === 0 ? (
            <p className="text-sm text-muted">No seller activity.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {sellerLines.map((w) => (
                <li key={w.name} className="border-b border-border pb-3 last:border-0">
                  <div className="font-medium">{w.name}</div>
                  <div className="mt-1 text-xs text-muted">
                    Supplied: <span className="font-mono text-foreground">{formatMap(w.supplied)}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted">
                    Owed by agent: <span className="font-mono text-foreground">{formatMap(w.owed)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Buyers">
          {buyerLines.length === 0 ? (
            <p className="text-sm text-muted">No buyer activity.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {buyerLines.map((b) => (
                <li key={b.name} className="border-b border-border pb-3 last:border-0">
                  <div className="font-medium">{b.name}</div>
                  <div className="mt-1 text-xs text-muted">
                    Requested payout: <span className="font-mono text-foreground">{formatMap(b.requested)}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted">
                    Owes agent: <span className="font-mono text-foreground">{formatMap(b.owed)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Margin">
        {Object.keys(spread).length === 0 ? (
          <p className="text-sm text-muted">No transactions yet — spread will appear after a BUY and SELL.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted">
              <tr className="border-b border-border">
                <th className="px-2 py-2 text-left font-medium">Currency</th>
                <th className="px-2 py-2 text-right font-medium">Cost (paid sellers)</th>
                <th className="px-2 py-2 text-right font-medium">Revenue (from buyers)</th>
                <th className="px-2 py-2 text-right font-medium">Gross spread</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(spread).map((ccy) => {
                const cost = confirmed
                  .filter((t) => isBuy(t) && t.settlementCurrency === ccy)
                  .reduce((acc, t) => (isBuy(t) ? acc + t.settlementAmount : acc), 0);
                const revenue = confirmed
                  .filter((t) => isSell(t) && t.buyerCurrency === ccy)
                  .reduce((acc, t) => (isSell(t) ? acc + t.buyerOwesAmount : acc), 0);
                return (
                  <tr key={ccy} className="border-b border-border last:border-0">
                    <td className="px-2 py-3 font-mono">{ccy}</td>
                    <td className="px-2 py-3 text-right font-mono">{fmtMoney(cost, ccy)}</td>
                    <td className="px-2 py-3 text-right font-mono">{fmtMoney(revenue, ccy)}</td>
                    <td className={`px-2 py-3 text-right font-mono font-semibold ${spread[ccy] >= 0 ? "text-positive" : "text-negative"}`}>
                      {fmtMoney(spread[ccy], ccy)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <div className="rounded-md border border-dashed border-border bg-card p-4 text-xs text-muted">
        Lock-the-day, export, and reopen flows are documented in the spec (§10.8) and will land in the production build. Prototype is read-only at this step.
      </div>
    </div>
  );
}

function currenciesFromMaps(...maps: Record<string, number>[]): string[] {
  const set = new Set<string>();
  for (const m of maps) for (const k of Object.keys(m)) set.add(k);
  return Array.from(set).sort();
}
