import type {
  BuyTx,
  ID,
  Order,
  OrderStatus,
  Seller,
  SellTx,
  SettleNetTx,
  SettleTx,
  TreasuryDepositTx,
  Tx,
} from "./types";

export const isBuy = (t: Tx): t is BuyTx => t.kind === "BUY";
export const isSell = (t: Tx): t is SellTx => t.kind === "SELL";
export const isSettle = (t: Tx): t is SettleTx => t.kind === "SETTLE";
export const isSettleNet = (t: Tx): t is SettleNetTx => t.kind === "SETTLE_NET";
export const isTreasuryDeposit = (t: Tx): t is TreasuryDepositTx =>
  t.kind === "TREASURY_DEPOSIT";
export const isConfirmed = (t: Tx) => t.status === "confirmed";
export const isPending = (t: Tx) => t.status === "pending";

export function ledger(txs: Tx[]): Tx[] {
  return txs.filter(isConfirmed);
}

export function pendingOrders(txs: Tx[]): Tx[] {
  return txs.filter(isPending);
}

export function ordersByStatus(orders: Order[], status: OrderStatus): Order[] {
  return orders.filter((o) => o.status === status);
}

export function incomingOrders(orders: Order[]): Order[] {
  return ordersByStatus(orders, "incoming");
}

export function orderPipelineCounts(orders: Order[]) {
  return {
    incoming: ordersByStatus(orders, "incoming").length,
    accepted: ordersByStatus(orders, "accepted").length,
    paid: ordersByStatus(orders, "paid").length,
    settled: ordersByStatus(orders, "settled").length,
    cancelled: ordersByStatus(orders, "cancelled").length,
  };
}

export function localStockByCurrency(allTxs: Tx[]): Record<string, number> {
  const txs = ledger(allTxs);
  const out: Record<string, number> = {};
  for (const t of txs) {
    if (isBuy(t)) {
      out[t.localCurrency] = (out[t.localCurrency] ?? 0) + t.localAmount;
    } else if (isSell(t)) {
      out[t.localCurrency] = (out[t.localCurrency] ?? 0) - t.localAmount;
    } else if (isTreasuryDeposit(t)) {
      out[t.currency] = (out[t.currency] ?? 0) + t.amount;
    }
  }
  return out;
}

/**
 * Balance of a single treasury account, computed from deposits in and
 * order-paid SellTxs that disbursed from it (matched via Order.treasuryAccountId).
 */
export function treasuryBalance(
  allTxs: Tx[],
  orders: Order[],
  treasuryAccountId: ID,
): number {
  const txs = ledger(allTxs);
  let balance = 0;
  for (const t of txs) {
    if (isTreasuryDeposit(t) && t.treasuryAccountId === treasuryAccountId) {
      balance += t.amount;
    }
  }
  // Subtract amounts disbursed via paid orders that linked to this treasury.
  for (const o of orders) {
    if (o.treasuryAccountId !== treasuryAccountId) continue;
    if (o.status !== "paid" && o.status !== "settled") continue;
    // If the SellTx was voided (cancelled), don't subtract.
    const sellTx = o.paidSellTxId
      ? txs.find((t) => t.id === o.paidSellTxId)
      : undefined;
    if (!sellTx) continue;
    balance -= o.destAmount;
  }
  return balance;
}

export function sellerPayable(allTxs: Tx[], sellerId: ID): Record<string, number> {
  const txs = ledger(allTxs);
  const out: Record<string, number> = {};
  for (const t of txs) {
    if (isBuy(t) && t.sellerId === sellerId) {
      out[t.settlementCurrency] = (out[t.settlementCurrency] ?? 0) + t.settlementAmount;
    } else if (
      isSettle(t) &&
      t.partyType === "seller" &&
      t.partyId === sellerId &&
      t.direction === "paid"
    ) {
      out[t.currency] = (out[t.currency] ?? 0) - t.amount;
    } else if (isSettleNet(t) && t.partyType === "seller" && t.partyId === sellerId) {
      for (const leg of t.legs) {
        const sign = leg.direction === "paid" ? -1 : 1;
        out[leg.currency] = (out[leg.currency] ?? 0) + sign * leg.amount;
      }
    }
  }
  return out;
}

/** Local currency supplied by a specific seller (cumulative). */
export function localSuppliedBySeller(allTxs: Tx[], sellerId: ID): Record<string, number> {
  const txs = ledger(allTxs);
  const out: Record<string, number> = {};
  for (const t of txs) {
    if (isBuy(t) && t.sellerId === sellerId) {
      out[t.localCurrency] = (out[t.localCurrency] ?? 0) + t.localAmount;
    }
  }
  return out;
}

