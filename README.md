# StockFlow

A multi-tenant inventory management app for small businesses. Each business gets its own organization, tracks its products and stock levels, and sees at a glance what is running low.

Built with **React + Vite + Tailwind** on the front end and **Express + Prisma + PostgreSQL** on the back end. Auth uses JWTs stored in an httpOnly cookie.

**Live demo:** <https://stockflow-client-7kkz.onrender.com>

> Hosted on Render's free plan, so the first request after a period of inactivity can take up to a minute while the server wakes up.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Available scripts](#available-scripts)
- [API reference](#api-reference)
- [Data model](#data-model)
- [How low stock is calculated](#how-low-stock-is-calculated)
- [Security and tenant isolation](#security-and-tenant-isolation)
- [Testing](#testing)
- [Deployment (Render)](#deployment-render)
- [Known limitations](#known-limitations)
- [Roadmap](#roadmap)

---

## Features

- **Sign up / log in / log out.** Signing up creates an organization and its first user in one transaction. Sessions last 7 days.
- **Multi-tenant by design.** Every organization sees only its own data. One org can never read, edit, adjust or delete another org's products, even if it guesses an ID.
- **Product management.** Create, edit, search (by name or SKU) and delete products. Fields: name, SKU, description, quantity, cost price, selling price, and an optional per-product low-stock threshold.
- **SKU is unique per organization**, not globally, so two businesses can use the same SKU.
- **Stock adjustments.** Add or remove stock with a `+/-` delta. Adjustments are atomic and can never take quantity below zero.
- **Low-stock alerts.** Products are tagged **OK**, **Low stock** or **Out of stock** in the list.
- **Dashboard.** Total products, total units on hand, low-stock count, and a low-stock table sorted by quantity (lowest first).
- **Settings.** Set the organization-wide default low-stock threshold.
- **Clear validation errors.** The API returns per-field error messages, and the UI shows them next to the right input.

## Tech stack

| Layer | Technology |
|---|---|
| Front end | React 19, React Router 6, Vite 6, Tailwind CSS 4 |
| Back end | Node.js, Express 4, Zod 4 (validation) |
| Database | PostgreSQL, Prisma ORM 6 |
| Auth | JSON Web Tokens in an httpOnly cookie, bcrypt password hashing |
| Hosting | Render (web service + static site + managed PostgreSQL) |

## Project structure

```
stockflow/
├── render.yaml                  # Render Blueprint (server, client, database)
├── client/                      # React front end
│   ├── index.html
│   ├── vite.config.js           # dev proxy: /api -> http://localhost:3000
│   └── src/
│       ├── api.js               # fetch wrapper (sends cookies, parses errors)
│       ├── App.jsx              # routes
│       ├── ui.js                # shared Tailwind class strings
│       ├── auth/                # AuthContext, ProtectedRoute
│       ├── components/          # Layout, dialogs, form fields
│       └── pages/               # Dashboard, Products, ProductForm, Settings, Login, Signup
└── server/                      # Express API
    ├── .env.example
    ├── prisma/
    │   ├── schema.prisma        # data model
    │   ├── migrations/
    │   └── seed.js              # demo account + sample products
    ├── scripts/
    │   └── smoke.mjs            # end-to-end API test
    └── src/
        ├── index.js             # app entry point
        ├── config.js            # env vars (fails fast if missing)
        ├── db.js                # Prisma client
        ├── middleware/          # requireAuth, error handler
        ├── routes/              # auth, products, dashboard, settings
        └── lib/                 # threshold logic, dashboard builder, asyncHandler
```

## Getting started

### Prerequisites

- **Node.js 20.6 or newer** (the dev scripts use `node --env-file`)
- **PostgreSQL 14+**, running locally or hosted (e.g. Render, Neon, Supabase, or Docker)

If you don't have PostgreSQL installed, you can start one with Docker:

```bash
docker run --name stockflow-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=stockflow -p 5432:5432 -d postgres:16
```

### 1. Clone the repository

```bash
git clone https://github.com/VarunSuvarna/stockflow.git
cd stockflow
```

### 2. Set up the server

```bash
cd server
npm install
cp .env.example .env
```

Edit `server/.env` and set at least:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stockflow"
JWT_SECRET="a-long-random-string"
```

> Generate a strong secret with:
> `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

Then create the database tables and start the API:

```bash
npx prisma migrate dev      # applies migrations and generates the Prisma client
npm run db:seed             # optional: loads demo data
npm run dev                 # http://localhost:3000
```

Check it's running: open <http://localhost:3000/api/health>. You should see `{"ok":true}`.

### 3. Set up the client

In a second terminal:

```bash
cd client
npm install
npm run dev                 # http://localhost:5173
```

In development, Vite forwards every `/api` request to `http://localhost:3000`, so you don't need to set any client environment variables.

### 4. Log in

Open <http://localhost:5173> and either sign up for a new organization or use the demo account (after running the seed):

| Email | Password |
|---|---|
| `demo@stockflow.test` | `demo12345` |

The demo store has 10 sample products, several of them low on stock or out of stock. The seed is safe to re-run; it rebuilds the demo organization each time.

## Environment variables

### Server (`server/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | Yes | — | Secret used to sign session tokens. Use a long random string. |
| `CLIENT_URL` | No | `http://localhost:5173` | Front-end origin allowed by CORS. Must match the deployed client URL exactly. |
| `PORT` | No | `3000` | Port the API listens on |
| `NODE_ENV` | No | — | Set to `production` to enable secure, cross-site (`SameSite=None`) cookies |

The server refuses to start if `DATABASE_URL` or `JWT_SECRET` is missing.

### Client

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Production only | Full URL of the API, e.g. `https://stockflow-server.onrender.com`. Leave unset in development to use the Vite proxy. |

## Available scripts

### Server (`cd server`)

| Command | What it does |
|---|---|
| `npm run dev` | Start the API with auto-restart on file changes |
| `npm start` | Start the API (production) |
| `npm run db:migrate` | Create/apply a migration (`prisma migrate dev`) |
| `npm run db:studio` | Open Prisma Studio to browse the database |
| `npm run db:seed` | Load the demo account and sample products |
| `npm run smoke` | Run the end-to-end API test (server must be running) |

### Client (`cd client`)

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server on port 5173 |
| `npm run build` | Build for production into `client/dist` |
| `npm run preview` | Preview the production build locally |

## API reference

Base path: `/api`. All requests and responses are JSON. Every endpoint except `health`, `signup`, `login` and `logout` requires the session cookie set by signup or login.

### Auth

| Method | Route | Body | Response |
|---|---|---|---|
| `POST` | `/auth/signup` | `{ email, password, organizationName }` | `201` `{ user, organization }` + cookie |
| `POST` | `/auth/login` | `{ email, password }` | `200` `{ user, organization }` + cookie |
| `POST` | `/auth/logout` | — | `200` `{ ok: true }`, clears cookie |
| `GET` | `/auth/me` | — | `200` `{ user, organization }` |

Passwords must be at least 8 characters. Emails are trimmed and lower-cased.

### Products

| Method | Route | Body | Response |
|---|---|---|---|
| `GET` | `/products?search=` | — | `200` `{ products: [...] }` sorted by name |
| `POST` | `/products` | product fields | `201` `{ product }` |
| `GET` | `/products/:id` | — | `200` `{ product }` |
| `PUT` | `/products/:id` | product fields | `200` `{ product }` |
| `DELETE` | `/products/:id` | — | `204` (permanent delete) |
| `POST` | `/products/:id/adjust` | `{ delta, note? }` | `200` `{ product }` |

**Product fields**

| Field | Type | Rules |
|---|---|---|
| `name` | string | Required, max 200 characters |
| `sku` | string | Required, max 64 characters, unique within the organization |
| `description` | string \| null | Optional, max 1000 characters |
| `quantityOnHand` | integer | 0 or more, defaults to 0 |
| `costPrice` | number \| null | Optional, 0 or more |
| `sellingPrice` | number \| null | Optional, 0 or more |
| `lowStockThreshold` | integer \| null | Optional. Leave empty to use the organization default. |

Every product returned by the API also includes two computed fields: `effectiveThreshold` and `isLowStock`.

**Adjusting stock:** `delta` is a non-zero whole number (`5` adds 5 units, `-3` removes 3). If the result would go below zero, the API returns `400 Insufficient stock` and nothing changes.

### Dashboard and settings

| Method | Route | Body | Response |
|---|---|---|---|
| `GET` | `/dashboard` | — | `{ totalProducts, totalUnits, lowStockCount, lowStock: [{ id, name, sku, quantityOnHand, lowStockThreshold }] }` |
| `GET` | `/settings` | — | `{ defaultLowStockThreshold }` |
| `PUT` | `/settings` | `{ defaultLowStockThreshold }` | `{ defaultLowStockThreshold }` |
| `GET` | `/health` | — | `{ ok: true }` (no auth) |

### Errors

Errors always have this shape:

```json
{ "error": "Validation failed", "details": { "sku": ["SKU is required"] } }
```

| Status | When |
|---|---|
| `400` | Validation failed, invalid JSON, or insufficient stock |
| `401` | Not logged in, expired session, or wrong email/password |
| `404` | Resource not found, **or it belongs to another organization** |
| `409` | Duplicate SKU in the organization, or email already registered |
| `500` | Unexpected server error |

### Example with curl

```bash
# Sign up and save the session cookie
curl -c cookies.txt -H "Content-Type: application/json" \
  -d '{"email":"me@shop.com","password":"password123","organizationName":"My Shop"}' \
  http://localhost:3000/api/auth/signup

# Create a product
curl -b cookies.txt -H "Content-Type: application/json" \
  -d '{"name":"Widget","sku":"WID-001","quantityOnHand":10}' \
  http://localhost:3000/api/products

# Remove 3 units
curl -b cookies.txt -H "Content-Type: application/json" \
  -d '{"delta":-3}' \
  http://localhost:3000/api/products/<product-id>/adjust
```

## Data model

```
Organization 1 ──< User
     │
     └──────────< Product
```

| Model | Key fields |
|---|---|
| **Organization** | `name`, `defaultLowStockThreshold` (default `5`) |
| **User** | `email` (globally unique), `passwordHash`, `organizationId` |
| **Product** | `name`, `sku`, `description`, `quantityOnHand`, `costPrice`, `sellingPrice`, `lowStockThreshold`, `lastUpdatedBy`, timestamps |

- `(organizationId, sku)` is unique, so SKUs only need to be unique within one organization.
- Deleting an organization cascades to its users and products.

See [server/prisma/schema.prisma](server/prisma/schema.prisma) for the full schema.

## How low stock is calculated

```
effectiveThreshold = product.lowStockThreshold ?? organization.defaultLowStockThreshold
isLowStock         = quantityOnHand <= effectiveThreshold
```

The boundary is included: a product with 5 units and a threshold of 5 counts as low stock. A product with 0 units is shown as **Out of stock** in the UI.

This logic lives in one place, [server/src/lib/threshold.js](server/src/lib/threshold.js). The product list and the dashboard both use it, so they always agree.

## Security and tenant isolation

These rules keep one organization's data away from another. Keep them when you change the code:

1. **`orgId` comes only from the verified JWT** (`req.user.orgId`), never from the request body, query or URL.
2. **Every product query filters by `organizationId`.** Updates and deletes use `updateMany` / `deleteMany` with `{ id, organizationId }`, so a guessed ID from another org matches nothing and returns `404`.
3. **Low-stock logic lives only in `src/lib/threshold.js`.**

Other measures:

- Passwords are hashed with bcrypt (10 rounds).
- Session cookies are `httpOnly`; in production they are also `Secure` and `SameSite=None`.
- Login returns the same error for an unknown email and a wrong password, so attackers can't probe which emails are registered.
- CORS accepts only `CLIENT_URL`, with credentials.
- Stock adjustments run as a single conditional `UPDATE`, so two adjustments at the same time can't push quantity below zero.

## Testing

The project ships with an end-to-end smoke test that hits the real API with Node's built-in `fetch`. It needs no extra dependencies.

```bash
# terminal 1
cd server && npm run dev

# terminal 2
cd server && npm run smoke
```

It runs nearly 50 checks, including:

- signup, login, logout, duplicate email, wrong password
- product create / read / update / delete, validation errors, duplicate SKU
- the same SKU allowed across different organizations
- **cross-tenant attacks**: org B trying to read, edit, adjust and delete org A's products
- stock adjustments, including going below zero
- low-stock boundaries, dashboard totals and settings

To run it against another server, set `API_URL`:

```bash
API_URL=https://your-api.onrender.com npm run smoke
```

The script exits with a non-zero code if any check fails, so you can use it in CI.

## Deployment (Render)

The repository includes a [render.yaml](render.yaml) Blueprint that creates three resources:

| Resource | Type | Notes |
|---|---|---|
| `stockflow-db` | PostgreSQL (free plan) | Connection string is passed to the server automatically |
| `stockflow-server` | Node web service | Runs `prisma migrate deploy` on every build; `JWT_SECRET` is generated for you |
| `stockflow-client` | Static site | Built with Vite; all paths rewrite to `index.html` for client-side routing |

**Steps**

1. Push the repository to GitHub.
2. In Render, choose **New → Blueprint** and select the repository.
3. After the first deploy, fill in the two variables marked `sync: false`:
   - On **stockflow-server**: set `CLIENT_URL` to the client's URL, e.g. `https://stockflow-client.onrender.com` (no trailing slash).
   - On **stockflow-client**: set `VITE_API_URL` to the server's URL, e.g. `https://stockflow-server.onrender.com`.
4. Redeploy both services. The client must be **rebuilt** after `VITE_API_URL` changes, because Vite bakes it in at build time.
5. Optional: seed demo data from the server's Render shell with `node prisma/seed.js`.

**Troubleshooting**

| Symptom | Likely cause |
|---|---|
| Login works but you're logged out straight away | `NODE_ENV` isn't `production`, so the cookie isn't `SameSite=None; Secure` |
| CORS error in the browser console | `CLIENT_URL` doesn't exactly match the client origin |
| Requests go to the client's own domain and return HTML | `VITE_API_URL` wasn't set before the client was built |
| First request is slow | Render's free plan puts services to sleep when idle |
| Logged out in Safari or with strict privacy settings | Some browsers block third-party cookies. Serve client and API from the same site (e.g. a custom domain and subdomain) to avoid this. |

## Known limitations

- **No stock movement history.** The `note` on stock adjustments is validated but not stored.
- **One user per organization.** There's no invite flow or roles yet.
- **Search is case-sensitive on PostgreSQL.** Prisma's `contains` needs `mode: 'insensitive'` for case-insensitive matching (see [server/src/routes/products.js](server/src/routes/products.js)).
- **Prices are stored as `Float`.** Fine for display, but switch to `Decimal` before doing accounting.
- **Hard deletes.** Deleted products can't be recovered.
- **No password reset or email verification.**

## Roadmap

- Stock movement history (audit log of every adjustment, with note and user)
- Invite teammates and role-based access
- Case-insensitive search and pagination
- CSV import / export
- Low-stock email notifications
- Automated unit tests for `threshold.js` and `dashboard.js`
