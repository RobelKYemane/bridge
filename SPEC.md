# Currency Agent Ledger — Build Starting Point

## 1. Product Direction

Build a **secure web-based ledger system** for currency agents, with **WhatsApp as the first transaction input channel**.

The web app is the main system and source of truth. WhatsApp is only the easiest way for agents to submit transactions because that is where their current workflow already happens.

Do **not** build a custom messaging app at MVP stage.

---

## 2. Core Concept

The product tracks two sides of the agent's business.

### 2.1 Wholesaler / Supply Side

A wholesaler supplies local currency, for example birr, nakfa, or shillings.

The system records:

- Which wholesaler supplied the cash
- Which office or branch received it
- How much local currency was received
- The agreed buy rate
- How much the agent owes the wholesaler
- Whether that amount has been paid, unpaid, or partially paid

Example:

```text
Wholesaler Ahmed gives 1,000 BIRR to the Addis Ababa office.
The UAE agent owes Ahmed 10 USD.
```

### 2.2 Buyer / Payout Side

A buyer in another country asks the agent to pay local currency to a recipient.

The system records:

- Which buyer requested the payout
- Who received the local cash
- Which office paid it out
- How much local currency was paid
- The agreed sell rate
- How much the buyer owes the agent
- Whether the buyer has paid, not paid, or partially paid

Example:

```text
Buyer in the UK asks the agent to pay 1,000 BIRR to Recipient X in Addis Ababa.
The buyer owes the agent 12 USD.
```

### 2.3 The Spread

The business earns money from the difference between the buy side and sell side.

Example:

```text
Cost of 1,000 BIRR from wholesaler: 10 USD
Revenue from buyer for 1,000 BIRR payout: 12 USD

Gross spread: 2 USD
```

---

## 3. MVP Goal

The MVP should prove that one currency agent can stop using manual Excel/paper reconciliation and instead rely on the system for daily tracking.

The first milestone is:

> One agent can log buy and sell activity, confirm each transaction, and produce an accurate end-of-day position without manual spreadsheet work.

---

## 4. Product Shape

The product should be built as:

```text
Web App Ledger
  ↓
Secure Backend + Database
  ↓
Messaging Input Layer
  ↓
WhatsApp Bot first, other channels later
```

The web app is the source of truth.

WhatsApp is not the product itself. WhatsApp is just the first input channel.

---

## 5. MVP Users

## 5.1 Owner / Admin

Usually the UAE-based agent or business owner.

Can:

- Manage branches
- Manage wholesalers
- Manage buyers
- Manage rate sheets
- Review transactions
- Edit/correct transactions
- View daily close reports
- Export data
- Manage user access

## 5.2 Local Office User

For example, someone in Addis Ababa.

Can:

- Record cash received from wholesalers
- Record payouts to recipients
- Mark payouts as completed
- View local branch stock
- View only permitted branch data

## 5.3 Accountant / Reviewer

Can:

- Review transactions
- Reconcile daily position
- Export reports
- Flag issues
- Review audit logs

## 5.4 WhatsApp Bot User

Usually the agent.

Can:

- Send structured transaction messages
- Confirm parsed transactions
- Ask for today's position
- Ask for balances
- Ask for rates
- Undo or cancel recent unconfirmed actions

---

## 6. MVP Channels

## 6.1 Web App

The web app stores and manages:

- Users
- Branches
- Wholesalers
- Buyers
- Recipients
- Rate sheets
- Transactions
- Settlements
- Daily closes
- Audit logs

## 6.2 WhatsApp Bot

The WhatsApp bot should:

- Receive structured transaction messages
- Parse the message
- Return a confirmation summary
- Wait for explicit confirmation
- Save only confirmed transactions
- Support simple commands

Supported commands:

```text
today
close
balance
rates
undo last
help
```

## 6.3 Future Channels

The backend should be channel-agnostic so that future integrations can be added:

- Telegram
- Signal
- SMS
- Native mobile app
- Custom messaging app

---

## 7. Key Product Rule

The system must never silently log a bot-created transaction.

Every bot transaction must follow this flow:

```text
Message received
→ Parsed into structured fields
→ Calculation shown to user
→ User confirms
→ Transaction saved
→ Audit log created
```

If the user does not confirm, the transaction remains pending or is discarded.

---

## 8. Core Transaction Types

## 8.1 Buy / Supply Transaction

This records local currency received from a wholesaler.

Example message:

```text
BUY 1000 BIRR from Ahmed at 100, settlement 10 USD, unpaid
```

Meaning:

