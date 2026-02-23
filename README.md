# AXON PRIME - Risk Guard Pro

Professional SaaS platform for trader capital protection, drawdown control, and disciplined risk management.

This product is intentionally **not** a signal system and **not** a trading bot.

## MVP Scope (Implemented)

- Auth system with JWT, bcrypt hashing, email verification, and roles (`FREE`, `PRO`, `ELITE`)
- Stripe subscription flow (`PRO` $29/month, `ELITE` $49/month) with webhook sync
- Stripe flow hardened with server-side validation and sanitized billing errors
- Smart Position Size Calculator
- Daily Loss Guard (UTC-day lock trigger, journal write lock, event logging)
- Drawdown tracker (`SAFE`, `WARNING`, `CRITICAL`)
- Equity curve + drawdown visualization API
- Trade Journal CRUD with auto stats:
  - Win rate
  - Average R multiple
  - Profit factor
- Plan-gated advanced endpoints/panels placeholders (`PRO`, `ELITE`)

## Architecture

- `backend/` Node.js + Express + Prisma + PostgreSQL
- `frontend/` Next.js + Tailwind (dark navy financial dashboard UI)
- `docker-compose.yml` local PostgreSQL service

## Folder Structure

```text
.
├── backend
│   ├── prisma
│   │   └── schema.prisma
│   └── src
│       ├── config
│       ├── controllers
│       ├── middlewares
│       ├── routes
│       ├── services
│       ├── utils
│       └── validators
├── frontend
│   └── src
│       ├── app
│       ├── components
│       └── lib
├── docker-compose.yml
└── README.md
```

## 1) Prerequisites

- Node.js 20+
- npm 10+
- Docker (optional, for local PostgreSQL)

## 2) Start PostgreSQL

```bash
docker compose up -d
```

## 3) Backend Setup

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run dev
```

Backend runs at `http://localhost:4000`.

### Backend Environment Variables (`backend/.env`)

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `APP_URL`
- `API_URL`
- SMTP settings (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`)
- Stripe settings (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_ELITE`)
- `CORS_ORIGINS` (comma-separated allowlist)

If SMTP is not configured, verification links are logged in server stdout for local development.

## 4) Frontend Setup

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`.

## 5) Stripe Setup

1. Create two recurring monthly prices in Stripe:
   - Pro ($29/month)
   - Elite ($49/month)
2. Put their price IDs into backend env:
   - `STRIPE_PRICE_PRO`
   - `STRIPE_PRICE_ELITE`
3. Run Stripe webhook forwarding:

```bash
stripe listen --forward-to localhost:4000/api/subscriptions/webhook
```

4. Set `STRIPE_WEBHOOK_SECRET` from the CLI output.

## REST API Overview

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/verify-email?token=...`
- `GET /api/auth/me`

### Risk
- `POST /api/risk/position-size`
- `GET /api/risk/snapshot`
- `GET /api/risk/equity-curve`
- `PUT /api/risk/settings`

### Trade Journal
- `GET /api/trades`
- `POST /api/trades`
- `PUT /api/trades/:id`
- `DELETE /api/trades/:id`

### Subscriptions
- `GET /api/subscriptions`
- `POST /api/subscriptions/refresh`
- `POST /api/subscriptions/checkout`
- `POST /api/subscriptions/portal`
- `POST /api/subscriptions/webhook`

### Advanced (Plan Gated)
- `GET /api/analytics/heatmap` (`PRO`, `ELITE`)
- `GET /api/analytics/overtrading` (`PRO`, `ELITE`)

## Security Controls Included

- bcrypt password hashing
- JWT auth middleware
- input validation via Zod
- auth + API rate limiting
- helmet + CORS
- central error handling
- environment-based secret management

## Deployment Notes

- Deploy frontend and backend separately (Vercel + Render/Fly/Railway or equivalent)
- Use managed PostgreSQL in production
- Set strict CORS allowlist in backend for production domains
- Use secure SMTP provider for email verification
- Configure Stripe production keys and webhook endpoint

## MVP-to-Next Steps (Planned)

- Real risk heatmap engine
- Overtrading behavioral model
- Monte Carlo simulation module
- PDF export service
- Advanced performance analytics dashboard
