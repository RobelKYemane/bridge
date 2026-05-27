"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, Stat } from "./components/Card";
import { useBridge } from "./lib/store";
import {
  buyTotalsToday,
  formatMap,
  fmtMoney,
  grossSpread,
  incomingOrders,
  localStockByCurrency,
  sellTotalsToday,
  sumAcrossBuyers,
  sumAcrossSellers,
  treasuryBalance,
} from "./lib/selectors";

export default function Dashboard() {
  const transactions = useBridge((s) => s.transactions);
  const sellers = useBridge((s) => s.sellers);
  const buyers = useBridge((s) => s.buyers);
  const runSprint1Demo = useBridge((s) => s.runSprint1Demo);
  const orders = useBridge((s) => s.orders);
  const treasuryAccounts = useBridge((s) => s.treasuryAccounts);
  const depositTreasury = useBridge((s) => s.depositTreasury);
  const pendingCount = incomingOrders(orders).length;
  const rates = useBridge((s) => s.rates);
  const setRate = useBridge((s) => s.setRate);
  const removeRate = useBridge((s) => s.removeRate);

  const todayISO = new Date().toISOString();
  const buys = buyTotalsToday(transactions, todayISO);
  const sells = sellTotalsToday(transactions, todayISO);
  const stock = localStockByCurrency(transactions);
  const payables = sumAcrossSellers(transactions, sellers.map((w) => w.id), sellers);
  const receivables = sumAcrossBuyers(transactions, buyers.map((b) => b.id));
  const spread = grossSpread(transactions, sellers);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted">Today&apos;s position at a glance.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/transactions/new/buy"
            className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            + Buy
          </Link>
          <Link
            href="/transactions/new/sell"
            className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-background"
          >
            + Sell
          </Link>
          <Link
            href="/transactions/new/settle"
            className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-background"
          >
            + Settle
          </Link>
        </div>
      </header>

      {pendingCount > 0 && (
        <Link
          href="/transactions"
          className="flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 hover:bg-amber-100"
        >
          <span>
            <span className="font-medium">{pendingCount}</span> incoming order
            {pendingCount === 1 ? "" : "s"} waiting for review →
          </span>
          <span className="text-xs uppercase tracking-wider">Open transactions</span>
        </Link>
      )}

      <RateSheetCard rates={rates} onSet={setRate} onRemove={removeRate} />

      <TreasuryCard
        accounts={treasuryAccounts}
        balances={Object.fromEntries(
          treasuryAccounts.map((a) => [a.id, treasuryBalance(transactions, orders, a.id)]),
        )}
        onDeposit={(id, amt, note) => depositTreasury(id, amt, note)}
      />

      {transactions.length === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed border-border bg-card p-4 text-sm">
          <div>
            <div className="font-medium">Sprint 1 demo</div>
            <div className="text-xs text-muted">
              Seeds the spec scenario: BUY 1,000 BIRR @ 10 USD (Ahmed) + SELL 1,000 BIRR @ 12 USD (James → RecipientX). Expected spread: <span className="font-mono">2 USD</span>.
            </div>
          </div>
          <button
            onClick={runSprint1Demo}
            className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Run demo
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <Stat label="Today's buys" value={formatMap(buys)} />
        </Card>
        <Card>
          <Stat label="Today's sells" value={formatMap(sells)} />
        </Card>
        <Card>
          <Stat label="Local stock" value={formatMap(stock)} />
        </Card>
        <Card>
          <Stat
            label="Estimated gross spread"
            value={formatMap(spread)}
            tone={
              Object.values(spread).some((v) => v < 0)
                ? "negative"
                : Object.values(spread).some((v) => v > 0)
                  ? "positive"
                  : "default"
            }
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card
          title="Sellers"
          subtitle="Local-cash suppliers. Agent owes them."
          action={<Link href="/sellers" className="text-xs text-brand">View all →</Link>}
        >
          {sellers.length === 0 ? (
            <p className="text-sm text-muted">No sellers yet.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {sellers.map((w) => {
                const owed = sumAcrossSellers(transactions, [w.id], sellers);
                return (
                  <li key={w.id} className="flex items-center justify-between py-2">
                    <span>{w.name}</span>
                    <span className="font-mono text-foreground/90">{formatMap(owed)}</span>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-3 border-t border-border pt-3 text-xs text-muted">
            Total payable · <span className="font-mono text-foreground">{formatMap(payables)}</span>
          </div>
        </Card>

        <Card
          title="Margin"
          subtitle="Buyer revenue − seller cost across confirmed activity."
        >
          <div className="space-y-3 py-2">
            {Object.keys(spread).length === 0 ? (
              <p className="text-sm text-muted">No BUY/SELL activity yet.</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase tracking-wider text-muted">
                  <tr>
                    <th className="text-left font-medium">Ccy</th>
                    <th className="text-right font-medium">Cost</th>
                    <th className="text-right font-medium">Revenue</th>
                    <th className="text-right font-medium">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(spread).map((ccy) => {
                    const cost = transactions
                      .filter((t) => t.kind === "BUY" && t.status === "confirmed" && t.settlementCurrency === ccy)
                      .reduce((acc, t) => acc + (t.kind === "BUY" ? t.settlementAmount : 0), 0);
                    const revenue = transactions
                      .filter((t) => t.kind === "SELL" && t.status === "confirmed" && t.buyerCurrency === ccy)
                      .reduce((acc, t) => acc + (t.kind === "SELL" ? t.buyerOwesAmount : 0), 0);
                    const m = spread[ccy];
                    return (
                      <tr key={ccy} className="border-t border-border">
                        <td className="py-1.5 font-mono">{ccy}</td>
                        <td className="py-1.5 text-right font-mono">{cost.toLocaleString()}</td>
                        <td className="py-1.5 text-right font-mono">{revenue.toLocaleString()}</td>
                        <td className={`py-1.5 text-right font-mono font-semibold ${m >= 0 ? "text-positive" : "text-negative"}`}>
                          {m >= 0 ? "+" : "−"}{Math.abs(m).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        <Card
          title="Buyers"
          subtitle="Customers. They owe the agent."
          action={<Link href="/buyers" className="text-xs text-brand">View all →</Link>}
        >
          {buyers.length === 0 ? (
            <p className="text-sm text-muted">No buyers yet.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {buyers.map((b) => {
                const owed = sumAcrossBuyers(transactions, [b.id]);
                return (
                  <li key={b.id} className="flex items-center justify-between py-2">
                    <span>{b.name}</span>
                    <span className="font-mono text-foreground/90">{formatMap(owed)}</span>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-3 border-t border-border pt-3 text-xs text-muted">
            Total receivable · <span className="font-mono text-foreground">{formatMap(receivables)}</span>
          </div>
        </Card>
      </div>

      <Card title="Recent transactions" action={<Link href="/transactions" className="text-xs text-brand">View all →</Link>}>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted">
            No transactions yet. Try the Sprint 1 demo:
            <Link href="/transactions/new/buy" className="ml-1 text-brand">Buy 1000 BIRR from Ahmed at 10 USD</Link>.
          </p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {transactions.slice(-5).reverse().map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2">
                <span className="font-mono text-xs text-muted">{t.kind}</span>
                <span className="text-xs text-muted">{new Date(t.createdAt).toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

type RateInput = { sellRate: number; buyRate?: number; midRate?: number };

function TreasuryCard({
  accounts,
  balances,
  onDeposit,
}: {
  accounts: import("./lib/types").TreasuryAccount[];
  balances: Record<string, number>;
  onDeposit: (id: string, amt: number, note?: string) => void;
}) {
  const [depositTarget, setDepositTarget] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const amt = parseFloat(amount);
  return (
    <Card
      title="Own float (Treasury)"
      subtitle="Local cash you hold yourself, by branch + currency. Disburses without creating a payable."
    >
      {accounts.length === 0 ? (
        <p className="text-sm text-muted">No treasury accounts yet.</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {accounts.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium">{a.name}</div>
                <div className="text-xs text-muted">{a.currency}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono">{fmtMoney(balances[a.id] ?? 0, a.currency)}</span>
                <button
                  onClick={() => setDepositTarget(a.id)}
                  className="rounded-md border border-border px-2 py-1 text-xs hover:bg-background"
                >
                  Deposit
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {depositTarget && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Deposit to float</h2>
            <p className="mt-1 text-xs text-muted">
              {accounts.find((a) => a.id === depositTarget)?.name}
            </p>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted">
                  Amount
                </span>
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted">
                  Note (optional)
                </span>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="opening float, top-up, etc."
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setDepositTarget(null);
                  setAmount("");
                  setNote("");
                }}
                className="rounded-md border border-border px-3 py-2 text-sm hover:bg-background"
              >
                Cancel
              </button>
              <button
                disabled={!(amt > 0)}
                onClick={() => {
                  if (!(amt > 0)) return;
                  onDeposit(depositTarget, amt, note || undefined);
                  setDepositTarget(null);
                  setAmount("");
                  setNote("");
                }}
                className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                Record deposit
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function RateSheetCard({
  rates,
  onSet,
  onRemove,
}: {
  rates: import("./lib/types").Rates;
  onSet: (s: string, d: string, r: RateInput) => void;
  onRemove: (s: string, d: string) => void;
}) {
  const entries = Object.values(rates).sort((a, b) =>
    `${a.sourceCurrency}->${a.destCurrency}`.localeCompare(
      `${b.sourceCurrency}->${b.destCurrency}`,
    ),
  );
  return (
    <Card
      title="Today's rates"
      subtitle="Private to you. Sell rate is what the bot quotes customers. Buy rate is your seller cost. Spread = margin."
    >
      <div className="space-y-3">
        {entries.length === 0 ? (
          <p className="text-sm text-muted">
            No rates set. Add one below — e.g. <span className="font-mono">GBP → BIRR</span> sell{" "}
            <span className="font-mono">142.5</span>, buy <span className="font-mono">138</span>.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted">
              <tr className="border-b border-border">
                <th className="px-2 py-2 text-left font-medium">Pair</th>
                <th className="px-2 py-2 text-right font-medium">Sell</th>
                <th className="px-2 py-2 text-right font-medium">Buy</th>
                <th className="px-2 py-2 text-right font-medium">Spread</th>
                <th className="px-2 py-2 text-left font-medium">Updated</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <RateRow key={`${e.sourceCurrency}->${e.destCurrency}`} entry={e} onSet={onSet} onRemove={onRemove} />
              ))}
            </tbody>
          </table>
        )}
        <RateAddRow onAdd={onSet} />
      </div>
    </Card>
  );
}

function RateRow({
  entry,
  onSet,
  onRemove,
}: {
  entry: import("./lib/types").RateEntry;
  onSet: (s: string, d: string, r: RateInput) => void;
  onRemove: (s: string, d: string) => void;
}) {
  const initialSell = entry.sellRate ?? entry.rate;
  const initialBuy = entry.buyRate ?? entry.rate;
  const [sellVal, setSellVal] = useState(String(initialSell));
  const [buyVal, setBuyVal] = useState(String(initialBuy));
  const parsedSell = parseFloat(sellVal);
  const parsedBuy = parseFloat(buyVal);
  const dirty = parsedSell !== initialSell || parsedBuy !== initialBuy;
  const spread = parsedSell - parsedBuy;
  const spreadPct = parsedSell > 0 ? (spread / parsedSell) * 100 : 0;
  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-2 py-2 font-mono">
        {entry.sourceCurrency} → {entry.destCurrency}
      </td>
      <td className="px-2 py-2 text-right">
        <input
          type="number"
          step="any"
          value={sellVal}
          onChange={(e) => setSellVal(e.target.value)}
          className={`w-24 rounded-md border bg-background px-2 py-1 text-right font-mono text-sm ${
            parsedSell !== initialSell ? "border-brand" : "border-border"
          }`}
        />
      </td>
      <td className="px-2 py-2 text-right">
        <input
          type="number"
          step="any"
          value={buyVal}
          onChange={(e) => setBuyVal(e.target.value)}
          className={`w-24 rounded-md border bg-background px-2 py-1 text-right font-mono text-sm ${
            parsedBuy !== initialBuy ? "border-brand" : "border-border"
          }`}
        />
      </td>
      <td className="px-2 py-2 text-right font-mono text-xs">
        {Number.isFinite(spread)
          ? `${spread.toFixed(2)} (${spreadPct.toFixed(2)}%)`
          : "—"}
      </td>
      <td className="px-2 py-2 text-xs text-muted">{new Date(entry.updatedAt).toLocaleString()}</td>
      <td className="px-2 py-2">
        <div className="flex justify-end gap-2">
          {dirty && (
            <button
              onClick={() => {
                if (parsedSell > 0 && parsedBuy > 0) {
                  onSet(entry.sourceCurrency, entry.destCurrency, {
                    sellRate: parsedSell,
                    buyRate: parsedBuy,
                  });
                }
              }}
              className="rounded-md bg-brand px-2 py-1 text-xs font-medium text-white hover:opacity-90"
            >
              Save
            </button>
          )}
          <button
            onClick={() => onRemove(entry.sourceCurrency, entry.destCurrency)}
            className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:bg-background"
          >
            Remove
          </button>
        </div>
      </td>
    </tr>
  );
}

function RateAddRow({ onAdd }: { onAdd: (s: string, d: string, r: RateInput) => void }) {
  const [src, setSrc] = useState("");
  const [dst, setDst] = useState("");
  const [sell, setSell] = useState("");
  const [buy, setBuy] = useState("");
  const sellNum = parseFloat(sell);
  const buyNum = parseFloat(buy);
  const valid = src.trim() && dst.trim() && sellNum > 0 && buyNum > 0;
  return (
    <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3 text-sm">
      <label className="flex flex-col">
        <span className="mb-1 text-xs uppercase tracking-wider text-muted">From</span>
        <input
          value={src}
          onChange={(e) => setSrc(e.target.value.toUpperCase())}
          placeholder="GBP"
          className="w-24 rounded-md border border-border bg-background px-2 py-1.5 font-mono text-sm"
        />
      </label>
      <label className="flex flex-col">
        <span className="mb-1 text-xs uppercase tracking-wider text-muted">To</span>
        <input
          value={dst}
          onChange={(e) => setDst(e.target.value.toUpperCase())}
          placeholder="BIRR"
          className="w-24 rounded-md border border-border bg-background px-2 py-1.5 font-mono text-sm"
        />
      </label>
      <label className="flex flex-col">
        <span className="mb-1 text-xs uppercase tracking-wider text-muted">Sell</span>
        <input
          type="number"
          step="any"
          value={sell}
          onChange={(e) => setSell(e.target.value)}
          placeholder="142.5"
          className="w-28 rounded-md border border-border bg-background px-2 py-1.5 font-mono text-sm"
        />
      </label>
      <label className="flex flex-col">
        <span className="mb-1 text-xs uppercase tracking-wider text-muted">Buy</span>
        <input
          type="number"
          step="any"
          value={buy}
          onChange={(e) => setBuy(e.target.value)}
          placeholder="138"
          className="w-28 rounded-md border border-border bg-background px-2 py-1.5 font-mono text-sm"
        />
      </label>
      <button
        disabled={!valid}
        onClick={() => {
          if (!valid) return;
          onAdd(src.trim(), dst.trim(), { sellRate: sellNum, buyRate: buyNum });
          setSrc("");
          setDst("");
          setSell("");
          setBuy("");
        }}
        className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        Add pair
      </button>
    </div>
  );
}
