"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "../../../components/Card";
import { ConfirmStrip } from "../../../components/ConfirmStrip";
import { useBridge } from "../../../lib/store";
import { fmtMoney } from "../../../lib/selectors";
import type { SettleDirection, SettleParty, SettlementMethod } from "../../../lib/types";

export default function NewSettlePage() {
  const router = useRouter();
  const sellers = useBridge((s) => s.sellers);
  const buyers = useBridge((s) => s.buyers);
  const activeBranchId = useBridge((s) => s.activeBranchId);
  const addSettle = useBridge((s) => s.addSettle);

  const [partyType, setPartyType] = useState<SettleParty>("seller");
  const [partyId, setPartyId] = useState(sellers[0]?.id ?? "");
  const [amount, setAmount] = useState("10");
  const [currency, setCurrency] = useState("USD");
  const [method, setMethod] = useState<SettlementMethod>("usdt");
  const [direction, setDirection] = useState<SettleDirection>("paid");
  const [reviewing, setReviewing] = useState(false);

  const list = partyType === "seller" ? sellers : buyers;
  const party = list.find((p) => p.id === partyId);
  const amt = parseFloat(amount) || 0;
  const valid = party && amt > 0 && currency;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">New SETTLE transaction</h1>
        <p className="text-sm text-muted">Record money paid to a seller or received from a buyer.</p>
      </header>

      <Card>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) setReviewing(true);
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <Field label="Party type">
              <select
                value={partyType}
                onChange={(e) => {
                  const next = e.target.value as SettleParty;
                  setPartyType(next);
                  const fallback = next === "seller" ? sellers[0]?.id : buyers[0]?.id;
                  setPartyId(fallback ?? "");
                  setDirection(next === "seller" ? "paid" : "received");
                }}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="seller">Seller</option>
                <option value="buyer">Buyer</option>
              </select>
            </Field>
            <Field label={partyType === "seller" ? "Seller" : "Buyer"}>
              <select
                value={partyId}
                onChange={(e) => setPartyId(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {list.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Amount">
              <input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
              />
            </Field>
            <Field label="Currency">
              <input
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Method">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as SettlementMethod)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="cash">Cash</option>
                <option value="usdt">USDT</option>
                <option value="bank">Bank</option>
              </select>
            </Field>
            <Field label="Direction">
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as SettleDirection)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="paid">Paid (agent → party)</option>
                <option value="received">Received (party → agent)</option>
              </select>
            </Field>
          </div>

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

      {reviewing && valid && party && (
        <ConfirmStrip
          title="Confirm SETTLEMENT"
          lines={[
            `${partyType === "seller" ? "Seller" : "Buyer"}: ${party.name}`,
            `${direction === "paid" ? "Agent pays" : "Agent receives"}: ${fmtMoney(amt, currency)}`,
            `Method: ${method}`,
          ]}
          onCancel={() => setReviewing(false)}
          onConfirm={() => {
            addSettle({
              branchId: activeBranchId,
              partyType,
              partyId,
              amount: amt,
              currency,
              method,
              direction,
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
