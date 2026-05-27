# Bridge — state snapshot

Last touched: 2026-05-27. Open this first tomorrow.

---

## Right now

- **Live:** https://robelkyemane.github.io/bridge/
- **Repo:** https://github.com/RobelKYemane/bridge (public)
- **Local dev:** `cd web && npm run dev:lite` (webpack, 1.5 GB heap cap; lighter idle than Turbopack)
- **Auto-deploy:** push to `main` → GH Actions builds + deploys to Pages (~70s)
- **Persistence:** localStorage only, migrations v1 → v7
- **TS:** clean. `npm audit`: 0 vulnerabilities.

---

## Where to pick up (priority order)

1. **Bump GH Actions to Node 22** — runners are warning Node 20 is deprecated (forced switch June 2026). One-line edit in `.github/workflows/deploy.yml`.
2. **Decide on FX revaluation** between accept → settle. Snapshots are captured (`sellRateAtAccept`, `costRateAtPaid`) but nothing recomputes when the rate sheet moves. Could be a simple per-order "drift" badge.
3. **Partial pay on orders.** The lifecycle is one-way; for real ops a buyer often pays in chunks. Either add `paidAmounts[]` to Order or compose via multiple Settle Txs.
4. **WhatsApp parser.** The "format-discipline" plan (agent rewrites messages into the disciplined BUY/SELL format) is unbuilt. Pure regex first, AI fallback. No Twilio yet — start with a "Paste WhatsApp message" textbox on the dashboard.
5. **Counterparty unification.** Buyer and Seller are still separate entities; if the same person plays both roles you duplicate. Promote to one `Counterparty` with `roles: Set<"buyer" | "seller">` when it gets painful.
6. **Treasury balance on Daily Close.** Currently lives only on Dashboard.
7. **Audit log filtering / search.** Just an append-only table today.

---

## Hawala expert audit — fix status

P0 = breaks even at prototype scale. P1 = must-fix before pilot. P2 = polish.

| Severity | Issue | Status |
|---|---|---|
| P0 | Dual ledger — Order lifecycle didn't emit Txs | ✅ Fixed (`markOrderPaid` emits Sell+Buy, `markOrderSettled` emits Settle) |
| P0 | `customerOwes` dropped settled orders | ✅ Fixed (selector removed, ledger now source of truth) |
| P0 | Self-as-Seller double-counted into margin | ✅ Fixed (Self extracted to `TreasuryAccount`, not in `sellers` anymore) |
| P0 | BuyTx cost-currency mismatch on fallback | ✅ Fixed (refuses to mark paid if seller has no `costRate`; audit-logs refusal) |
| P0 | `settlementAmount` math semantics mixed | ✅ Fixed (always `destAmount / seller.costRate` → `seller.preferredCurrency`) |
| P1 | Rate sheet has no buy/sell split | ✅ Fixed (`midRate`, `buyRate`, `sellRate` per pair; dashboard shows spread) |
| P1 | No multi-leg / cross-currency netting | ✅ Fixed (`SettleNetTx` + `NetSettleModal`; "Net…" button on Sellers and Buyers) |
| P1 | NetSettle could record half-settlements | ✅ Fixed (submit gated on net-to-zero when fxRates provided; explicit residual checkbox to override) |
| P1 | No reverse path once paid | ✅ Fixed (`voidPaidOrder` emits `ReversalTx` and cancels linked Txs; Void button on Order rows) |
| P1 | AML field stubs absent | ✅ Fixed (Buyer + Order carry id type/ref, sanctions status; Add Buyer form has fieldset) |
| P1 | FX move between accept → settle | ⚠️ Partial — snapshots captured, no live recompute |
| P1 | Partial pay on orders | ❌ Not started |
| P2 | `runSprint1Demo` bypasses lifecycle | ❌ Not started — either delete or route through `simulateInboundOrder → accept → markPaid → markSettled` |
| P2 | Counterparty unification | ❌ Not started |
| P2 | Multi-node trust network / inter-agent recs | ❌ Not started |

---

## Current data model

### Entities

- **`Branch`** — UAE Branch (primary, active) + Addis Ababa.
- **`Seller`** — local-cash suppliers. Agent owes them. Required: `costRate` (dest-ccy per 1 unit of preferred-ccy).
- **`Buyer`** — customers who send money. They owe agent. Optional AML stubs: `idType`, `idRef`, `dateOfBirth`, `sanctionsStatus`.
- **`TreasuryAccount`** — agent's own float, by branch + currency. Disburses without creating a payable.
- **`Order`** — the customer's send request. Lifecycle: `incoming → accepted → paid → settled` (or `cancelled`). Holds AML stubs + snapshot rates.

### Tx (ledger) variants

- `BUY` — agent receives local cash from a seller, owes them in settlement ccy
- `SELL` — agent disburses local cash to a recipient; buyer owes agent
- `SETTLE` — single-currency payment between agent and counterparty
- `SETTLE_NET` — multi-leg netting with one counterparty, optional cross-ccy `fxRates` snapshot
- `TREASURY_DEPOSIT` — inject local cash into a treasury account
- `REVERSAL` — explicit audit entry for a void; flips linked Txs to status `cancelled`

All Txs carry `status: pending | confirmed | cancelled`. Selectors filter to `confirmed`.

### Order → Tx flow

