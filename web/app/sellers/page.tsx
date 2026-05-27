"use client";

import { useState } from "react";
import { Card } from "../components/Card";
import { NetSettleModal } from "../components/NetSettleModal";
import { SettleModal } from "../components/SettleModal";
import { useBridge } from "../lib/store";
import {
  formatMap,
  localSuppliedBySeller,
  sellerPayable,
} from "../lib/selectors";
import { SUPPORTED_CURRENCIES } from "../lib/types";
import type {
  Seller,
  SettlementCadence,
  SettlementMethod,
} from "../lib/types";

const CADENCES: SettlementCadence[] = ["manual", "daily", "weekly", "monthly"];

export default function SellersPage() {
  const sellers = useBridge((s) => s.sellers);
  const transactions = useBridge((s) => s.transactions);
  const addSeller = useBridge((s) => s.addSeller);
  const updateSeller = useBridge((s) => s.updateSeller);
  const activeBranchId = useBridge((s) => s.activeBranchId);

  const [addOpen, setAddOpen] = useState(false);
  const [settleTarget, setSettleTarget] = useState<Seller | null>(null);
  const [netSettleTarget, setNetSettleTarget] = useState<Seller | null>(null);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sellers</h1>
          <p className="text-sm text-muted">
            Local-cash suppliers. Agent owes them. Settle their balance from the row.
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Add seller
        </button>
      </header>

      <Card>
        {sellers.length === 0 ? (
          <p className="text-sm text-muted">No sellers yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted">
              <tr className="border-b border-border">
                <th className="px-2 py-2 text-left font-medium">Name</th>
                <th className="px-2 py-2 text-left font-medium">Preferred ccy</th>
                <th className="px-2 py-2 text-left font-medium">Method</th>
                <th className="px-2 py-2 text-left font-medium">Cadence</th>
                <th className="px-2 py-2 text-right font-medium">Local supplied</th>
                <th className="px-2 py-2 text-right font-medium">Outstanding</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {sellers.map((w) => {
                const owed = sellerPayable(transactions, w.id);
                const supplied = localSuppliedBySeller(transactions, w.id);
                return (
                  <tr key={w.id} className="border-b border-border last:border-0">
                    <td className="px-2 py-3 font-medium">{w.name}</td>
                    <td className="px-2 py-3 text-muted">{w.preferredCurrency}</td>
                    <td className="px-2 py-3 text-muted">{w.preferredMethod ?? "—"}</td>
                    <td className="px-2 py-3">
                      <select
                        value={w.settlementCadence ?? "manual"}
                        onChange={(e) =>
                          updateSeller(w.id, {
                            settlementCadence: e.target.value as SettlementCadence,
                          })
                        }
                        className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                      >
                        {CADENCES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-3 text-right font-mono">{formatMap(supplied)}</td>
                    <td className="px-2 py-3 text-right font-mono">{formatMap(owed)}</td>
                    <td className="px-2 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setNetSettleTarget(w)}
                          className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-background"
                        >
                          Net…
                        </button>
                        <button
                          onClick={() => setSettleTarget(w)}
                          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-background"
                        >
                          Settle
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {addOpen && (
        <AddSellerModal
          onClose={() => setAddOpen(false)}
          onSubmit={(name, currency, method, cadence, costRate, costRateLocalCurrency) => {
            addSeller({
              name,
              branchId: activeBranchId,
              kind: "supplier",
              preferredCurrency: currency,
              preferredMethod: method,
              settlementCadence: cadence,
              costRate,
              costRateLocalCurrency,
            });
            setAddOpen(false);
          }}
        />
      )}

      {settleTarget && (
        <SettleModal
          party="seller"
          partyId={settleTarget.id}
          partyName={settleTarget.name}
          balance={sellerPayable(transactions, settleTarget.id)}
          onClose={() => setSettleTarget(null)}
        />
      )}

      {netSettleTarget && (
        <NetSettleModal
          party="seller"
          partyId={netSettleTarget.id}
          partyName={netSettleTarget.name}
          balance={sellerPayable(transactions, netSettleTarget.id)}
          onClose={() => setNetSettleTarget(null)}
        />
      )}
    </div>
  );
}

function AddSellerModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (
    name: string,
    currency: string,
    method: SettlementMethod | undefined,
    cadence: SettlementCadence,
    costRate: number,
    costRateLocalCurrency: string,
  ) => void;
}) {
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [method, setMethod] = useState<SettlementMethod | "">("");
  const [cadence, setCadence] = useState<SettlementCadence>("manual");
  const [costRate, setCostRate] = useState("");
  const [costRateLocalCurrency, setCostRateLocalCurrency] = useState("BIRR");
  const costRateNum = parseFloat(costRate);
  const canSubmit = name.trim() && costRateNum > 0;

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Add seller</h2>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit) return;
            onSubmit(
              name.trim(),
              currency,
              method || undefined,
              cadence,
              costRateNum,
              costRateLocalCurrency,
            );
          }}
        >
          <Field label="Name">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Preferred settlement currency">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Preferred method">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as SettlementMethod | "")}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">—</option>
              <option value="cash">Cash</option>
              <option value="usdt">USDT</option>
              <option value="bank">Bank</option>
            </select>
          </Field>
          <Field label="Settlement cadence">
            <select
              value={cadence}
              onChange={(e) => setCadence(e.target.value as SettlementCadence)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {CADENCES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <fieldset className="rounded-md border border-border p-3">
            <legend className="px-1 text-[10px] uppercase tracking-wider text-muted">
              Cost rate (required) — local currency per 1 unit of preferred ccy
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Local currency">
                <select
                  value={costRateLocalCurrency}
                  onChange={(e) => setCostRateLocalCurrency(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={`Rate (${costRateLocalCurrency} per 1 ${currency})`}>
                <input
                  type="number"
                  step="any"
                  value={costRate}
                  onChange={(e) => setCostRate(e.target.value)}
                  placeholder="110"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
                />
              </Field>
            </div>
          </fieldset>
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
              disabled={!canSubmit}
              className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              Add
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

