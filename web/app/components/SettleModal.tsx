"use client";

import { useMemo, useState } from "react";
import type {
  SettleParty,
  SettlementMethod,
} from "../lib/types";
import { SUPPORTED_CURRENCIES } from "../lib/types";
import { useBridge } from "../lib/store";
import { fmtMoney } from "../lib/selectors";

interface SettleModalProps {
  party: SettleParty;
  partyId: string;
  partyName: string;
  balance: Record<string, number>;
  onClose: () => void;
}

export function SettleModal({
  party,
  partyId,
  partyName,
  balance,
  onClose,
}: SettleModalProps) {
  const activeBranchId = useBridge((s) => s.activeBranchId);
  const addSettle = useBridge((s) => s.addSettle);

  const owedCurrencies = useMemo(
    () => Object.entries(balance).filter(([, v]) => Math.abs(v) > 0.005),
    [balance],
  );

  const [currency, setCurrency] = useState(
    owedCurrencies[0]?.[0] ?? SUPPORTED_CURRENCIES[0],
  );
  const balanceForCurrency = balance[currency] ?? 0;
  const owedToParty = balanceForCurrency > 0;
  const [amount, setAmount] = useState(String(Math.abs(balanceForCurrency).toFixed(2)));
  const [method, setMethod] = useState<SettlementMethod>(
    party === "seller" ? "usdt" : "bank",
  );

  const parsedAmount = parseFloat(amount) || 0;
  const direction = party === "seller"
    ? owedToParty ? "paid" : "received"
    : owedToParty ? "received" : "paid";
  const valid = parsedAmount > 0;

  const remaining = balanceForCurrency - (owedToParty ? parsedAmount : -parsedAmount);

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <h2 className="text-lg font-semibold">
          Settle with {partyName}
        </h2>
        <p className="mt-1 text-xs text-muted">
          {party === "seller"
            ? owedToParty
              ? "You'll record a payment from the agent to this seller."
              : "This seller currently has no outstanding balance with the agent."
            : owedToParty
              ? "You'll record cash received from this buyer."
              : "This buyer currently has no outstanding balance with the agent."}
        </p>

        {owedCurrencies.length > 0 ? (
          <div className="mt-4 rounded-md border border-border bg-background p-3 text-sm">
            <div className="mb-1 text-xs uppercase tracking-wider text-muted">
              Outstanding
            </div>
            <ul className="space-y-1">
              {owedCurrencies.map(([ccy, amt]) => (
                <li key={ccy} className="flex items-center justify-between">
                  <span className="font-mono">{ccy}</span>
                  <span
                    className={`font-mono ${amt > 0 ? "text-amber-700" : "text-emerald-700"}`}
                  >
                    {amt > 0 ? "owes you " : "you owe "}
                    {fmtMoney(Math.abs(amt), ccy)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
            All balances are zero. Recording a settlement now will create a credit/debit on the books.
          </div>
        )}

        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            addSettle({
              branchId: activeBranchId,
              partyType: party,
              partyId,
              amount: parsedAmount,
              currency,
              method,
              direction,
            });
            onClose();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Currency">
              <select
                value={currency}
                onChange={(e) => {
                  const next = e.target.value;
                  setCurrency(next);
                  const bal = balance[next] ?? 0;
                  setAmount(String(Math.abs(bal).toFixed(2)));
                }}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Amount">
              <input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
              />
            </Field>
          </div>

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

          <div className="rounded-md bg-background p-3 text-xs">
            <div>
              Direction:{" "}
              <span className="font-medium">
                {direction === "paid" ? "Agent pays party" : "Party pays agent"}
              </span>
            </div>
            <div className="mt-1 text-muted">
              After this, {partyName} balance in {currency} will be{" "}
              <span className="font-mono text-foreground">
                {fmtMoney(remaining, currency)}
              </span>
              .
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-3 py-2 text-sm hover:bg-background"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!valid}
              className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              Record settlement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
