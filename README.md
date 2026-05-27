# Bridge

A prototype ledger for a UAE-based currency agent (hawala / informal value transfer). Captures orders, settles per-counterparty balances across currencies, tracks the agent's own float, and books reversible ledger entries.

**Live demo:** https://robelkyemane.github.io/bridge/

Everything is stored in the browser's localStorage — no backend, no real data, no sign-in. Refresh keeps your demo state.

## Stack

- Next.js 16 (App Router, static export)
- React 19
- Zustand + persist middleware
- Tailwind CSS 4
- TypeScript

## Run locally

```bash
cd web
npm install
npm run dev:lite    # webpack mode, lower memory
# or
npm run dev         # default (Turbopack)
```

Open http://localhost:3000.

## Build for GitHub Pages

```bash
cd web
npm run build       # produces web/out/
```

Deploys automatically via `.github/workflows/deploy.yml` on push to `main`.

## What's in here

| Path | What it is |
|---|---|
| `SPEC.md` | Original product spec (some has been superseded by iteration) |
| `web/` | Next.js app |
| `web/app/lib/types.ts` | Data model — Order, BuyTx, SellTx, SettleTx, SettleNetTx, ReversalTx, TreasuryDepositTx |
| `web/app/lib/store.ts` | Zustand store + persist migrations (v1 → v7) |
| `web/app/lib/selectors.ts` | Balances, stock, spread, treasury balance |
| `.claude/agents/` | Two domain-expert agents (hawala finance, demo guide) for working on this with Claude Code |
