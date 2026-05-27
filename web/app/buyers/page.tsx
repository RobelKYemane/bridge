"use client";

import { useState } from "react";
import { Card } from "../components/Card";
import { NetSettleModal } from "../components/NetSettleModal";
import { SettleModal } from "../components/SettleModal";
import { useBridge } from "../lib/store";
import { buyerReceivable, formatMap } from "../lib/selectors";
import { SUPPORTED_CURRENCIES } from "../lib/types";
import type { Buyer, SettlementCadence } from "../lib/types";

const CADENCES: SettlementCadence[] = ["manual", "daily", "weekly", "monthly"];

export default function BuyersPage() {
  const buyers = useBridge((s) => s.buyers);
  const transactions = useBridge((s) => s.transactions);
  const addBuyer = useBridge((s) => s.addBuyer);
  const updateBuyer = useBridge((s) => s.updateBuyer);

  const [addOpen, setAddOpen] = useState(false);
  const [settleTarget, setSettleTarget] = useState<Buyer | null>(null);
  const [netSettleTarget, setNetSettleTarget] = useState<Buyer | null>(null);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Buyers</h1>
          <p className="text-sm text-muted">
            Customers who send money. Settle their balance from the row.
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Add buyer
        </button>
      </header>

      <Card>
        {buyers.length === 0 ? (
          <p className="text-sm text-muted">No buyers yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted">
              <tr className="border-b border-border">
                <th className="px-2 py-2 text-left font-medium">Name</th>
                <th className="px-2 py-2 text-left font-medium">Country</th>
                <th className="px-2 py-2 text-left font-medium">Currency</th>
                <th className="px-2 py-2 text-left font-medium">Phone</th>
                <th className="px-2 py-2 text-left font-medium">Cadence</th>
                <th className="px-2 py-2 text-right font-medium">Outstanding</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {buyers.map((b) => {
                const owed = buyerReceivable(transactions, b.id);
                return (
                  <tr key={b.id} className="border-b border-border last:border-0">
                    <td className="px-2 py-3 font-medium">{b.name}</td>
                    <td className="px-2 py-3 text-muted">{b.country ?? "—"}</td>
                    <td className="px-2 py-3 text-muted">{b.preferredCurrency}</td>
                    <td className="px-2 py-3 text-muted font-mono text-xs">{b.phone ?? "—"}</td>
                    <td className="px-2 py-3">
                      <select
                        value={b.settlementCadence ?? "manual"}
                        onChange={(e) =>
                          updateBuyer(b.id, {
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
                    <td className="px-2 py-3 text-right font-mono">{formatMap(owed)}</td>
                    <td className="px-2 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setNetSettleTarget(b)}
                          className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-background"
                        >
                          Net…
                        </button>
                        <button
                          onClick={() => setSettleTarget(b)}
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
        <AddBuyerModal
          onClose={() => setAddOpen(false)}
          onSubmit={(name, country, currency, phone, cadence, idType, idRef) => {
            addBuyer({
              name,
              country: country || undefined,
              preferredCurrency: currency,
              phone: phone || undefined,
              settlementCadence: cadence,
              idType: idType || undefined,
              idRef: idRef || undefined,
              sanctionsStatus: "unchecked",
            });
            setAddOpen(false);
          }}
        />
      )}

      {settleTarget && (
        <SettleModal
          party="buyer"
          partyId={settleTarget.id}
          partyName={settleTarget.name}
          balance={buyerReceivable(transactions, settleTarget.id)}
          onClose={() => setSettleTarget(null)}
        />
      )}

      {netSettleTarget && (
        <NetSettleModal
          party="buyer"
          partyId={netSettleTarget.id}
          partyName={netSettleTarget.name}
          balance={buyerReceivable(transactions, netSettleTarget.id)}
          onClose={() => setNetSettleTarget(null)}
        />
      )}
    </div>
  );
}

function AddBuyerModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (
    name: string,
    country: string,
    currency: string,
    phone: string,
    cadence: SettlementCadence,
    idType: string,
    idRef: string,
  ) => void;
}) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [phone, setPhone] = useState("");
  const [cadence, setCadence] = useState<SettlementCadence>("manual");
  const [idType, setIdType] = useState("");
  const [idRef, setIdRef] = useState("");

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Add buyer</h2>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            onSubmit(
              name.trim(),
              country.trim(),
              currency,
              phone.trim(),
              cadence,
              idType.trim(),
              idRef.trim(),
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
          <Field label="Country">
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. United Kingdom"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Preferred currency">
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
          <Field label="Phone (optional)">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+44 7700 900000"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
            />
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
          <fieldset className="rounded-md border border-dashed border-border p-3">
            <legend className="px-1 text-[10px] uppercase tracking-wider text-muted">
              AML (optional — recommended for pilot)
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ID type">
                <input
                  value={idType}
                  onChange={(e) => setIdType(e.target.value)}
                  placeholder="passport / EID"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </Field>
              <Field label="ID ref">
                <input
                  value={idRef}
                  onChange={(e) => setIdRef(e.target.value)}
                  placeholder="last 4 / number"
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
              className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90"
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