1. `simulateInboundOrder()` → Order `incoming`
2. `acceptOrder()` → snapshots `sellRateAtAccept` from current rate sheet
3. `markOrderPaid(id, { sellerId | treasuryAccountId })` →
   - Emits `SellTx` (buyer receivable + local stock debit)
   - If seller path: also emits `BuyTx` (agent payable to seller)
   - If treasury path: no `BuyTx` (own float, no payable)
4. `markOrderSettled(id)` → emits `SettleTx` (direction: received from buyer)
5. `voidPaidOrder(id, reason)` → emits `ReversalTx`, cancels linked Txs, order status → `cancelled`

### Rate sheet

- Per pair (e.g. `GBP→BIRR`): `sellRate` (quoted to customers), `buyRate` (seller cost), `midRate` (display)
- Seeded: GBP→BIRR 142.5/138, USD→BIRR 112/110
- Lives on Dashboard, editable inline

### Supported currencies

`USD, USDT, EUR, GBP, NAKFA, BIRR, AED`

---

## Decisions made (don't redo these)

- **Wholesaler → Seller** rename (Buyer kept). Migration v3→v4 handled it.
- **Self extracted from Sellers** into `TreasuryAccount`. Migration v6→v7 moves any existing self-tagged seller.
- **BUY/SELL/SETTLE primitives kept**; Order is a workflow wrapper that emits these. Single source of truth = the Tx ledger.
- **Void replaces "reverse"** — flips status to `cancelled` rather than emitting negative-value Txs. Cleaner because selectors already filter to `confirmed`.
- **Rate sheet is internal** — not exposed to a buyer-facing view (no such surface yet).
- **Two branches** seeded — UAE (active) + Addis. Branch switcher in TopBar.
- **No backend**. localStorage persistence only. Auto-settle cadence field exists but no scheduler.

---

## File map

```
bridge/
├── SPEC.md                          ← original spec (some superseded)
├── STATE.md                         ← this file
├── README.md
├── .claude/agents/
│   ├── hawala-finance-expert.md     ← domain reviewer
│   └── bridge-demo-guide.md         ← UX walkthrough coach
├── .github/workflows/deploy.yml     ← Pages CI/CD
└── web/
    ├── next.config.ts               ← static export config, basePath /bridge
    ├── package.json                 ← scripts; npm overrides pin postcss ≥8.5.10
    └── app/
        ├── layout.tsx               ← DemoBanner + sidebar + topbar shell
        ├── page.tsx                 ← Dashboard: rate sheet, 3-box summary, treasury, pending banner
        ├── lib/
        │   ├── types.ts             ← all entity + Tx shapes
        │   ├── store.ts             ← Zustand, all actions, persist migrations v1→v7
        │   └── selectors.ts         ← derived balances/stock/spread/treasury
        ├── components/
        │   ├── Card.tsx, ConfirmStrip.tsx, HydrationGate.tsx
        │   ├── Sidebar.tsx, TopBar.tsx, DemoBanner.tsx
        │   ├── SettleModal.tsx      ← single-currency settle
        │   └── NetSettleModal.tsx   ← multi-leg netting with fxRates
        ├── sellers/page.tsx         ← list + Settle/Net buttons + Add seller (requires costRate)
        ├── buyers/page.tsx          ← list + Settle/Net buttons + Add buyer with AML fieldset
        ├── transactions/
        │   ├── page.tsx             ← orders pipeline + ledger entries, void buttons
        │   └── new/{buy,sell,settle}/page.tsx
        ├── daily-close/page.tsx
        └── audit-log/page.tsx
```

---

## Run / develop

```bash
cd web
npm install
npm run dev        # Turbopack, ~2 GB
npm run dev:lite   # webpack, 1.5 GB cap, lighter idle ← recommended
npm run preview    # build + serve, no HMR, lightest
```

Open http://localhost:3000.

## Deploy

Push to `main`. GH Actions in `.github/workflows/deploy.yml` runs `npm run build` with `NEXT_PUBLIC_BASE_PATH=/bridge`, uploads `web/out/`, deploys to Pages.

Manual: workflow_dispatch from the Actions tab.

---

## Two agents available in `.claude/agents/`

In a fresh Claude Code session they auto-load (the current session sees the old agent list — restart Claude Code to refresh).

- **`hawala-finance-expert`** — read-only. Reviews data model + lifecycle against real-world MSB / hawala practice. Tags findings P0/P1/P2. Don't use for code edits — use for sanity checks before locking decisions.
- **`bridge-demo-guide`** — read-only. Walks through the prototype as a fresh user would. Spots confusing copy, suggests next clicks, recommends polish.

---

## Today's chat — what shipped

1. Initial Next.js scaffold (Sprint 1 web ledger).
2. Inbox/orders → migrated to Transactions page lifecycle controls.
3. Rate sheet on Dashboard.
4. Sellers + Buyers per-counterparty Settle with cadence field.
5. Wholesaler → Seller rename, UAE branch primary, Self-as-Seller.
6. Hawala expert audit → 3 P0s + P1 fixes. All landed (see status table).
7. Self extracted to TreasuryAccount + Treasury widget on Dashboard.
8. NetSettle modal + ReversalTx + AML stubs.
9. GitHub repo created, GH Pages deployed at robelkyemane.github.io/bridge.
10. Hydration warning fix (`suppressHydrationWarning` on `<html>`/`<body>` for Bitdefender).
11. Dependabot fix (postcss ≥8.5.10 via npm overrides).
12. Red demo banner → amber.
13. Dropped duplicate TopBar reset; banner has Reset demo + Simulate inbound order.
