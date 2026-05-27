"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useEffect, useState } from "react";
import type {
  AuditEntry,
  Branch,
  BuyTx,
  Buyer,
  ID,
  Order,
  RateEntry,
  Rates,
  ReversalTx,
  Seller,
  SellTx,
  SettleNetLeg,
  SettleNetTx,
  SettleParty,
  SettleTx,
  SettlementMethod,
  TreasuryAccount,
  TreasuryDepositTx,
  Tx,
  Wholesaler,
} from "./types";
import { effectiveSellRate, ratePairKey } from "./types";

const ACTOR = "Owner (demo)";

const cuid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

const UAE: Branch = {
  id: "br_uae",
  name: "UAE Branch",
  country: "United Arab Emirates",
  city: "Dubai",
};

const ADDIS: Branch = {
  id: "br_addis",
  name: "Addis Ababa Office",
  country: "Ethiopia",
  city: "Addis Ababa",
};

const TREASURY_UAE: TreasuryAccount = {
  id: "tr_uae_aed",
  branchId: UAE.id,
  currency: "AED",
  name: "UAE float (AED)",
};

const AHMED: Seller = {
  id: "sl_ahmed",
  name: "Ahmed",
  branchId: ADDIS.id,
  kind: "supplier",
  preferredCurrency: "USD",
  preferredMethod: "usdt",
  costRate: 110,
  costRateLocalCurrency: "BIRR",
  settlementCadence: "manual",
};

const SEED_RATES: Rates = {
  [ratePairKey("GBP", "BIRR")]: {
    sourceCurrency: "GBP",
    destCurrency: "BIRR",
    rate: 142.5,
    midRate: 142.5,
    sellRate: 142.5,
    buyRate: 138.0,
    updatedAt: new Date().toISOString(),
  },
  [ratePairKey("USD", "BIRR")]: {
    sourceCurrency: "USD",
    destCurrency: "BIRR",
    rate: 112.0,
    midRate: 112.0,
    sellRate: 112.0,
    buyRate: 110.0,
    updatedAt: new Date().toISOString(),
  },
};

const BUYER_Y: Buyer = {
  id: "by_y",
  name: "James (UK)",
  country: "United Kingdom",
  preferredCurrency: "GBP",
  phone: "+44 7700 900111",
};

interface BridgeState {
  activeBranchId: ID;
  branches: Branch[];
  sellers: Seller[];
  buyers: Buyer[];
  treasuryAccounts: TreasuryAccount[];
  transactions: Tx[];
  orders: Order[];
  rates: Rates;
  audit: AuditEntry[];

  setActiveBranch: (id: ID) => void;

  addSeller: (input: Omit<Seller, "id">) => Seller;
  updateSeller: (id: ID, patch: Partial<Omit<Seller, "id">>) => void;
  addBuyer: (input: Omit<Buyer, "id">) => Buyer;
  updateBuyer: (id: ID, patch: Partial<Omit<Buyer, "id">>) => void;

  addBuy: (
    input: Omit<BuyTx, "id" | "kind" | "createdAt" | "source" | "status">,
  ) => BuyTx;
  addSell: (
    input: Omit<SellTx, "id" | "kind" | "createdAt" | "source" | "status">,
  ) => SellTx;
  addSettle: (
    input: Omit<SettleTx, "id" | "kind" | "createdAt" | "source" | "status">,
  ) => SettleTx;

  setRate: (
    sourceCurrency: string,
    destCurrency: string,
    rates: { sellRate: number; buyRate?: number; midRate?: number },
  ) => void;
  removeRate: (sourceCurrency: string, destCurrency: string) => void;

  simulateInboundOrder: () => Order;
  acceptOrder: (id: ID) => void;
  markOrderPaid: (
    id: ID,
    source: { sellerId: ID } | { treasuryAccountId: ID },
  ) => void;
  markOrderSettled: (id: ID, method?: SettlementMethod) => void;
  rejectOrder: (id: ID) => void;
  voidPaidOrder: (id: ID, reason?: string) => void;

  addTreasuryAccount: (input: Omit<TreasuryAccount, "id">) => TreasuryAccount;
  depositTreasury: (
    treasuryAccountId: ID,
    amount: number,
    note?: string,
  ) => TreasuryDepositTx;

