"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card } from "../components/Card";
import { useBridge } from "../lib/store";
import { fmtMoney, isBuy, isSell, isSettle, orderPipelineCounts } from "../lib/selectors";
import type { Order, OrderStatus, TxKind, TxStatus } from "../lib/types";

const KINDS: (TxKind | "ALL")[] = ["ALL", "BUY", "SELL", "SETTLE"];
const ORDER_STATUSES: (OrderStatus | "all")[] = ["all", "incoming", "accepted", "paid", "settled", "cancelled"];

export default function TransactionsPage() {
  const transactions = useBridge((s) => s.transactions);
  const orders = useBridge((s) => s.orders);
  const sellers = useBridge((s) => s.sellers);
  const buyers = useBridge((s) => s.buyers);
  const treasuryAccounts = useBridge((s) => s.treasuryAccounts);
  const acceptOrder = useBridge((s) => s.acceptOrder);
  const markOrderPaid = useBridge((s) => s.markOrderPaid);
  const markOrderSettled = useBridge((s) => s.markOrderSettled);
  const rejectOrder = useBridge((s) => s.rejectOrder);
  const voidPaidOrder = useBridge((s) => s.voidPaidOrder);
  const simulateInboundOrder = useBridge((s) => s.simulateInboundOrder);

  const [filter, setFilter] = useState<TxKind | "ALL">("ALL");
  const [orderFilter, setOrderFilter] = useState<OrderStatus | "all">("all");
  const pipeline = orderPipelineCounts(orders);

  const orderRows = useMemo(() => {
    const sorted = [...orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    if (orderFilter === "all") return sorted;
    return sorted.filter((o) => o.status === orderFilter);
  }, [orders, orderFilter]);

  const rows = useMemo(() => {
    const sorted = [...transactions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    if (filter === "ALL") return sorted;
    return sorted.filter((t) => t.kind === filter);
  }, [transactions, filter]);

  const wMap = Object.fromEntries(sellers.map((w) => [w.id, w.name]));
  const bMap = Object.fromEntries(buyers.map((b) => [b.id, b.name]));

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Transactions</h1>
          <p className="text-sm text-muted">
            Orders pipeline and ledger movements. Drive each lifecycle step from here.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => simulateInboundOrder()}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-background"
          >
            Simulate inbound order
          </button>
          <Link href="/transactions/new/buy" className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90">
            + Buy
          </Link>
          <Link href="/transactions/new/sell" className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-background">
            + Sell
          </Link>
          <Link href="/transactions/new/settle" className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-background">
            + Settle
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <PipelineTile label="Incoming" count={pipeline.incoming} tone="amber" />
        <PipelineTile label="Accepted" count={pipeline.accepted} tone="blue" />
        <PipelineTile label="Paid" count={pipeline.paid} tone="violet" />
        <PipelineTile label="Settled" count={pipeline.settled} tone="emerald" />
        <PipelineTile label="Cancelled" count={pipeline.cancelled} tone="slate" />
      </div>

      <Card
        title="Orders"
        subtitle="Customer send requests. Each row's action moves the lifecycle forward."
      >
        <div className="mb-3 flex flex-wrap gap-2">
          {ORDER_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setOrderFilter(s)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                orderFilter === s
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-border bg-card text-muted hover:bg-background"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        {orderRows.length === 0 ? (
          <p className="text-sm text-muted">No orders match this filter.</p>
        ) : (
          <div className="space-y-3">
            {orderRows.map((o) => (
              <OrderRow
                key={o.id}
                order={o}
                customerName={buyers.find((b) => b.id === o.customerId)?.name ?? o.customerId}
                sellers={sellers}
                treasuryAccounts={treasuryAccounts}
                onAccept={() => acceptOrder(o.id)}
                onMarkPaid={(source) => markOrderPaid(o.id, source)}
                onMarkSettled={() => markOrderSettled(o.id)}
                onReject={() => rejectOrder(o.id)}
                onVoid={() => {
                  const reason = prompt("Reason for voiding this order?") ?? undefined;
                  voidPaidOrder(o.id, reason || undefined);
                }}
              />
            ))}
          </div>
        )}
      </Card>

      <Card
        title="Ledger entries"
        subtitle="BUY / SELL / SETTLE rows that have hit the books."
      >
        <div className="mb-3 flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                filter === k
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-border bg-card text-muted hover:bg-background"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No transactions match this filter.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted">
              <tr className="border-b border-border">
                <th className="px-2 py-2 text-left font-medium">When</th>
                <th className="px-2 py-2 text-left font-medium">Type</th>
                <th className="px-2 py-2 text-left font-medium">Party</th>
                <th className="px-2 py-2 text-right font-medium">Local</th>
                <th className="px-2 py-2 text-right font-medium">Rate</th>
                <th className="px-2 py-2 text-right font-medium">Settlement</th>
                <th className="px-2 py-2 text-left font-medium">Status</th>
                <th className="px-2 py-2 text-left font-medium">State</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => {
                const dt = new Date(t.createdAt);
                const rowClass = t.status === "pending"
                  ? "border-b border-border bg-amber-50/40 last:border-0"
                  : t.status === "cancelled"
                    ? "border-b border-border opacity-50 line-through last:border-0"
                    : "border-b border-border last:border-0";
                if (isBuy(t)) {
                  return (
                    <tr key={t.id} className={rowClass}>
                      <td className="px-2 py-3 text-xs text-muted">{dt.toLocaleString()}</td>
                      <td className="px-2 py-3"><Tag kind="BUY" /></td>
                      <td className="px-2 py-3">{wMap[t.sellerId] ?? t.sellerId}</td>
                      <td className="px-2 py-3 text-right font-mono">{fmtMoney(t.localAmount, t.localCurrency)}</td>
                      <td className="px-2 py-3 text-right font-mono">{t.rate}</td>
                      <td className="px-2 py-3 text-right font-mono">{fmtMoney(t.settlementAmount, t.settlementCurrency)}</td>
                      <td className="px-2 py-3 text-xs text-muted">{t.settlementStatus}</td>
                      <td className="px-2 py-3 text-xs"><StateBadge status={t.status} /></td>
                    </tr>
                  );
                }
                if (isSell(t)) {
                  return (
                    <tr key={t.id} className={rowClass}>
                      <td className="px-2 py-3 text-xs text-muted">{dt.toLocaleString()}</td>
                      <td className="px-2 py-3"><Tag kind="SELL" /></td>
                      <td className="px-2 py-3">{bMap[t.buyerId] ?? t.buyerId} → {t.recipientName}</td>
                      <td className="px-2 py-3 text-right font-mono">{fmtMoney(t.localAmount, t.localCurrency)}</td>
                      <td className="px-2 py-3 text-right font-mono">{t.rate}</td>
                      <td className="px-2 py-3 text-right font-mono">{fmtMoney(t.buyerOwesAmount, t.buyerCurrency)}</td>
                      <td className="px-2 py-3 text-xs text-muted">{t.paymentStatus}</td>
                      <td className="px-2 py-3 text-xs"><StateBadge status={t.status} /></td>
                    </tr>
                  );
                }
                if (isSettle(t)) {
                  const name = t.partyType === "seller" ? wMap[t.partyId] : bMap[t.partyId];
                  return (
                    <tr key={t.id} className={rowClass}>
                      <td className="px-2 py-3 text-xs text-muted">{dt.toLocaleString()}</td>
                      <td className="px-2 py-3"><Tag kind="SETTLE" /></td>
                      <td className="px-2 py-3">{t.partyType} · {name ?? t.partyId}</td>
                      <td className="px-2 py-3 text-right">—</td>
                      <td className="px-2 py-3 text-right">—</td>
                      <td className="px-2 py-3 text-right font-mono">{fmtMoney(t.amount, t.currency)}</td>
                      <td className="px-2 py-3 text-xs text-muted">{t.direction} · {t.method}</td>
                      <td className="px-2 py-3 text-xs"><StateBadge status={t.status} /></td>
                    </tr>
                  );
                }
                return null;
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function Tag({ kind }: { kind: TxKind }) {
  const tone =
    kind === "BUY"
      ? "bg-blue-100 text-blue-700"
      : kind === "SELL"
        ? "bg-amber-100 text-amber-700"
        : "bg-slate-200 text-slate-700";
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${tone}`}>{kind}</span>
  );
}

function StateBadge({ status }: { status: TxStatus }) {
  const tone =
    status === "pending"
      ? "bg-amber-100 text-amber-700"
      : status === "cancelled"
        ? "bg-rose-100 text-rose-700"
        : "bg-emerald-100 text-emerald-700";
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${tone}`}>{status}</span>
  );
}