- Ahmed supplied 1,000 BIRR
- The agent owes Ahmed 10 USD
- Settlement is currently unpaid
- Local currency stock increases by 1,000 BIRR
- Wholesaler payable increases by 10 USD

Fields:

| Field | Example | Required |
|---|---:|---|
| Transaction type | BUY | Yes |
| Wholesaler | Ahmed | Yes |
| Local amount | 1,000 | Yes |
| Local currency | BIRR | Yes |
| Buy rate | 100 | Yes |
| Settlement amount | 10 | Yes |
| Settlement currency | USD | Yes |
| Settlement method | Cash / USDT / Bank | No |
| Settlement status | Paid / Unpaid / Partial | Yes |
| Branch | Addis Ababa | Yes |
| Date/time | Auto | Yes |

---

## 8.2 Sell / Payout Transaction

This records a buyer asking the agent to pay local currency to a recipient.

Example message:

```text
SELL 1000 BIRR to RecipientX for BuyerY at 83.33, buyer owes 12 USD, unpaid
```

Meaning:

- BuyerY asked the agent to pay 1,000 BIRR to RecipientX
- BuyerY owes 12 USD
- Local currency stock decreases by 1,000 BIRR
- Buyer receivable increases by 12 USD
- Spread can be calculated against the cost of local currency stock

Fields:

| Field | Example | Required |
|---|---:|---|
| Transaction type | SELL | Yes |
| Buyer | BuyerY | Yes |
| Recipient | RecipientX | Yes |
| Local payout amount | 1,000 | Yes |
| Local currency | BIRR | Yes |
| Sell rate | 83.33 | Yes |
| Buyer amount owed | 12 | Yes |
| Buyer currency | USD | Yes |
| Fee | 0 / 1.2% | No |
| Payment status | Paid / Unpaid / Partial | Yes |
| Branch | Addis Ababa | Yes |
| Date/time | Auto | Yes |

---

## 8.3 Settlement Transaction

This records money paid between the agent and a wholesaler or buyer.

Examples:

```text
SETTLE WHOLESALER Ahmed 10 USD paid by USDT
```

```text
SETTLE BUYER BuyerY 12 USD received by bank
```

Fields:

| Field | Example | Required |
|---|---:|---|
| Party type | Wholesaler / Buyer | Yes |
| Party name | Ahmed | Yes |
| Amount | 10 | Yes |
| Currency | USD | Yes |
| Method | USDT / Cash / Bank | Yes |
| Direction | Paid / Received | Yes |
| Date/time | Auto | Yes |

---

## 9. Daily Close

The system should generate a daily close by branch, currency, and date.

Example:

```text
Daily Close — Addis Ababa — 24 Jan

Local Currency Stock:
- Opening BIRR stock: 0
- BIRR received from wholesalers: 1,000
- BIRR paid out to recipients: 1,000
- Closing BIRR stock: 0

Wholesalers:
- Ahmed supplied: 1,000 BIRR
- Agent owes Ahmed: 10 USD
- Settlement status: Unpaid

Buyers:
- BuyerY requested payout: 1,000 BIRR
- BuyerY owes agent: 12 USD
- Settlement status: Unpaid

Margin:
- Cost of 1,000 BIRR: 10 USD
- Revenue from 1,000 BIRR: 12 USD
- Gross spread: 2 USD
```

---

## 10. Web App MVP Features

## 10.1 Authentication

- Email/password login
- Multi-factor authentication for admins
- Role-based access control

## 10.2 Dashboard

Show:

- Today's total buys
- Today's total sells
- Local currency stock
- Buyer receivables
- Wholesaler payables
- Estimated gross margin
- Pending confirmations
- Incomplete or failed transactions

## 10.3 Branches

Support:

- Multiple countries
- Multiple offices/branches
- Multiple currencies per branch
- Users assigned to specific branches

## 10.4 Wholesalers

Store:

- Name
- Country
- Branch
- Preferred settlement currency
- Preferred settlement method
- Outstanding payable balance
- Transaction history

## 10.5 Buyers

Store:

- Name
- Country
- Preferred payment currency
- Outstanding receivable balance
- Transaction history

## 10.6 Rate Sheets

Admin can:

- Create daily rate sheet
- Edit buy rates
- Edit sell rates
- Set fee rules
- Set destination rules
- Activate rate sheet for the day

## 10.7 Transactions

Admin can:

- View all transactions
- Filter by date, branch, currency, buyer, wholesaler, and status
- Edit transactions with reason
- Cancel or reverse transactions with reason
- Export CSV
- See original WhatsApp message if transaction came from bot

## 10.8 Daily Close

Admin can:

- Generate daily close
- Review balances
- Lock the day
- Export daily report
- Reopen day only with admin permission

