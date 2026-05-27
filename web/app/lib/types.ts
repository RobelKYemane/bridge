export type ID = string;

export type SettlementStatus = "paid" | "unpaid" | "partial";
export type SettlementMethod = "cash" | "usdt" | "bank";
export type TxKind = "BUY" | "SELL" | "SETTLE" | "TREASURY_DEPOSIT" | "REVERSAL";
export type SettleParty = "seller" | "buyer";
export type SettleDirection = "paid" | "received";
export type SourceChannel = "web" | "whatsapp";
export type TxStatus = "pending" | "confirmed" | "cancelled";
export type SettlementCadence = "manual" | "daily" | "weekly" | "monthly";
export type SellerKind = "self" | "supplier" | "agent";
export type SanctionsCheckStatus = "unchecked" | "clear" | "flagged";

export const SUPPORTED_CURRENCIES = [
  "USD",
  "USDT",
  "EUR",
  "GBP",
  "NAKFA",
  "BIRR",
  "AED",
] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export interface TxMeta {
  status: TxStatus;
  source: SourceChannel;
  originalMessage?: string;
}

export interface Branch {
  id: ID;
  name: string;
  country: string;
  city: string;
}

export interface Seller {
  id: ID;
  name: string;
  branchId: ID;
  kind: SellerKind;
  preferredCurrency: string;
  preferredMethod?: SettlementMethod;
  costRate?: number;
  costRateLocalCurrency?: string;
  settlementCadence?: SettlementCadence;
}

/** @deprecated kept for migration compatibility */
export type Wholesaler = Seller;

/**
 * The agent's own float. Not a counterparty — the agent never owes
 * themselves. Disbursing an order from a treasury account moves stock
 * out but creates no payable, and is recorded as a SellTx tagged with
 * the originating treasury account.
 */
export interface TreasuryAccount {
  id: ID;
  branchId: ID;
  currency: string;
  name: string;
  /** Optional cap or display target. Actual balance is computed from Txs. */
  note?: string;
}

export interface Buyer {
  id: ID;
  name: string;
  country?: string;
  preferredCurrency: string;
  phone?: string;
  settlementCadence?: SettlementCadence;
  // AML stubs — default null/unchecked. Cheap now, painful to retrofit.
  idType?: string;
  idRef?: string;
  dateOfBirth?: string;
  sanctionsStatus?: SanctionsCheckStatus;
}

export interface BuyTx extends TxMeta {
  id: ID;
  kind: "BUY";
  createdAt: string;
  branchId: ID;
  sellerId: ID;
  localAmount: number;
  localCurrency: string;
  rate: number;
  settlementAmount: number;
  settlementCurrency: string;
  settlementMethod?: SettlementMethod;
  settlementStatus: SettlementStatus;
}

export interface SellTx extends TxMeta {
  id: ID;
  kind: "SELL";
  createdAt: string;
  branchId: ID;
  buyerId: ID;
  recipientName: string;
  localAmount: number;
  localCurrency: string;
  rate: number;
  buyerOwesAmount: number;
  buyerCurrency: string;
  feePercent?: number;
  paymentStatus: SettlementStatus;
}

export interface SettleTx extends TxMeta {
  id: ID;
  kind: "SETTLE";
  createdAt: string;
  branchId: ID;
  partyType: SettleParty;
  partyId: ID;
  amount: number;
  currency: string;
  method: SettlementMethod;
  direction: SettleDirection;
}

export interface SettleNetLeg {
  currency: string;
  amount: number;
  direction: SettleDirection;
}

/**
 * Multi-leg, optionally cross-currency settlement with one counterparty.
 * Each leg is a movement in one currency in one direction. When legs span
 * multiple currencies, fxRates carries the agreed conversion used to net.
 *
 * Example: agent owes seller 5,000 USDT, seller owes agent 18,400 AED,
 *   net at mid 3.6725 — record both legs and the fxRate for USDT→AED.
 */
export interface SettleNetTx extends TxMeta {
  id: ID;
  kind: "SETTLE_NET";
  createdAt: string;
  branchId: ID;
  partyType: SettleParty;
  partyId: ID;
  legs: SettleNetLeg[];
  /** Map of `SRC->DST` pair → fxRate snapshot used for the net. */
  fxRates?: Record<string, number>;
  method: SettlementMethod;
  note?: string;
}

/**
 * Inject local currency into a treasury account. Counts toward stock.
 * Does not create a payable.
 */
export interface TreasuryDepositTx extends TxMeta {
  id: ID;
  kind: "TREASURY_DEPOSIT";
  createdAt: string;
  branchId: ID;
  treasuryAccountId: ID;
  currency: string;
  amount: number;
  note?: string;
}

/**
 * Void another Tx. Cancels its ledger effect by flipping the target's
 * status to `cancelled` (selectors already filter to confirmed). Kept
 * as its own kind so audits can find reversals explicitly.
 */
export interface ReversalTx extends TxMeta {
  id: ID;
  kind: "REVERSAL";
  createdAt: string;
  branchId: ID;
  targetTxIds: ID[];
  reason?: string;
}

export type Tx = BuyTx | SellTx | SettleTx | SettleNetTx | TreasuryDepositTx | ReversalTx;

export interface AuditEntry {
  id: ID;
  ts: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: ID;
  detail?: string;
}

export type OrderStatus =
  | "incoming"
  | "accepted"
  | "paid"
  | "settled"
  | "cancelled";

export interface Order {
  id: ID;
  createdAt: string;
  acceptedAt?: string;
  paidAt?: string;
  settledAt?: string;
  cancelledAt?: string;

  branchId: ID;
  customerId: ID;

  sourceCurrency: string;
  sourceAmount: number;
  destCurrency: string;
  destAmount: number;
  rate: number;

  // Snapshots taken at lifecycle steps. Lets us compute real per-order P&L
  // and detect intraday FX moves between accept → settle.
  sellRateAtAccept?: number;
  costRateAtPaid?: number;
  costCurrencyAtPaid?: string;

  recipientName: string;
  recipientPhone: string;
  recipientNote?: string;

  sellerId?: ID;
  treasuryAccountId?: ID;

  // AML stubs.
  senderIdType?: string;
  senderIdRef?: string;
  recipientIdType?: string;
  recipientIdRef?: string;
  purposeCode?: string;
  sanctionsStatus?: SanctionsCheckStatus;

  // Cross-references to ledger Txs emitted on paid/settled. These tie the
  // workflow wrapper back to the books so reversal stays auditable.
  paidSellTxId?: ID;
  paidBuyTxId?: ID;
  settledSettleTxId?: ID;

  status: OrderStatus;
  source: SourceChannel;
  originalMessage?: string;
}

export interface RateEntry {
  sourceCurrency: string;
  destCurrency: string;
  /** Legacy single-rate field. Kept for backwards-compat reads; new code uses sellRate. */
  rate: number;
  midRate?: number;
  /** Rate the agent quotes to customers (dest per 1 source). Default = rate. */
  sellRate?: number;
  /** Rate the agent pays sellers for local cash (dest per 1 source). */
  buyRate?: number;
  updatedAt: string;
}

export function effectiveSellRate(e: RateEntry): number {
  return e.sellRate ?? e.rate;
}

export function effectiveBuyRate(e: RateEntry): number {
  return e.buyRate ?? e.midRate ?? e.rate;
}

export function effectiveMidRate(e: RateEntry): number {
  return e.midRate ?? e.rate;
}

export type Rates = Record<string, RateEntry>;

export function ratePairKey(source: string, dest: string): string {
  return `${source.toUpperCase()}->${dest.toUpperCase()}`;
}