function PipelineTile({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "amber" | "blue" | "violet" | "emerald" | "slate";
}) {
  const toneClass = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    violet: "border-violet-200 bg-violet-50 text-violet-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  }[tone];
  return (
    <div className={`rounded-md border p-3 ${toneClass}`}>
      <div className="text-xs uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-1 font-mono text-lg font-semibold">{count}</div>
    </div>
  );
}

function OrderRow({
  order,
  customerName,
  sellers,
  treasuryAccounts,
  onAccept,
  onMarkPaid,
  onMarkSettled,
  onReject,
  onVoid,
}: {
  order: Order;
  customerName: string;
  sellers: { id: string; name: string; preferredCurrency: string }[];
  treasuryAccounts: { id: string; name: string; currency: string }[];
  onAccept: () => void;
  onMarkPaid: (source: { sellerId: string } | { treasuryAccountId: string }) => void;
  onMarkSettled: () => void;
  onReject: () => void;
  onVoid: () => void;
}) {
  // Only show treasury accounts that hold the destination currency
  // (you can't disburse BIRR from an AED-only float).
  const eligibleTreasury = treasuryAccounts.filter(
    (t) => t.currency === order.destCurrency,
  );
  type DisburseChoice = { kind: "seller"; id: string } | { kind: "treasury"; id: string };
  const initialChoice: DisburseChoice | "" =
    sellers[0]
      ? { kind: "seller", id: sellers[0].id }
      : eligibleTreasury[0]
        ? { kind: "treasury", id: eligibleTreasury[0].id }
        : "";
  const [choice, setChoice] = useState<DisburseChoice | "">(initialChoice);

  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted">
            <OrderStatusBadge status={order.status} />
            <span>via {order.source}</span>
            <span>·</span>
            <span>{new Date(order.createdAt).toLocaleString()}</span>
          </div>
          <div className="text-sm font-medium">
            {fmtMoney(order.sourceAmount, order.sourceCurrency)}
            <span className="mx-1 text-muted">→</span>
            {fmtMoney(order.destAmount, order.destCurrency)}
            <span className="ml-2 font-mono text-xs text-muted">
              @ {order.rate}
              {order.sellRateAtAccept !== undefined && order.sellRateAtAccept !== order.rate && (
                <span className="ml-1 text-amber-700">
                  (locked {order.sellRateAtAccept})
                </span>
              )}
              {order.costRateAtPaid !== undefined && (
                <span className="ml-1 text-emerald-700">
                  / cost {order.costRateAtPaid.toFixed(2)} {order.costCurrencyAtPaid}
                </span>
              )}
            </span>
          </div>
          <div className="text-xs">
            <span className="text-muted">From:</span> {customerName}
            {"  "}·{"  "}
            <span className="text-muted">To:</span> {order.recipientName}{" "}
            <span className="font-mono text-muted">({order.recipientPhone})</span>
            {order.recipientNote && (
              <span className="text-muted"> · {order.recipientNote}</span>
            )}
          </div>
          {order.originalMessage && (
            <div className="rounded-md border border-border bg-background px-2 py-1 font-mono text-[11px] text-muted">
              “{order.originalMessage}”
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {order.status === "incoming" && (
            <>
              <button
                onClick={onReject}
                className="rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-background"
              >
                Reject
              </button>
              <button
                onClick={onAccept}
                className="rounded-md bg-brand px-2.5 py-1.5 text-xs font-medium text-white hover:opacity-90"
              >
                Accept
              </button>
            </>
          )}
          {order.status === "accepted" && (
            <>
              <select
                value={choice === "" ? "" : `${choice.kind}:${choice.id}`}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) {
                    setChoice("");
                  } else {
                    const [kind, id] = v.split(":");
                    setChoice({ kind: kind as "seller" | "treasury", id });
                  }
                }}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                aria-label="Disbursing source"
              >
                {sellers.length > 0 && (
                  <optgroup label="Sellers">
                    {sellers.map((s) => (
                      <option key={s.id} value={`seller:${s.id}`}>
                        {s.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {eligibleTreasury.length > 0 && (
                  <optgroup label="Own float">
                    {eligibleTreasury.map((t) => (
                      <option key={t.id} value={`treasury:${t.id}`}>
                        {t.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {sellers.length === 0 && eligibleTreasury.length === 0 && (
                  <option value="">No source available</option>
                )}
              </select>
              <button
                onClick={onReject}
                className="rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-background"
              >
                Reject
              </button>
              <button
                disabled={choice === ""}
                onClick={() => {
                  if (choice === "") return;
                  onMarkPaid(
                    choice.kind === "seller"
                      ? { sellerId: choice.id }
                      : { treasuryAccountId: choice.id },
                  );
                }}
                className="rounded-md bg-brand px-2.5 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                Mark paid
              </button>
            </>
          )}
          {order.status === "paid" && (
            <>
              <button
                onClick={onVoid}
                className="rounded-md border border-rose-300 px-2.5 py-1.5 text-xs text-rose-700 hover:bg-rose-50"
              >
                Void
              </button>
              <button
                onClick={onMarkSettled}
                className="rounded-md bg-brand px-2.5 py-1.5 text-xs font-medium text-white hover:opacity-90"
              >
                Mark settled
              </button>
            </>
          )}
          {order.status === "settled" && (
            <button
              onClick={onVoid}
              className="rounded-md border border-rose-300 px-2.5 py-1.5 text-xs text-rose-700 hover:bg-rose-50"
            >
              Void
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const tone = {
    incoming: "bg-amber-100 text-amber-700",
    accepted: "bg-blue-100 text-blue-700",
    paid: "bg-violet-100 text-violet-700",
    settled: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-rose-100 text-rose-700",
  }[status];
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium uppercase ${tone}`}>
      {status}
    </span>
  );
}