## 10.9 Audit Logs

Track:

- Who created a transaction
- Who confirmed it
- Who edited it
- What changed
- Previous value
- New value
- Timestamp
- Source channel
- Original message

---

## 11. WhatsApp Bot MVP Features

## 11.1 Supported Commands

```text
today
```

Returns today's quick summary.

```text
close
```

Returns daily close summary.

```text
rates
```

Returns active rate sheet.

```text
balance
```

Returns current stock and outstanding balances.

```text
undo last
```

Cancels or reverses the most recent transaction if allowed.

```text
help
```

Shows valid message formats.

## 11.2 Suggested Message Formats

Buy format:

```text
BUY [amount] [currency] from [wholesaler] at [rate], settlement [amount] [currency], [paid/unpaid]
```

Example:

```text
BUY 1000 BIRR from Ahmed at 100, settlement 10 USD, unpaid
```

Sell format:

```text
SELL [amount] [currency] to [recipient] for [buyer] at [rate], buyer owes [amount] [currency], [paid/unpaid]
```

Example:

```text
SELL 1000 BIRR to RecipientX for BuyerY at 83.33, buyer owes 12 USD, unpaid
```

Settlement format:

```text
SETTLE [buyer/wholesaler] [name] [amount] [currency] [paid/received] by [method]
```

Example:

```text
SETTLE wholesaler Ahmed 10 USD paid by USDT
```

---

## 12. Parsing Strategy

Use a layered parser.

## 12.1 Strict Parser

Start with regex or schema-based parsing.

Benefits:

- Fast
- Predictable
- Low cost
- Easy to test
- Safer than fully AI-based parsing

## 12.2 Validation

Check:

- Required fields exist
- Currency is supported
- Rate is valid
- Buyer or wholesaler exists, or can be created
- Amounts make sense
- Active rate sheet exists
- Branch is known

## 12.3 Assisted Parser

Use AI only when the strict parser fails or when the input is close to valid.

AI should return structured JSON only. It should not directly create a transaction.

## 12.4 Human Confirmation

Before saving, always show:

- Parsed fields
- Calculated values
- Warnings
- Confirmation prompt

Only save after explicit confirmation.

---

## 13. Suggested Technical Stack

## Option A: Fast MVP Stack

- Frontend: Next.js
- Backend: Next.js API routes or NestJS
- Database: PostgreSQL
- ORM: Prisma
- Auth: Clerk, Auth0, or Supabase Auth
- Hosting: Railway, Render, or Vercel with managed Postgres
- WhatsApp: Twilio WhatsApp API or Meta Cloud API
- Queue: Redis/BullMQ if needed
- Exports: Server-side CSV generation

## Option B: More Robust Stack

- Frontend: Next.js
- Backend: NestJS or FastAPI
- Database: PostgreSQL
- ORM: Prisma or SQLAlchemy
- Auth: Auth0 or AWS Cognito
- Hosting: AWS or GCP
- WhatsApp: Meta Cloud API
- Queue: SQS or Pub/Sub
- Monitoring: Sentry plus CloudWatch or Datadog

## Recommended MVP Choice

Use:

- Next.js
- PostgreSQL
- Prisma
- Auth provider
- Twilio WhatsApp API for speed, or Meta Cloud API for closer production alignment
- Simple hosted environment

---

## 14. Initial Database Model

This is a starting point, not the final schema.

```prisma
model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  role      UserRole
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum UserRole {
  OWNER
  ADMIN
  BRANCH_USER
  ACCOUNTANT
  VIEWER
}

model Branch {
  id        String   @id @default(cuid())
  name      String
  country   String
  city      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Wholesaler {
  id                String   @id @default(cuid())
  name              String
  branchId          String
  preferredCurrency String
  preferredMethod   String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model Buyer {
  id                String   @id @default(cuid())
  name              String
  country           String?
  preferredCurrency String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model RateSheet {
  id          String   @id @default(cuid())
  branchId    String
  date        DateTime
  isActive    Boolean  @default(false)
  createdById String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Rate {
  id              String   @id @default(cuid())
  rateSheetId     String
  localCurrency   String
  foreignCurrency String
  buyRate         Decimal?
  sellRate        Decimal?
  feeType         FeeType?
  feeValue        Decimal?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum FeeType {
  NONE
  FIXED
  PERCENTAGE
}

model Transaction {
  id             String            @id @default(cuid())
  type           TransactionType
  branchId        String
  localAmount     Decimal
  localCurrency   String
  foreignAmount   Decimal
  foreignCurrency String
  rate            Decimal
  feeAmount       Decimal?
  status          TransactionStatus
  sourceChannel   SourceChannel
  originalMessage String?
  confirmedById   String?
  confirmedAt     DateTime?
  createdById     String?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
}

enum TransactionType {
  BUY
  SELL
  SETTLEMENT
  ADJUSTMENT
}

enum TransactionStatus {
  PENDING_CONFIRMATION
  CONFIRMED
  CANCELLED
  REVERSED
}

enum SourceChannel {
  WEB
  WHATSAPP
  TELEGRAM
  SIGNAL
  API
}

model AuditLog {
  id         String   @id @default(cuid())
  entityType String
  entityId   String
  action     String
  oldValue   Json?
  newValue   Json?
  reason     String?
  userId     String?
  createdAt  DateTime @default(now())
}
```