  addSettleNet: (input: {
    partyType: SettleParty;
    partyId: ID;
    legs: SettleNetLeg[];
    fxRates?: Record<string, number>;
    method: SettlementMethod;
    note?: string;
  }) => SettleNetTx;

  runSprint1Demo: () => void;
  resetToSeed: () => void;
}

const seed = (): Pick<
  BridgeState,
  "branches" | "sellers" | "buyers" | "treasuryAccounts" | "transactions" | "orders" | "rates" | "audit"
> => ({
  branches: [UAE, ADDIS],
  sellers: [AHMED],
  buyers: [BUYER_Y],
  treasuryAccounts: [TREASURY_UAE],
  transactions: [],
  orders: [],
  rates: { ...SEED_RATES },
  audit: [
    {
      id: cuid(),
      ts: now(),
      actor: "System",
      action: "seed",
      entityType: "system",
      entityId: "init",
      detail:
        "Seeded UAE + Addis branches; UAE float (AED) treasury; Ahmed (Addis/BIRR) seller; James (UK buyer); GBP→BIRR + USD→BIRR rates",
    },
  ],
});

export const useBridge = create<BridgeState>()(
  persist(
    (set) => ({
      activeBranchId: UAE.id,
      ...seed(),

      setActiveBranch: (id) =>
        set((s) => {
          if (!s.branches.some((b) => b.id === id) || s.activeBranchId === id) return s;
          const next = s.branches.find((b) => b.id === id);
          return {
            activeBranchId: id,
            audit: [
              ...s.audit,
              {
                id: cuid(),
                ts: now(),
                actor: ACTOR,
                action: "switch-branch",
                entityType: "branch",
                entityId: id,
                detail: `Switched active branch to ${next?.name ?? id}`,
              },
            ],
          };
        }),

      addSeller: (input) => {
        const w: Seller = { id: "sl_" + cuid(), ...input };
        set((s) => ({
          sellers: [...s.sellers, w],
          audit: [
            ...s.audit,
            {
              id: cuid(),
              ts: now(),
              actor: ACTOR,
              action: "create",
              entityType: "seller",
              entityId: w.id,
              detail: `Added seller ${w.name}`,
            },
          ],
        }));
        return w;
      },

      updateSeller: (id, patch) =>
        set((s) => {
          const existing = s.sellers.find((w) => w.id === id);
          if (!existing) return s;
          return {
            sellers: s.sellers.map((w) => (w.id === id ? { ...w, ...patch } : w)),
            audit: [
              ...s.audit,
              {
                id: cuid(),
                ts: now(),
                actor: ACTOR,
                action: "update",
                entityType: "seller",
                entityId: id,
                detail: `Updated ${existing.name}: ${Object.keys(patch).join(", ")}`,
              },
            ],
          };
        }),

      addBuyer: (input) => {
        const b: Buyer = { id: "by_" + cuid(), ...input };
        set((s) => ({
          buyers: [...s.buyers, b],
          audit: [
            ...s.audit,
            {
              id: cuid(),
              ts: now(),
              actor: ACTOR,
              action: "create",
              entityType: "buyer",
              entityId: b.id,
              detail: `Added buyer ${b.name}`,
            },
          ],
        }));
        return b;
      },

      updateBuyer: (id, patch) =>
        set((s) => {
          const existing = s.buyers.find((b) => b.id === id);
          if (!existing) return s;
          return {
            buyers: s.buyers.map((b) => (b.id === id ? { ...b, ...patch } : b)),
            audit: [
              ...s.audit,
              {
                id: cuid(),
                ts: now(),
                actor: ACTOR,
                action: "update",
                entityType: "buyer",
                entityId: id,
                detail: `Updated ${existing.name}: ${Object.keys(patch).join(", ")}`,
              },
            ],
          };
        }),

      addBuy: (input) => {
        const tx: BuyTx = {
          id: "tx_" + cuid(),
          kind: "BUY",
          createdAt: now(),
          source: "web",
          status: "confirmed",
          ...input,
        };
        set((s) => ({
          transactions: [...s.transactions, tx],
          audit: [
            ...s.audit,
            {
              id: cuid(),
              ts: now(),
              actor: ACTOR,
              action: "confirm",
              entityType: "transaction",
              entityId: tx.id,
              detail: `BUY ${tx.localAmount} ${tx.localCurrency} @ ${tx.rate} → owes ${tx.settlementAmount} ${tx.settlementCurrency}`,
            },
          ],
        }));
        return tx;
      },

      addSell: (input) => {
        const tx: SellTx = {
          id: "tx_" + cuid(),
          kind: "SELL",
          createdAt: now(),
          source: "web",
          status: "confirmed",
          ...input,
        };
        set((s) => ({
          transactions: [...s.transactions, tx],
          audit: [
            ...s.audit,
            {
              id: cuid(),
              ts: now(),
              actor: ACTOR,
              action: "confirm",
              entityType: "transaction",
              entityId: tx.id,
              detail: `SELL ${tx.localAmount} ${tx.localCurrency} @ ${tx.rate} → buyer owes ${tx.buyerOwesAmount} ${tx.buyerCurrency}`,
            },
          ],
        }));
        return tx;
      },

      addSettle: (input) => {
        const tx: SettleTx = {
          id: "tx_" + cuid(),
          kind: "SETTLE",
          createdAt: now(),
          source: "web",
          status: "confirmed",
          ...input,
        };
        set((s) => ({
          transactions: [...s.transactions, tx],
          audit: [
            ...s.audit,
            {
              id: cuid(),
              ts: now(),
              actor: ACTOR,
              action: "confirm",
              entityType: "transaction",
              entityId: tx.id,
              detail: `SETTLE ${tx.partyType} ${tx.amount} ${tx.currency} ${tx.direction} by ${tx.method}`,
            },
          ],
        }));
        return tx;
      },

      setRate: (sourceCurrency, destCurrency, rates) => {
        const src = sourceCurrency.toUpperCase();
        const dst = destCurrency.toUpperCase();
        const key = ratePairKey(src, dst);
        const sellRate = rates.sellRate;
        const buyRate = rates.buyRate ?? sellRate;
        const midRate = rates.midRate ?? (sellRate + buyRate) / 2;
        set((s) => ({
          rates: {
            ...s.rates,
            [key]: {
              sourceCurrency: src,
              destCurrency: dst,
              rate: sellRate,
              sellRate,
              buyRate,
              midRate,
              updatedAt: now(),
            } as RateEntry,
          },
          audit: [
            ...s.audit,
            {
              id: cuid(),
              ts: now(),
              actor: ACTOR,
              action: "set-rate",
              entityType: "rate",
              entityId: key,
              detail: `Set ${src} → ${dst} rates: sell=${sellRate} buy=${buyRate} mid=${midRate}`,
            },
          ],
        }));
      },

      removeRate: (sourceCurrency, destCurrency) => {
        const key = ratePairKey(sourceCurrency, destCurrency);
        set((s) => {
          if (!s.rates[key]) return s;
          const next = { ...s.rates };
          delete next[key];
          return {
            rates: next,
            audit: [
              ...s.audit,
              {
                id: cuid(),
                ts: now(),
                actor: ACTOR,
                action: "remove-rate",
                entityType: "rate",
                entityId: key,
                detail: `Removed rate ${key}`,
              },
            ],
          };
        });
      },

      simulateInboundOrder: () => {
        const state = useBridge.getState();
        const samples: Array<{
          sourceCurrency: string;
          destCurrency: string;
          sourceAmount: number;
          recipientName: string;
          recipientPhone: string;
          recipientNote?: string;
        }> = [
          {
            sourceCurrency: "GBP",
            destCurrency: "BIRR",
            sourceAmount: 100,
            recipientName: "Solomon Bekele",
            recipientPhone: "+251 911 234 567",
            recipientNote: "School fees — Addis",
          },
          {
            sourceCurrency: "GBP",
            destCurrency: "BIRR",
            sourceAmount: 250,
            recipientName: "Mulu Tesfaye",
            recipientPhone: "+251 911 555 010",
            recipientNote: "Family support",
          },
          {
            sourceCurrency: "USD",
            destCurrency: "BIRR",
            sourceAmount: 150,
            recipientName: "Hanna Girma",
            recipientPhone: "+251 922 884 321",
          },
          {
            sourceCurrency: "GBP",
            destCurrency: "BIRR",
            sourceAmount: 80,
            recipientName: "Daniel Yohannes",
            recipientPhone: "+251 911 776 540",
            recipientNote: "Rent",
          },
        ];
        // Prefer a pair we actually have a rate for; fall back to GBP→BIRR @ 0 (banner will flag it).
        const available = samples.filter(
          (s) => state.rates[ratePairKey(s.sourceCurrency, s.destCurrency)],
        );
        const pool = available.length > 0 ? available : samples;
        const sample = pool[Math.floor(Math.random() * pool.length)];
        const rateEntry = state.rates[ratePairKey(sample.sourceCurrency, sample.destCurrency)];
        const rate = rateEntry ? effectiveSellRate(rateEntry) : 0;
        const destAmount = Math.round(sample.sourceAmount * rate);
        const order: Order = {
          id: "ord_" + cuid(),
          createdAt: now(),
          branchId: ADDIS.id,
          customerId: BUYER_Y.id,
          sourceCurrency: sample.sourceCurrency,
          sourceAmount: sample.sourceAmount,
          destCurrency: sample.destCurrency,
          destAmount,
          rate,
          recipientName: sample.recipientName,
          recipientPhone: sample.recipientPhone,
          recipientNote: sample.recipientNote,
          sanctionsStatus: "unchecked",
          status: "incoming",
          source: "whatsapp",
          originalMessage: `Send ${sample.sourceAmount} ${sample.sourceCurrency} to ${sample.recipientName} (${sample.recipientPhone}) — quote ${destAmount} ${sample.destCurrency} @ ${rate}`,
        };
        set((s) => ({
          orders: [...s.orders, order],
          audit: [
            ...s.audit,
            {
              id: cuid(),
              ts: now(),
              actor: "WhatsApp",
              action: "inbound",
              entityType: "order",
              entityId: order.id,
              detail: `Inbound order: ${order.originalMessage ?? ""}`,
            },
          ],
        }));
        return order;
      },

      acceptOrder: (id) =>
        set((s) => {
          const o = s.orders.find((x) => x.id === id);
          if (!o || o.status !== "incoming") return s;
          // Snapshot the live sell rate at the moment of accept so subsequent
          // rate moves don't quietly inflate or deflate our P&L view.
          const rateEntry = s.rates[ratePairKey(o.sourceCurrency, o.destCurrency)];
          const sellRateAtAccept = rateEntry ? effectiveSellRate(rateEntry) : o.rate;
          return {
            orders: s.orders.map((x) =>
              x.id === id
                ? { ...x, status: "accepted", acceptedAt: now(), sellRateAtAccept }
                : x,
            ),
            audit: [
              ...s.audit,
              {
                id: cuid(),
                ts: now(),
                actor: ACTOR,
                action: "accept",
                entityType: "order",
                entityId: id,
                detail: `Accepted order: ${o.sourceAmount} ${o.sourceCurrency} → ${o.recipientName} @ ${sellRateAtAccept}`,
              },
            ],
          };
        }),

      markOrderPaid: (id, source) =>
        set((s) => {
          const o = s.orders.find((x) => x.id === id);
          if (!o || o.status !== "accepted") return s;

          const sellTx: SellTx = {
            id: "tx_" + cuid(),
            kind: "SELL",
            createdAt: now(),
            source: o.source,
            status: "confirmed",
            branchId: o.branchId,
            buyerId: o.customerId,
            recipientName: o.recipientName,
            localAmount: o.destAmount,
            localCurrency: o.destCurrency,
            rate: o.sellRateAtAccept ?? o.rate,
            buyerOwesAmount: o.sourceAmount,
            buyerCurrency: o.sourceCurrency,
            paymentStatus: "unpaid",
          };

          // Treasury disbursement: own float, no payable.
          if ("treasuryAccountId" in source) {
            const tr = s.treasuryAccounts.find((t) => t.id === source.treasuryAccountId);
            if (!tr) return s;
            if (tr.currency !== o.destCurrency) {
              // Recipient is paid in destCurrency; treasury must hold that currency.
              return {
                ...s,
                audit: [
                  ...s.audit,
                  {
                    id: cuid(),
                    ts: now(),
                    actor: "System",
                    action: "reject-pay",
                    entityType: "order",
                    entityId: id,
                    detail: `Refused to pay from ${tr.name}: holds ${tr.currency}, order needs ${o.destCurrency}.`,
                  },
                ],
              };
            }
            return {
              orders: s.orders.map((x) =>
                x.id === id
                  ? {
                      ...x,
                      status: "paid",
                      paidAt: now(),
                      treasuryAccountId: tr.id,
                      paidSellTxId: sellTx.id,
                    }
                  : x,
              ),
              transactions: [...s.transactions, sellTx],
              audit: [
                ...s.audit,
                {
                  id: cuid(),
                  ts: now(),
                  actor: ACTOR,
                  action: "mark-paid",
                  entityType: "order",
                  entityId: id,
                  detail: `Disbursed ${o.destAmount} ${o.destCurrency} from ${tr.name}. Customer owes ${o.sourceAmount} ${o.sourceCurrency}. No counterparty payable.`,
                },
              ],
            };
          }

          // Seller disbursement: must have a costRate. We refuse the
          // fallback path the previous version had because it labeled cost
          // in the wrong currency. Better to make the operator set costRate
          // on the seller than to silently book payables in the wrong unit.
          const seller = s.sellers.find((sl) => sl.id === source.sellerId);
          if (!seller) return s;
          if (!seller.costRate || seller.costRate <= 0) {
            return {
              ...s,
              audit: [
                ...s.audit,
                {
                  id: cuid(),
                  ts: now(),
                  actor: "System",
                  action: "reject-pay",
                  entityType: "order",
                  entityId: id,
                  detail: `Refused to mark paid via ${seller.name}: no costRate set. Configure their costRate (${seller.preferredCurrency} per 1 ${o.destCurrency}) before disbursing.`,
                },
              ],
            };
          }

          // costRate semantics: dest-currency units per 1 unit of seller.preferredCurrency.
          // e.g. Ahmed at 110 = 110 BIRR per 1 USD.
          // settlementAmount = destAmount / costRate, in seller.preferredCurrency.
          const costRateAtPaid = seller.costRate;
          const costCurrencyAtPaid = seller.preferredCurrency;
          const settlementAmount = Math.round((o.destAmount / costRateAtPaid) * 100) / 100;

          const buyTx: BuyTx = {
            id: "tx_" + cuid(),
            kind: "BUY",
            createdAt: now(),
            source: o.source,
            status: "confirmed",
            branchId: o.branchId,
            sellerId: seller.id,
            localAmount: o.destAmount,
            localCurrency: o.destCurrency,
            rate: costRateAtPaid,
            settlementAmount,
            settlementCurrency: seller.preferredCurrency,
            settlementMethod: seller.preferredMethod,
            settlementStatus: "unpaid",
          };

          return {
            orders: s.orders.map((x) =>
              x.id === id
                ? {
                    ...x,
                    status: "paid",
                    paidAt: now(),
                    sellerId: seller.id,
                    costRateAtPaid,
                    costCurrencyAtPaid,
                    paidSellTxId: sellTx.id,
                    paidBuyTxId: buyTx.id,
                  }
                : x,
            ),
            transactions: [...s.transactions, sellTx, buyTx],
            audit: [
              ...s.audit,
              {
                id: cuid(),
                ts: now(),
                actor: ACTOR,
                action: "mark-paid",
                entityType: "order",
                entityId: id,
                detail: `${seller.name} paid ${o.destAmount} ${o.destCurrency} to ${o.recipientName}. Customer owes ${o.sourceAmount} ${o.sourceCurrency}. Agent owes ${seller.name} ${settlementAmount.toFixed(2)} ${seller.preferredCurrency}.`,
              },
            ],
          };
        }),

      markOrderSettled: (id, method = "bank") =>
        set((s) => {
          const o = s.orders.find((x) => x.id === id);
          if (!o || o.status !== "paid") return s;

          // Customer pays the agent. Record a SettleTx (direction=received)
          // which the receivable selector will offset against the SellTx.
          const settleTx: SettleTx = {
            id: "tx_" + cuid(),
            kind: "SETTLE",
            createdAt: now(),
            source: "web",
            status: "confirmed",
            branchId: o.branchId,
            partyType: "buyer",
            partyId: o.customerId,
            amount: o.sourceAmount,
            currency: o.sourceCurrency,
            method,
            direction: "received",
          };

          return {
            orders: s.orders.map((x) =>
              x.id === id
                ? {
                    ...x,
                    status: "settled",
                    settledAt: now(),
                    settledSettleTxId: settleTx.id,
                  }
                : x,
            ),
            transactions: [...s.transactions, settleTx],
            audit: [
              ...s.audit,
              {
                id: cuid(),
                ts: now(),
                actor: ACTOR,
                action: "settle",
                entityType: "order",
                entityId: id,
                detail: `Customer ${o.customerId} settled ${o.sourceAmount} ${o.sourceCurrency} for order to ${o.recipientName} via ${method}.`,
              },
            ],
          };
        }),

      voidPaidOrder: (id, reason) =>
        set((s) => {
          const o = s.orders.find((x) => x.id === id);
          if (!o || (o.status !== "paid" && o.status !== "settled")) return s;
          const targetIds = [o.paidSellTxId, o.paidBuyTxId, o.settledSettleTxId]
            .filter((x): x is ID => typeof x === "string");
          if (targetIds.length === 0) return s;
          const reversal: ReversalTx = {
            id: "tx_" + cuid(),
            kind: "REVERSAL",
            createdAt: now(),
            source: "web",
            status: "confirmed",
            branchId: o.branchId,
            targetTxIds: targetIds,
            reason,
          };
          return {
            // Cancel the original Txs in place so selectors (which filter to
            // confirmed) drop them. The ReversalTx itself stays as the
            // explicit audit trail for the void.
            transactions: [
              ...s.transactions.map((t) =>
                targetIds.includes(t.id) ? { ...t, status: "cancelled" } : t,
              ) as Tx[],
              reversal,
            ],
            orders: s.orders.map((x) =>
              x.id === id
                ? { ...x, status: "cancelled", cancelledAt: now() }
                : x,
            ),
            audit: [
              ...s.audit,
              {
                id: cuid(),
                ts: now(),
                actor: ACTOR,
                action: "void",
                entityType: "order",
                entityId: id,
                detail: `Voided ${o.status} order. Reversed ${targetIds.length} ledger entr${targetIds.length === 1 ? "y" : "ies"}.${reason ? ` Reason: ${reason}` : ""}`,
              },
            ],
          };
        }),

      addTreasuryAccount: (input) => {
        const acct: TreasuryAccount = { id: "tr_" + cuid(), ...input };
        set((s) => ({
          treasuryAccounts: [...s.treasuryAccounts, acct],
          audit: [
            ...s.audit,
            {
              id: cuid(),
              ts: now(),
              actor: ACTOR,
              action: "create",
              entityType: "treasury",
              entityId: acct.id,
              detail: `Added treasury account ${acct.name} (${acct.currency})`,
            },
          ],
        }));
        return acct;
      },

      depositTreasury: (treasuryAccountId, amount, note) => {
        const state = useBridge.getState();
        const acct = state.treasuryAccounts.find((t) => t.id === treasuryAccountId);
        if (!acct || amount <= 0) {
          throw new Error("Invalid treasury deposit");
        }
        const tx: TreasuryDepositTx = {
          id: "tx_" + cuid(),
          kind: "TREASURY_DEPOSIT",
          createdAt: now(),
          source: "web",
          status: "confirmed",
          branchId: acct.branchId,
          treasuryAccountId,
          currency: acct.currency,
          amount,
          note,
        };
        set((s) => ({
          transactions: [...s.transactions, tx],
          audit: [
            ...s.audit,
            {
              id: cuid(),
              ts: now(),
              actor: ACTOR,
              action: "deposit",
              entityType: "treasury",
              entityId: treasuryAccountId,
              detail: `Deposited ${amount} ${acct.currency} into ${acct.name}.${note ? ` ${note}` : ""}`,
            },
          ],
        }));
        return tx;
      },

      addSettleNet: (input) => {
        const tx: SettleNetTx = {
          id: "tx_" + cuid(),
          kind: "SETTLE_NET",
          createdAt: now(),
          source: "web",
          status: "confirmed",
          branchId: useBridge.getState().activeBranchId,
          partyType: input.partyType,
          partyId: input.partyId,
          legs: input.legs,
          fxRates: input.fxRates,
          method: input.method,
          note: input.note,
        };
        set((s) => ({
          transactions: [...s.transactions, tx],
          audit: [
            ...s.audit,
            {
              id: cuid(),
              ts: now(),
              actor: ACTOR,
              action: "settle-net",
              entityType: "transaction",
              entityId: tx.id,
              detail: `Net settlement with ${input.partyType} ${input.partyId}: ${input.legs
                .map((l) => `${l.direction === "paid" ? "−" : "+"}${l.amount} ${l.currency}`)
                .join(" / ")}${input.note ? ` (${input.note})` : ""}`,
            },
          ],
        }));
        return tx;
      },

      rejectOrder: (id) =>
        set((s) => {
          const o = s.orders.find((x) => x.id === id);
          if (!o || (o.status !== "incoming" && o.status !== "accepted")) return s;
          return {
            orders: s.orders.map((x) =>
              x.id === id ? { ...x, status: "cancelled", cancelledAt: now() } : x,
            ),
            audit: [
              ...s.audit,
              {
                id: cuid(),
                ts: now(),
                actor: ACTOR,
                action: "reject",
                entityType: "order",
                entityId: id,
                detail: `Rejected order from ${o.recipientName}`,
              },
            ],
          };
        }),

      runSprint1Demo: () =>
        set((s) => {
          const buy: BuyTx = {
            id: "tx_" + cuid(),
            kind: "BUY",
            createdAt: now(),
            source: "web",
            status: "confirmed",
            branchId: ADDIS.id,
            sellerId: AHMED.id,
            localAmount: 1000,
            localCurrency: "BIRR",
            rate: 100,
            settlementAmount: 10,
            settlementCurrency: "USD",
            settlementStatus: "unpaid",
          };
          const sell: SellTx = {
            id: "tx_" + cuid(),
            kind: "SELL",
            createdAt: now(),
            source: "web",
            status: "confirmed",
            branchId: ADDIS.id,
            buyerId: BUYER_Y.id,
            recipientName: "RecipientX",
            localAmount: 1000,
            localCurrency: "BIRR",
            rate: 83.33,
            buyerOwesAmount: 12,
            buyerCurrency: "USD",
            paymentStatus: "unpaid",
          };
          return {
            transactions: [...s.transactions, buy, sell],
            audit: [
              ...s.audit,
              {
                id: cuid(),
                ts: now(),
                actor: ACTOR,
                action: "demo",
                entityType: "system",
                entityId: "sprint1",
                detail:
                  "Seeded Sprint 1 demo: BUY 1000 BIRR @10 USD (Ahmed) + SELL 1000 BIRR @12 USD (BuyerY → RecipientX). Expected spread 2 USD.",
              },
            ],
          };
        }),

      resetToSeed: () =>
        set((s) => ({
          activeBranchId: UAE.id,
          branches: [UAE, ADDIS],
          sellers: [AHMED],
          buyers: [BUYER_Y],
          treasuryAccounts: [TREASURY_UAE],
          transactions: [],
          orders: [],
          rates: { ...SEED_RATES },
          audit: [
            ...s.audit,
            {
              id: cuid(),
              ts: now(),
              actor: ACTOR,
              action: "reset",
              entityType: "system",
              entityId: "reset",
              detail: "Reset to seed (transactions and orders cleared; UAE + Addis branches; Self + Ahmed sellers; James buyer)",
            },
          ],
        })),
    }),
    {
      name: "bridge-ledger",
      version: 7,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        activeBranchId: state.activeBranchId,
        branches: state.branches,
        sellers: state.sellers,
        buyers: state.buyers,
        treasuryAccounts: state.treasuryAccounts,
        transactions: state.transactions,
        orders: state.orders,
        rates: state.rates,
        audit: state.audit,
      }),
      migrate: (persisted, version) => {
        const p = persisted as (Partial<BridgeState> & { wholesalers?: Seller[] }) | undefined;
        if (!p) return p as unknown as BridgeState;
        if (version < 2 && Array.isArray(p.transactions)) {
          p.transactions = p.transactions.map((t) => ({
            ...t,
            status: (t as Partial<Tx>).status ?? "confirmed",
          })) as Tx[];
        }
        if (version < 3 && !Array.isArray(p.orders)) {
          p.orders = [];
        }
        if (version < 4) {
          // Rename wholesalers → sellers, partyType wholesaler → seller, wholesalerId → sellerId
          if (Array.isArray(p.wholesalers) && !Array.isArray(p.sellers)) {
            p.sellers = p.wholesalers;
          }
          delete p.wholesalers;
          if (Array.isArray(p.transactions)) {
            p.transactions = p.transactions.map((t) => {
              const raw = t as unknown as Record<string, unknown>;
              if (raw.kind === "BUY" && raw.wholesalerId && !raw.sellerId) {
                raw.sellerId = raw.wholesalerId;
                delete raw.wholesalerId;
              }
              if (raw.kind === "SETTLE" && raw.partyType === "wholesaler") {
                raw.partyType = "seller";
              }
              return raw as unknown as Tx;
            });
          }
          if (!p.rates || typeof p.rates !== "object") {
            p.rates = {};
          }
        }
        if (version < 5) {
          // Add UAE branch + SELF seller if missing; promote UAE to active.
          if (!Array.isArray(p.branches)) p.branches = [];
          if (!p.branches.some((b) => b.id === UAE.id)) {
            p.branches = [UAE, ...p.branches];
          }
          if (!Array.isArray(p.sellers)) p.sellers = [];
          // The v5 step originally added a Self-seller named "sl_self_uae". We
          // keep that inline so old persisted state still reaches the v7 step,
          // which moves it into treasuryAccounts.
          if (!p.sellers.some((sl) => sl.id === "sl_self_uae")) {
            p.sellers = [
              {
                id: "sl_self_uae",
                name: "Self (UAE)",
                branchId: UAE.id,
                preferredCurrency: "AED",
                preferredMethod: "cash",
                settlementCadence: "manual",
              } as Seller,
              ...p.sellers,
            ];
          }
          p.activeBranchId = UAE.id;
        }
        if (version < 6) {
          // Tag every Seller with a kind (self vs supplier).
          if (Array.isArray(p.sellers)) {
            p.sellers = p.sellers.map((sl) => {
              const raw = sl as unknown as Record<string, unknown>;
              if (!raw.kind) {
                raw.kind = raw.id === "sl_self_uae" ? "self" : "supplier";
              }
              return raw as unknown as Seller;
            });
          }
          // Expand each RateEntry to carry sell/buy/mid. The legacy `rate` field
          // gets mirrored into sellRate, buyRate defaults a few % below sell.
          if (p.rates && typeof p.rates === "object") {
            for (const key of Object.keys(p.rates)) {
              const raw = p.rates[key] as unknown as Record<string, unknown>;
              const base = typeof raw.rate === "number" ? raw.rate : 0;
              if (raw.sellRate === undefined) raw.sellRate = base;
              if (raw.midRate === undefined) raw.midRate = base;
              if (raw.buyRate === undefined) raw.buyRate = base ? base * 0.97 : 0;
            }
          }
          // AML stubs default to unchecked on existing orders.
          if (Array.isArray(p.orders)) {
            p.orders = p.orders.map((o) => {
              const raw = o as unknown as Record<string, unknown>;
              if (!raw.sanctionsStatus) raw.sanctionsStatus = "unchecked";
              return raw as unknown as Order;
            });
          }
        }
        if (version < 7) {
          // Move every Seller with kind="self" into treasuryAccounts.
          if (!Array.isArray(p.treasuryAccounts)) p.treasuryAccounts = [];
          const sellers = Array.isArray(p.sellers) ? p.sellers : [];
          const selfSellers = sellers.filter((sl) => sl.kind === "self");
          const remaining = sellers.filter((sl) => sl.kind !== "self");
          for (const ss of selfSellers) {
            // Reuse stable id if it matches the seed account; otherwise mint.
            const trId =
              ss.id === "sl_self_uae" ? TREASURY_UAE.id : "tr_" + ss.id.slice(3);
            if (!p.treasuryAccounts.some((t) => t.id === trId)) {
              p.treasuryAccounts.push({
                id: trId,
                branchId: ss.branchId,
                currency: ss.preferredCurrency,
                name: ss.name,
              });
            }
          }
          p.sellers = remaining;
          if (!p.treasuryAccounts.some((t) => t.id === TREASURY_UAE.id)) {
            p.treasuryAccounts.unshift(TREASURY_UAE);
          }
        }
        return p as BridgeState;
      },
    },
  ),
);

export function useHasHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsub = useBridge.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useBridge.persist.hasHydrated());
    return unsub;
  }, []);
  return hydrated;
}
