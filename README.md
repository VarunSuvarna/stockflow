# StockFlow MVP

Phase 1 (backend): auth, tenant isolation, product CRUD, stock adjust.

## Run the server

```bash
cd server
npm install
cp .env.example .env        # then set JWT_SECRET to a long random string
npx prisma migrate dev --name init
npm run dev                 # http://localhost:3000
```

In a second terminal, with the server running:

```bash
cd server
npm run smoke               # end-to-end checks incl. cross-tenant attacks
```

## API (all except signup/login/health require the session cookie)

| Method | Route | Purpose |
|---|---|---|
| POST | /api/auth/signup | `{email, password, organizationName}` |
| POST | /api/auth/login | `{email, password}` |
| POST | /api/auth/logout | clears cookie |
| GET | /api/auth/me | current user + org |
| GET | /api/products?search= | list, with `isLowStock` + `effectiveThreshold` |
| POST | /api/products | create |
| GET | /api/products/:id | read one |
| PUT | /api/products/:id | update |
| DELETE | /api/products/:id | hard delete |
| POST | /api/products/:id/adjust | `{delta, note?}` |

## Rules to keep

1. `orgId` comes only from the JWT (`req.user.orgId`), never from the client.
2. Every product query includes `organizationId`.
3. Low-stock logic lives only in `src/lib/threshold.js`.