---

## 15. API Starting Point

## 15.1 Auth

```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

## 15.2 Branches

```text
GET    /api/branches
POST   /api/branches
GET    /api/branches/:id
PATCH  /api/branches/:id
```

## 15.3 Wholesalers

```text
GET    /api/wholesalers
POST   /api/wholesalers
GET    /api/wholesalers/:id
PATCH  /api/wholesalers/:id
GET    /api/wholesalers/:id/balance
```

## 15.4 Buyers

```text
GET    /api/buyers
POST   /api/buyers
GET    /api/buyers/:id
PATCH  /api/buyers/:id
GET    /api/buyers/:id/balance
```

## 15.5 Rate Sheets

```text
GET    /api/rate-sheets
POST   /api/rate-sheets
GET    /api/rate-sheets/:id
PATCH  /api/rate-sheets/:id
POST   /api/rate-sheets/:id/activate
```

## 15.6 Transactions

```text
GET    /api/transactions
POST   /api/transactions
GET    /api/transactions/:id
PATCH  /api/transactions/:id
POST   /api/transactions/:id/confirm
POST   /api/transactions/:id/cancel
POST   /api/transactions/:id/reverse
```

## 15.7 Daily Close

```text
GET    /api/daily-close?date=YYYY-MM-DD&branchId=...
POST   /api/daily-close
POST   /api/daily-close/:id/lock
POST   /api/daily-close/:id/reopen
```

## 15.8 WhatsApp Webhook

```text
POST /api/webhooks/whatsapp
```

---

## 16. Calculation Logic

## 16.1 Buy Transaction

When a wholesaler supplies local currency:

```text
local_stock += local_amount
wholesaler_payable += foreign_amount
```

Example:

```text
BUY 1000 BIRR from Ahmed
Agent owes Ahmed 10 USD
```

Result:

```text
BIRR stock +1000
Ahmed payable +10 USD
```

## 16.2 Sell Transaction

When a buyer requests payout:

```text
local_stock -= local_amount
buyer_receivable += foreign_amount
```

Example:

```text
SELL 1000 BIRR to RecipientX for BuyerY
BuyerY owes 12 USD
```

Result:

```text
BIRR stock -1000
BuyerY receivable +12 USD
```

## 16.3 Gross Spread

Basic spread:

```text
gross_spread = buyer_foreign_amount - cost_basis_of_local_currency
```

Example:

```text
Wholesaler cost: 1000 BIRR = 10 USD
Buyer revenue: 1000 BIRR = 12 USD