/** @deprecated use sellerPayable */
export const wholesalerPayable = sellerPayable;

export function buyerReceivable(allTxs: Tx[], buyerId: ID): Record<string, number> {
  const txs = ledger(allTxs);
  const out: Record<string, number> = {};
  for (const t of txs) {
    if (isSell(t) && t.buyerId === buyerId) {
      out[t.buyerCurrency] = (out[t.buyerCurrency] ?? 0) + t.buyerOwesAmount;
    } else if (
      isSettle(t) &&
      t.partyType === "buyer" &&
      t.partyId === buyerId &&
      t.direction === "received"
    ) {
      out[t.currency] = (out[t.currency] ?? 0) - t.amount;
    } else if (isSettleNet(t) && t.partyType === "buyer" && t.partyId === buyerId) {
      for (const leg of t.legs) {
        const sign = leg.direction === "received" ? -1 : 1;
        out[leg.currency] = (out[leg.currency] ?? 0) + sign * leg.amount;
      }
    }
  }
  return out;
}

/**
 * Sum of payables across sellers. As of v7 Self moved out of `sellers`
 * into treasuryAccounts so there's no self-id to filter — but we keep the
 * `sellers` param tolerant for back-compat and as a defensive belt.
 */
export function sumAcrossSellers(
  txs: Tx[],
  sellerIds: ID[],
  sellers?: Seller[],
): Record<string, number> {
  const totals: Record<string, number> = {};
  const selfIds = new Set(
    (sellers ?? []).filter((s) => s.kind === "self").map((s) => s.id),
  );
  for (const id of sellerIds) {
    if (selfIds.has(id)) continue;
    const each = sellerPayable(txs, id);
    for (const [ccy, amt] of Object.entries(each)) {
      totals[ccy] = (totals[ccy] ?? 0) + amt;
    }
  }
  return totals;
}

/** @deprecated use sumAcrossSellers */
export const sumAcrossWholesalers = sumAcrossSellers;

export function sumAcrossBuyers(txs: Tx[], buyerIds: ID[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const id of buyerIds) {
    const each = buyerReceivable(txs, id);
    for (const [ccy, amt] of Object.entries(each)) {
      totals[ccy] = (totals[ccy] ?? 0) + amt;
    }
  }
  return totals;
}

export function buyTotalsToday(allTxs: Tx[], iso: string): Record<string, number> {
  const txs = ledger(allTxs);
  const out: Record<string, number> = {};
  for (const t of txs) {
    if (!isBuy(t) || !sameDay(t.createdAt, iso)) continue;
    out[t.localCurrency] = (out[t.localCurrency] ?? 0) + t.localAmount;
  }
  return out;
}

export function sellTotalsToday(allTxs: Tx[], iso: string): Record<string, number> {
  const txs = ledger(allTxs);
  const out: Record<string, number> = {};
  for (const t of txs) {
    if (!isSell(t) || !sameDay(t.createdAt, iso)) continue;
    out[t.localCurrency] = (out[t.localCurrency] ?? 0) + t.localAmount;
  }
  return out;
}

/**
 * Gross spread per buyer-currency. Cost side excludes BUYs whose seller is
 * tagged kind="self" — those represent the operator's own float and shouldn't
 * count as a cost to themselves.
 */
export function grossSpread(allTxs: Tx[], sellers?: Seller[]): Record<string, number> {
  const txs = ledger(allTxs);
  const selfIds = new Set(
    (sellers ?? []).filter((s) => s.kind === "self").map((s) => s.id),
  );
  const out: Record<string, number> = {};
  for (const t of txs) {
    if (isBuy(t)) {
      if (selfIds.has(t.sellerId)) continue;
      out[t.settlementCurrency] = (out[t.settlementCurrency] ?? 0) - t.settlementAmount;
    } else if (isSell(t)) {
      out[t.buyerCurrency] = (out[t.buyerCurrency] ?? 0) + t.buyerOwesAmount;
    }
  }
  return out;
}

export function sameDay(aIso: string, bIso: string): boolean {
  return aIso.slice(0, 10) === bIso.slice(0, 10);
}

export function fmtMoney(amount: number, currency: string): string {
  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${currency}`;
}

export function fmtSignedMoney(amount: number, currency: string): string {
  const sign = amount > 0 ? "+" : amount < 0 ? "−" : "";
  return `${sign}${fmtMoney(Math.abs(amount), currency)}`;
}

export function formatMap(m: Record<string, number>): string {
  const entries = Object.entries(m).filter(([, v]) => v !== 0);
  if (entries.length === 0) return "—";
  return entries.map(([ccy, amt]) => fmtMoney(amt, ccy)).join(" · ");
}
