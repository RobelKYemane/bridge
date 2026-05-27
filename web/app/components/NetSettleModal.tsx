"use client";

import { useMemo, useState } from "react";
import type {
  SettleDirection,
  SettleNetLeg,
  SettleParty,
  SettlementMethod,
} from "../lib/types";
import { SUPPORTED_CURRENCIES } from "../lib/types";
import { useBridge } from "../lib/store";
import { fmtMoney } from "../lib/selectors";

/**
 * Net settlement across one or more currencies with a single counterparty.
 * Example: agent owes Ahmed 5,000 USDT; Ahmed owes agent 18,400 AED.
 * Net at today's rate: agent receives 12 AED back from Ahmed. Two legs
 * with directions, one fxRate snapshot.
 */
export function NetSettleModal({
  party,
  partyId,
  partyName,
  balance,
  onClose,
}: {
  party: SettleParty;
  partyId: string;
  partyName: string;
  balance: Record<string, number>;
  onClose: () => void;
}) {
  const addSettleNet = useBridge((s) => s.addSettleNet);

  // Pre-seed one leg per outstanding currency with the right direction.
  const seedLegs: SettleNetLeg[] = useMemo(
    () =>
      Object.entries(balance)
        .filter(([, v]) => Math.abs(v) > 0.005)
        .map(([currency, amount]) => ({
          currency,
          amount: Math.abs(Math.round(amount * 100) / 100),
          direction:
            party === "seller"
              ? amount > 0
                ? "paid"
                : "received"
              : amount > 0
                ? "received"
                : "paid",
        })),
    [balance, party],
  );

  const [legs, setLegs] = useState<SettleNetLeg[]>(
    seedLegs.length > 0
      ? seedLegs
      : [{ currency: SUPPORTED_CURRENCIES[0], amount: 0, direction: "paid" }],
  );
  const [method, setMethod] = useState<SettlementMethod>("usdt");
  const [note, setNote] = useState("");

  // Optional fxRates: between each unique pair of currencies in the legs.
  const currencyPairs = useMemo(() => {
    const seen = new Set<string>();
    for (let i = 0; i < legs.length; i++) {
      for (let j = i + 1; j < legs.length; j++) {
        if (legs[i].currency !== legs[j].currency) {
          const a = legs[i].currency;
          const b = legs[j].currency;
          const key = a < b ? `${a}->${b}` : `${b}->${a}`;
          seen.add(key);
        }
      }
    }
    return Array.from(seen);
  }, [legs]);

  const [fxRates, setFxRates] = useState<Record<string, string>>({});

  const updateLeg = (i: number, patch: Partial<SettleNetLeg>) =>
    setLegs((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const removeLeg = (i: number) => setLegs((prev) => prev.filter((_, idx) => idx !== i));
  const addLeg = () =>
    setLegs((prev) => [
      ...prev,
      { currency: SUPPORTED_CURRENCIES[0], amount: 0, direction: "paid" },
    ]);

  const [acceptResidual, setAcceptResidual] = useState(false);
  const allLegsValid = legs.length > 0 && legs.every((l) => l.amount > 0);

  // Build a preview of the post-settle balance per currency.
  const remaining = useMemo(() => {
    const next: Record<string, number> = { ...balance };
    for (const leg of legs) {
      // For sellers: payable was positive = "they're owed" → "paid" leg reduces it.
      // For buyers: receivable was positive = "they owe us" → "received" leg reduces it.
      const sign = party === "seller"
        ? leg.direction === "paid" ? -1 : 1
        : leg.direction === "received" ? -1 : 1;
      next[leg.currency] = (next[leg.currency] ?? 0) + sign * leg.amount;
    }
    return next;
  }, [balance, legs, party]);

  const residualMagnitudes = Object.values(remaining).map((v) => Math.abs(v));
  const totalResidual = residualMagnitudes.reduce((a, b) => a + b, 0);
  const netsToZero = residualMagnitudes.every((v) => v < 0.005);
  // If the operator supplied fxRates we treat this as a true net rec — refuse
  // to submit unless the legs actually reconcile (or they explicitly accept
  // the residual via the checkbox below).
  const fxProvided = Object.values(fxRates).some((v) => parseFloat(v) > 0);
  const valid =
    allLegsValid && (netsToZero || acceptResidual || !fxProvided);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-xl rounded-lg border border-border bg-card p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Net settle with {partyName}</h2>
        <p className="mt-1 text-xs text-muted">
          One transaction that nets multiple currencies in one go. Use this when {party === "seller"
            ? "you and your wholesaler"
            : "you and your customer"}{" "}
          agree to clear a mixed-currency balance at today's rate.
        </p>

        {Object.keys(balance).length > 0 && (
          <div className="mt-3 rounded-md border border-border bg-background p-3 text-xs">
            <div className="mb-1 uppercase tracking-wider text-muted">Outstanding</div>
            <ul className="space-y-0.5">
              {Object.entries(balance)
                .filter(([, v]) => Math.abs(v) > 0.005)
                .map(([ccy, amt]) => (
                  <li key={ccy} className="flex justify-between font-mono">
                    <span>{ccy}</span>
                    <span className={amt > 0 ? "text-amber-700" : "text-emerald-700"}>
                      {amt > 0 ? "owes you " : "you owe "}
                      {fmtMoney(Math.abs(amt), ccy)}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        )}

        <div className="mt-4 space-y-2">
          <div className="text-xs font-medium uppercase tracking-wider text-muted">Legs</div>
          {legs.map((leg, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={leg.currency}
                onChange={(e) => updateLeg(i, { currency: e.target.value })}
                className="rounded-md border border-border bg-background px-2 py-1.5 font-mono text-sm"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="any"
                value={leg.amount}
                onChange={(e) => updateLeg(i, { amount: parseFloat(e.target.value) || 0 })}
                className="w-28 rounded-md border border-border bg-background px-2 py-1.5 font-mono text-sm"
              />
              <select
                value={leg.direction}
                onChange={(e) => updateLeg(i, { direction: e.target.value as SettleDirection })}
                className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              >
                <option value="paid">Agent pays</option>
                <option value="received">Agent receives</option>
              </select>
              <button
                onClick={() => removeLeg(i)}
                className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:bg-background"
                disabled={legs.length === 1}
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={addLeg}
            className="rounded-md border border-dashed border-border px-2 py-1 text-xs text-muted hover:bg-background"
          >
            + Add leg
          </button>
        </div>

        {currencyPairs.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="text-xs font-medium uppercase tracking-wider text-muted">
              FX rates (snapshot for the net)
            </div>
            {currencyPairs.map((pair) => (
              <div key={pair} className="flex items-center gap-2 text-sm">
                <span className="w-32 font-mono">{pair}</span>
                <input
                  type="number"
                  step="any"
                  placeholder="rate"
                  value={fxRates[pair] ?? ""}
                  onChange={(e) =>
                    setFxRates((prev) => ({ ...prev, [pair]: e.target.value }))
                  }
                  className="w-32 rounded-md border border-border bg-background px-2 py-1.5 font-mono text-sm"
                />
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted">
              Method
            </span>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as SettlementMethod)}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            >
              <option value="cash">Cash</option>
              <option value="usdt">USDT</option>
              <option value="bank">Bank</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted">
              Note (optional)
            </span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="weekly rec, etc."
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            />
          </label>
        </div>

        <div className="mt-4 rounded-md border border-border bg-background p-3 text-xs">
          <div className="uppercase tracking-wider text-muted">Post-settle balance</div>
          <ul className="mt-1 space-y-0.5">
            {Object.entries(remaining)
              .filter(([, v]) => Math.abs(v) > 0.005)
              .map(([ccy, v]) => (
                <li key={ccy} className="flex justify-between font-mono">
                  <span>{ccy}</span>
                  <span>{fmtMoney(v, ccy)}</span>
                </li>
              ))}
            {netsToZero && (
              <li className="text-emerald-700">All balances net to zero.</li>
            )}
          </ul>
          {!netsToZero && fxProvided && (
            <label className="mt-3 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-900">
              <input
                type="checkbox"
                checked={acceptResidual}
                onChange={(e) => setAcceptResidual(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Residual <span className="font-mono">{totalResidual.toFixed(2)}</span> doesn&apos;t fully net.
                Tick to record anyway — leftover stays on the counterparty&apos;s books.
              </span>
            </label>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-background"
          >
            Cancel
          </button>
          <button
            disabled={!valid}
            onClick={() => {
              const parsedFx: Record<string, number> = {};
              for (const [key, v] of Object.entries(fxRates)) {
                const n = parseFloat(v);
                if (Number.isFinite(n) && n > 0) parsedFx[key] = n;
              }
              addSettleNet({
                partyType: party,
                partyId,
                legs,
                fxRates: Object.keys(parsedFx).length > 0 ? parsedFx : undefined,
                method,
                note: note || undefined,
              });
              onClose();
            }}
            className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            Record net settlement
          </button>
        </div>
      </div>
    </div>
  );
}