Gross spread = 2 USD
```

## 16.4 Settlement

When agent pays wholesaler:

```text
wholesaler_payable -= paid_amount
```

When buyer pays agent:

```text
buyer_receivable -= received_amount
```

---

## 17. Security Requirements

## Must Have

- HTTPS everywhere
- Encrypted database at rest
- Encrypted backups
- Admin multi-factor authentication
- Role-based access control
- Audit logs for all changes
- No sensitive transaction data in application logs
- Confirmation before saving bot-created transactions
- Ability to lock daily close
- Manual correction requires reason
- Avoid delete; use cancel/reverse instead

## Should Have

- IP allowlisting for admin users
- Session timeout
- Suspicious activity alerts
- Data export permission control
- Backup restore test
- Separate staging and production environments

---

## 18. MVP Build Order

## Phase 1: Confirm Workflow

Duration: 3–5 days

Actions:

- Confirm real-world buy transaction examples
- Confirm real-world sell transaction examples
- Confirm settlement methods
- Confirm rate sheet format
- Confirm who needs access
- Confirm countries/currencies for MVP
- Confirm whether balances can be unpaid or partially paid

Output:

- Final transaction definitions
- Final message formats
- Final MVP rules

## Phase 2: Build Core Web Ledger

Duration: 2–3 weeks

Build:

- Auth
- Branches
- Wholesalers
- Buyers
- Rate sheets
- Manual buy transaction entry
- Manual sell transaction entry
- Settlement entry
- Transaction list
- Basic balances
- Daily close report
- Audit logs

Output:

- Web app usable without WhatsApp

## Phase 3: Add WhatsApp Bot

Duration: 1–2 weeks

Build:

- WhatsApp webhook
- Message parser
- Confirmation flow
- Pending transaction state
- `today`, `close`, `balance`, and `help` commands
- Bot-created transactions stored in the same ledger

Output:

- Agent can log transactions from WhatsApp

## Phase 4: Pilot

Duration: 4–6 weeks

Run with one real agent.

Track:

- Transactions per day
- Parsing success rate
- Manual corrections
- Daily close accuracy
- Time saved
- Agent trust
- Willingness to pay

Output:

- Decision to continue, pivot, or stop

---

## 19. Questions to Confirm Before Building

Ask the client:

1. Who exactly supplies the local cash: wholesalers, office staff, or both?
2. Does each wholesaler have a different buy rate?
3. Does each buyer have a different sell rate?
4. Are rates fixed for the day or negotiable per transaction?
5. Are buyers usually prepaid, postpaid, or mixed?
6. Are wholesalers usually paid immediately, later, or mixed?
7. Is USDT always treated as equal to USD?
8. Can partial settlements happen?
9. Can one transaction involve multiple currencies?
10. Who confirms that a local payout was actually completed?
11. Does the UAE office need to see all country offices?
12. Do local offices need restricted access?
13. Should the system support attachments, receipts, or photos?
14. Should a daily close be locked after review?
15. What reports are needed for the agent to trust the system?

---

## 20. First Development Tasks

## Backend

- [ ] Set up project repo
- [ ] Set up PostgreSQL
- [ ] Add Prisma or ORM
- [ ] Create initial schema
- [ ] Add seed data for one branch, one wholesaler, one buyer
- [ ] Build transaction calculation service
- [ ] Build balance service
- [ ] Build daily close service
- [ ] Build audit log service

## Frontend

- [ ] Set up login
- [ ] Build dashboard shell
- [ ] Build branches page
- [ ] Build wholesalers page
- [ ] Build buyers page
- [ ] Build rate sheet page
- [ ] Build transaction list
- [ ] Build buy transaction form
- [ ] Build sell transaction form
- [ ] Build settlement form
- [ ] Build daily close page

## Bot

- [ ] Create WhatsApp provider account
- [ ] Set up webhook
- [ ] Build command router
- [ ] Build strict parser
- [ ] Build confirmation state
- [ ] Connect confirmed bot transactions to ledger
- [ ] Add help command
- [ ] Add today command
- [ ] Add close command

## Security

- [ ] Add role-based permissions
- [ ] Add audit logs to all critical mutations
- [ ] Remove sensitive data from logs
- [ ] Add admin MFA
- [ ] Add daily backups
- [ ] Add production/staging separation

---

## 21. Recommended First Sprint

Sprint goal:

> Build a working web ledger for one branch with manual transaction entry and daily close.

Do not start with WhatsApp first.

## Sprint 1 Scope

- One branch: Addis Ababa
- One local currency: BIRR
- One settlement currency: USD
- Wholesaler create/list/detail
- Buyer create/list/detail
- Buy transaction form
- Sell transaction form
- Settlement form
- Daily close page
- Basic dashboard
- Audit log table

## Sprint 1 Demo

By the end of Sprint 1, you should be able to show:

1. Ahmed supplies 1,000 BIRR.
2. Agent owes Ahmed 10 USD.
3. BuyerY requests payout of 1,000 BIRR.
4. BuyerY owes agent 12 USD.
5. Daily close shows:
   - 0 BIRR remaining
   - 10 USD owed to Ahmed
   - 12 USD owed by BuyerY
   - 2 USD gross spread

---

## 22. Product Positioning

For MVP, describe the product as:

> A secure web-based ledger for currency agents, with WhatsApp-based transaction capture, daily reconciliation, and spread visibility.

Avoid positioning it as:

- A remittance platform
- A payment processor
- A money movement system
- A bank
- A crypto settlement system

The MVP should calculate and record. Humans still move the money.

---

## 23. Final Build Principle

Build the ledger first. Add messaging second.

The safest and most practical MVP is:

```text
Secure Web Ledger
+ Strict Transaction Model
+ Audit Trail
+ WhatsApp Bot Input
+ Confirmation Before Logging
```

The first milestone is not automation. The first milestone is trust:

> Can the agent trust the system's daily close more than their manual spreadsheet?
