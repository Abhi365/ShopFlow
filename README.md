# ShopFlow

A full-stack e-commerce platform with authentication, product catalog, cart, checkout, and order management.

## Architecture

```
shopflow-app/
├── backend/          # Node.js + Express + TypeScript API
│   └── src/
│       ├── routes/       # Route handlers per domain
│       ├── controllers/  # Business logic per domain
│       ├── middleware/   # Auth, rate-limiting, error handling
│       ├── models/       # Mongoose models
│       └── services/     # External integrations (Stripe, OAuth)
└── frontend/         # React + TypeScript + Vite SPA
    └── src/
        ├── pages/        # Page components per domain
        ├── components/   # Shared UI components
        ├── api/          # Typed API client
        └── hooks/        # Custom React hooks
```

## Epics

| Epic | Key | Domain |
|------|-----|--------|
| Implement authentication to secure ShopFlow access | SFP-132 | Auth |
| Deliver authentication and product catalog capabilities | SFP-133 | Auth + Catalog |
| End-to-end commerce: auth, catalog, cart, checkout | SFP-134 | Full-stack |

## Prerequisites

- Node.js >= 18
- MongoDB >= 6
- Redis (for session/token store)

## Setup

### Backend

```bash
cd backend
npm install
cp .env.example .env    # fill in secrets
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

### Backend `.env`

```
PORT=4000
MONGO_URI=mongodb://localhost:27017/shopflow
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=<secret>
JWT_REFRESH_SECRET=<secret>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
GITHUB_CLIENT_ID=<id>
GITHUB_CLIENT_SECRET=<secret>
GOOGLE_CLIENT_ID=<id>
GOOGLE_CLIENT_SECRET=<secret>
STRIPE_SECRET_KEY=<key>
STRIPE_WEBHOOK_SECRET=<key>
GOOGLE_PLACES_API_KEY=<key>
SENDGRID_API_KEY=<key>
```

## API Domains

- `POST /api/auth/oauth/:provider` — OAuth 2.0 login (GitHub, Google)
- `POST /api/auth/refresh` — Rotate refresh token
- `POST /api/auth/logout` — Invalidate session
- `POST /api/auth/mfa/enroll` — TOTP MFA enrollment
- `GET  /api/catalog/products` — Search + faceted filter products
- `POST /api/catalog/products` — Create product (merchant)
- `GET  /api/catalog/products/:slug` — Product detail page data
- `GET  /api/cart` — Get current cart
- `POST /api/cart/items` — Add item to cart
- `POST /api/checkout` — Initiate checkout with Stripe Payment Intent
- `GET  /api/orders` — Merchant order list
- `POST /api/webhooks/stripe` — Stripe payment webhook

## Commit Convention

All commits reference SFP issue keys: `SFP-XXX: description`
This enables Dobby traceability from BRD → Story → Commit.
