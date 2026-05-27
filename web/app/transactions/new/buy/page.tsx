"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "../../../components/Card";
import { ConfirmStrip } from "../../../components/ConfirmStrip";
import { useBridge } from "../../../lib/store";
import { fmtMoney } from "../../../lib/selectors";
import type { SettlementMethod, SettlementStatus } from "../../../lib/types";

export default function NewBuyPage() {
  const router = useRouter();
  const sellers = useBridge((s) => s.sellers);
  const activeBranchId = useBridge((s) => s.activeBranchId);
  const addBuy = useBridge((s) => s.addBuy);

  const [sellerId, setSellerId] = useState(sellers[0]?.id ?? "");
  const [localAmount, setLocalAmount] = useState("1000");
  const [localCurrency, setLocalCurrency] = useState("BIRR");
  const [rate, setRate] = useState("100");
  const [settlementAmount, setSettlementAmount] = useState("10");
  const [settlementCurrency, setSettlementCurrency] = useState("USD");
  const [settlementMethod, setSettlementMethod] = useState<SettlementMethod | "">("");
  const [settlementStatus, setSettlementStatus] = useState<SettlementStatus>("unpaid");
  const [reviewing, setReviewing] = useState(false);

  const seller = sellers.find((w) => w.id === sellerId);
  const local = parseFloat(localAmount) || 0;
  const settle = parseFloat(settlementAmount) || 0;
  const parsedRate = parseFloat(rate) || 0;
  const impliedRate = settle > 0 ? local / settle : 0;
  const rateMismatch = parsedRate > 0 && Math.abs(parsedRate - impliedRate) / Math.max(parsedRate, impliedRate) > 0.02;

  const valid =
    seller && local > 0 && parsedRate > 0 && settle > 0 && localCurrency && settlementCurrency;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">New BUY transaction</h1>
        <p className="text-sm text-muted">Record local currency received from a seller.</p>
      </header>

      <Card>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) setReviewing(true);
          }}
        >
          <Field label="Seller">
            <select
              value={sellerId}
              onChange={(e) => setSellerId(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {sellers.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Local amount">
              <input
                type="number"
                value={localAmount}
                onChange={(e) => setLocalAmount(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
              />
            </Field>
            <Field label="Local currency">
              <input
                value={localCurrency}
                onChange={(e) => setLocalCurrency(e.target.value.toUpperCase())}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
              />
            </Field>
          </div>

          <Field label={`Buy rate (local per 1 ${settlementCurrency || "settlement"})`}>
            <input
              type="number"
              step="any"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Settlement amount (agent owes)">
              <input
                type="number"
                step="any"
                value={settlementAmount}
                onChange={(e) => setSettlementAmount(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
              />
            </Field>
            <Field label="Settlement currency">
              <input
                value={settlementCurrency}
                onChange={(e) => setSettlementCurrency(e.target.value.toUpperCase())}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Method">
              <select
                value={settlementMethod}
                onChange={(e) => setSettlementMethod(e.target.value as SettlementMethod | "")}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">—</option>
                <option value="cash">Cash</option>
                <option value="usdt">USDT</option>
                <option value="bank">Bank</option>
              </select>
            </Field>
            <Field label="Status">
              <select
                value={settlementStatus}
                onChange={(e) => setSettlementStatus(e.target.value as SettlementStatus)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </Field>
          </div>

          {rateMismatch && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              Heads up — implied rate ({impliedRate.toFixed(4)}) differs from entered rate ({parsedRate}).
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-md border border-border px-3 py-2 text-sm hover:bg-background"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!valid}
              className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              Review
            </button>
          </div>
        </form>
      </Card>

      {reviewing && valid && seller && (
        <ConfirmStrip
          title="Confirm BUY"
          lines={[
            `Seller: ${seller.name}`,
            `Local received: ${fmtMoney(local, localCurrency)}`,
            `Buy rate: ${parsedRate}`,
            `Agent owes: ${fmtMoney(settle, settlementCurrency)} (${settlementStatus})`,
            settlementMethod ? `Method: ${settlementMethod}` : "Method: —",
          ]}
          onCancel={() => setReviewing(false)}
          onConfirm={() => {
            addBuy({
              branchId: activeBranchId,
              sellerId,
              localAmount: local,
              localCurrency,
              rate: parsedRate,
              settlementAmount: settle,
              settlementCurrency,
              settlementMethod: settlementMethod || undefined,
              settlementStatus,
            });
            router.push("/transactions");
          }}
        />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted">{label}</span>
      {children}
    </label>
  );
}
