"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "../../../components/Card";
import { ConfirmStrip } from "../../../components/ConfirmStrip";
import { useBridge } from "../../../lib/store";
import { fmtMoney } from "../../../lib/selectors";
import type { SettlementStatus } from "../../../lib/types";

export default function NewSellPage() {
  const router = useRouter();
  const buyers = useBridge((s) => s.buyers);
  const activeBranchId = useBridge((s) => s.activeBranchId);
  const addSell = useBridge((s) => s.addSell);

  const [buyerId, setBuyerId] = useState(buyers[0]?.id ?? "");
  const [recipientName, setRecipientName] = useState("RecipientX");
  const [localAmount, setLocalAmount] = useState("1000");
  const [localCurrency, setLocalCurrency] = useState("BIRR");
  const [rate, setRate] = useState("83.33");
  const [buyerOwesAmount, setBuyerOwesAmount] = useState("12");
  const [buyerCurrency, setBuyerCurrency] = useState("USD");
  const [paymentStatus, setPaymentStatus] = useState<SettlementStatus>("unpaid");
  const [reviewing, setReviewing] = useState(false);

  const buyer = buyers.find((b) => b.id === buyerId);
  const local = parseFloat(localAmount) || 0;
  const owes = parseFloat(buyerOwesAmount) || 0;
  const parsedRate = parseFloat(rate) || 0;
  const impliedRate = owes > 0 ? local / owes : 0;
  const rateMismatch =
    parsedRate > 0 &&
    impliedRate > 0 &&
    Math.abs(parsedRate - impliedRate) / Math.max(parsedRate, impliedRate) > 0.02;

  const valid = buyer && local > 0 && owes > 0 && parsedRate > 0 && recipientName.trim();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">New SELL transaction</h1>
        <p className="text-sm text-muted">Record a payout requested by a buyer to a recipient.</p>
      </header>

      <Card>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) setReviewing(true);
          }}
        >
          <Field label="Buyer">
            <select
              value={buyerId}
              onChange={(e) => setBuyerId(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {buyers.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Recipient name">
            <input
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Local payout amount">
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

          <Field label={`Sell rate (local per 1 ${buyerCurrency || "buyer ccy"})`}>
            <input
              type="number"
              step="any"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Buyer owes (amount)">
              <input
                type="number"
                step="any"
                value={buyerOwesAmount}
                onChange={(e) => setBuyerOwesAmount(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
              />
            </Field>
            <Field label="Buyer currency">
              <input
                value={buyerCurrency}
                onChange={(e) => setBuyerCurrency(e.target.value.toUpperCase())}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
              />
            </Field>
          </div>

          <Field label="Payment status">
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as SettlementStatus)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
          </Field>

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

      {reviewing && valid && buyer && (
        <ConfirmStrip
          title="Confirm SELL"
          lines={[
            `Buyer: ${buyer.name}`,
            `Recipient: ${recipientName}`,
            `Local paid out: ${fmtMoney(local, localCurrency)}`,
            `Sell rate: ${parsedRate}`,
            `Buyer owes: ${fmtMoney(owes, buyerCurrency)} (${paymentStatus})`,
          ]}
          onCancel={() => setReviewing(false)}
          onConfirm={() => {
            addSell({
              branchId: activeBranchId,
              buyerId,
              recipientName: recipientName.trim(),
              localAmount: local,
              localCurrency,
              rate: parsedRate,
              buyerOwesAmount: owes,
              buyerCurrency,
              paymentStatus,
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
