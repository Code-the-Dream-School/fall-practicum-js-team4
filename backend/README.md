# Lost & Found Pets — Backend

Node.js + Express REST API for the Lost & Found Pets platform, written in
TypeScript. It handles user
accounts, authentication and pet reports today; photos, matching and analytics
will be added on the same structure.

- **Runtime:** Node.js 24 (see `.nvmrc`)
- **Language:** TypeScript (`strict`), compiled to `dist/` with `tsc`; `tsx` in development
- **Framework:** Express 4
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** email/password, with a JWT in an httpOnly cookie
- **Validation:** Joi
- **Docs:** Swagger UI generated from `docs/openapi.yaml`
- **Tests:** Jest (via `ts-jest`) + Supertest

## Getting started

```bash
cd backend
npm install            # also generates the Prisma client
cp .env.example .env   # then fill in the values below
npm run db:migrate     # create the tables in your local database
npm run dev            # http://localhost:8080 (runs the TypeScript directly with tsx)
```

For production: `npm run build` compiles `src/` to `dist/`, then `npm start`
runs `dist/server.js`.

Check it's running: http://localhost:8080 returns `Backend API is running`, and
the API docs are at http://localhost:8080/api/docs.

### Environment variables (`.env`)

| Variable           | Required | Description                                                                                                                           |
| ------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`     | yes      | PostgreSQL connection string (local or Neon, see [Database](#database))                                                               |
| `JWT_SECRET`       | yes      | Signs session tokens. Generate your own: `openssl rand -hex 32`                                                                       |
| `CLIENT_URL`       | no       | Frontend origin allowed to send the auth cookie. Default `http://localhost:5173`                                                      |
| `COOKIE_SAME_SITE` | no       | `lax` (default), `strict`, or `none` (needs HTTPS; for frontend and backend on different domains)                                     |
| `TRUST_PROXY`      | no       | When deployed: number of proxies in front of the app (`1` on Render, Railway, Fly) so rate limits apply per user. Leave unset locally |
| `PORT`             | no       | Default `8080`                                                                                                                        |
| `NODE_ENV`         | no       | `production` makes the cookie `Secure` (HTTPS only). Jest sets `test`, which disables rate limiting                                   |

`.env` is gitignored. Never commit it or paste its values into chat.

## Scripts

| Command                | What it does                                                                |
| ---------------------- | --------------------------------------------------------------------------- |
| `npm run dev`          | Start with auto-reload (`tsx watch`). Restart manually after `.env` changes |
| `npm run build`        | Compile `src/` to `dist/` (`tsconfig.build.json`)                           |
| `npm start`            | Run the compiled app (`dist/server.js`); run `npm run build` first          |
| `npm test`             | Run all tests                                                               |
| `npm run test:cov`     | Run tests and print a coverage table                                        |
| `npm run lint`         | ESLint                                                                      |
| `npm run typecheck`    | Type-check `src/`, `test/` and the Prisma config (no output)                |
| `npm run format`       | Format all files with Prettier                                              |
| `npm run format:check` | Fail if any file isn't formatted (for CI)                                   |
| `npm run db:migrate`   | Create and apply migrations, **local database only**                        |
| `npm run db:deploy`    | Apply committed migrations, safe for shared/production databases            |
| `npx prisma studio`    | Browse the database in the browser                                          |

Before opening a PR, run `npm run lint && npm run typecheck && npm run format:check && npm test`.

## Project structure

```text
backend/
├── docs/openapi.yaml        # API spec (Swagger UI at /api/docs)
├── prisma/
│   ├── schema.prisma        # database models
│   └── migrations/          # generated SQL, committed to git
├── src/
│   ├── server.ts            # loads .env and starts the server
│   ├── app.ts               # Express app: middleware, routes, error handling
│   ├── config/              # Prisma client, session/cookie settings
│   ├── routes/              # URL + HTTP method → middleware + controller
│   ├── controllers/         # read the request, call a service, send the response
│   ├── services/            # business logic and database access (Prisma)
│   ├── validators/          # Joi schemas for request bodies
│   ├── middleware/          # requireAuth, validate, notFound, errorHandler
│   ├── utils/               # AppError, asyncHandler, JWT, passwords
│   └── types/               # adds req.user to Express's Request type
├── test/                    # Jest + Supertest tests (helpers/: fake Prisma, shared types)
├── tsconfig.json            # type-checks everything (npm run typecheck)
└── tsconfig.build.json      # compiles src/ to dist/ (npm run build)
```

`server.ts` lives in `src/` so `dist/` keeps the same folder depth: compiled
files find `docs/openapi.yaml` with the same relative path as the source.

A request flows **route → middleware (auth, validation) → controller → service →
Prisma**. Keep database code in services, and HTTP details (status codes,
cookies) in controllers.

## Database

The schema lives in `prisma/schema.prisma`; tables are created by the migrations
in `prisma/migrations/`.

### Local PostgreSQL

Install PostgreSQL (e.g. `brew install postgresql`), then point `DATABASE_URL`
at a local database, e.g.
`postgresql://<your-mac-username>@localhost:5432/pawradar?schema=public`.
`npm run db:migrate` creates the database if it doesn't exist.

### Neon (shared hosted database)

1. Get access to the team's Neon project (ask the project owner), or create
   your own free project at [neon.tech](https://neon.tech).
2. In Neon click **Connect**, turn **Connection pooling off**, and copy the
   connection string into `DATABASE_URL`.
3. Run `npm run db:deploy` to apply the migrations.

> ⚠️ **Never run `npm run db:migrate` against Neon or any shared database.** If it
> finds differences it offers to reset the database, which deletes all data. Use
> `npm run db:deploy` there.

### Changing the schema

1. Edit `prisma/schema.prisma` (point `DATABASE_URL` at your **local** database).
2. `npm run db:migrate -- --name describe_the_change`. This creates a new folder
   in `prisma/migrations/` and applies it locally.
3. Commit the schema **and** the new migration folder together.
4. After the PR is merged, teammates run `npm run db:migrate` locally and
   someone runs `npm run db:deploy` against Neon.

Never edit a migration that's already been committed; create a new one instead.

## Authentication

Full contract (request/response formats, error codes, frontend checklist):
[`../docs/auth.md`](../docs/auth.md).

| Method  | Path                 | Auth | Purpose                                   |
| ------- | -------------------- | ---- | ----------------------------------------- |
| `POST`  | `/api/auth/register` | no   | Create an account and sign in             |
| `POST`  | `/api/auth/login`    | no   | Sign in with email + password             |
| `PATCH` | `/api/auth/password` | yes  | Change password (signs out other devices) |
| `POST`  | `/api/auth/logout`   | no   | Sign out                                  |
| `GET`   | `/api/auth/me`       | yes  | Current user, or `401` when signed out    |

How it works:

- Sign-in sets a JWT in an httpOnly cookie named `token` (7 days). The browser
  sends it automatically; frontend code never reads it.
- The token holds the user id and a `tokenVersion`. Changing the password
  increments the version, which invalidates every older token.
- Passwords are hashed with Node's built-in `scrypt` at OWASP's minimum cost
  (N=2^17, r=8, p=1); the settings are stored with each hash, and older hashes
  are upgraded automatically on the next successful login.
- Register, login and change-password are limited to 20 attempts per IP
  per 15 minutes; all routes together to 100.

### Protecting a route

```ts
import requireAuth from "../middleware/requireAuth";

router.post("/", requireAuth, validate(createReportSchema), asyncHandler(controller.create));
// In the controller: req.user!.id is the signed-in user (requireAuth ran first)
```

`requireAuth` answers `401 UNAUTHENTICATED` by itself. Checking that the user
owns a resource is your code's job; answer `403 FORBIDDEN` if they don't.

## Reports

Request and response formats: Swagger UI at `/api/docs` (`docs/openapi.yaml`).

| Method  | Path                | Auth | Purpose                                                   |
| ------- | ------------------- | ---- | --------------------------------------------------------- |
| `POST`  | `/api/reports`      | yes  | Create a lost or found report owned by the signed-in user |
| `GET`   | `/api/reports/mine` | yes  | The signed-in user's reports, newest first, with `total`  |
| `PATCH` | `/api/reports/:id`  | yes  | Update a report owned by the signed-in user               |

- The owner is always the signed-in user (`req.user.id`). Sending `userId`,
  `status` (on create), ids or timestamps in the body is a `400`.
- A user can have at most 100 reports (`403 REPORT_LIMIT_REACHED`).
- `GET /mine` isn't paginated. Optional `?search=` is a case-insensitive
  partial match on pet name, breed, color, distinctive features or city
  (`%` and `_` are matched literally). Unknown query parameters are a `400`.
- `GET /mine` is owner-only: it includes contact info, so it is sent with
  `Cache-Control: private, no-store`. A future public listing needs its own
  query that selects only public fields.
- `PATCH /:id` allows the owner to update any report field (including `status`
  between `ACTIVE` and `REUNITED`, and adding, updating or clearing `location`
  with `null`). Editing another user's report returns `403 FORBIDDEN`; a missing
  report returns `404 NOT_FOUND`.
- Photos aren't supported yet (`photos` in the body is a `400`); they will be
  uploaded as files in a separate story.

## API conventions

Every response uses the same envelope:

```json
{ "success": true, "data": { ... } }
{ "success": false, "code": "VALIDATION_ERROR", "message": "Invalid request data", "details": [ ... ] }
```

- `code` is stable and for frontend logic; `message` is for display.
- To fail a request, `throw new AppError(status, code, message)` (from
  `src/utils/AppError.ts`). The central `errorHandler` turns it into the error
  response. Client errors raised by Express itself keep their status (e.g.
  `413 PAYLOAD_TOO_LARGE` for a body over 100 kB). Any other error becomes a
  generic `500 INTERNAL_ERROR`; the details are logged on the server, never sent
  to the client.
- Wrap async controllers in `asyncHandler(...)`. Express 4 doesn't catch errors
  from async functions on its own.
- Validate every request body with a Joi schema and the `validate()` middleware.
  Unknown fields are rejected.
- Never return password hashes or other internal fields; send users through
  `toPublicUser()`.

### Adding an endpoint: checklist

1. **Validator** in `src/validators/` (Joi schema).
2. **Service** in `src/services/` (Prisma queries, business rules, `AppError`s).
3. **Controller** in `src/controllers/` (calls the service, sends the response).
4. **Route** in `src/routes/` with `requireAuth` if needed, `validate(schema)` and
   `asyncHandler(controller.fn)`; mount new routers in `src/app.ts`.
5. **Docs:** add the endpoint to `docs/openapi.yaml`, including a `429` response.
   `test/docs.test.ts` fails if an auth or reports route is missing or an
   operation has no `429`; add new routers to that test too.
6. **Tests** in `test/` for the success case and each error case.

## API docs and Postman

- **Swagger UI:** http://localhost:8080/api/docs (try requests in the browser).
- **Postman:** Import → Link → `http://localhost:8080/api/docs/openapi.json`.
  Postman stores the auth cookie after register/login and sends it with later
  requests automatically.

## Testing

```bash
npm test                      # all tests
npm run test:cov              # with coverage (writes coverage/, gitignored)
npx jest test/auth.test.ts    # one file
```

Tests need no database: Prisma is replaced by the typed in-memory fake in
`test/helpers/fakePrisma.ts`. Test files go in `test/` and end in `.test.ts`.

| To test…                         | Start from           |
| -------------------------------- | -------------------- |
| A simple endpoint                | `test/hello.test.ts` |
| Signed-in requests, database use | `test/auth.test.ts`  |
| A plain function                 | `test/jwt.test.ts`   |

`request.agent(app)` keeps cookies between requests, so you can register or log
in once and then call protected routes.

## Security checklist

Already in place: `helmet` security headers, CORS limited to `CLIENT_URL`,
rate limiting, httpOnly cookies, hashed passwords, validated input, generic
error messages, and `Cache-Control: private, no-store` on every signed-in
(`requireAuth`) response. When adding features:

- Treat every request body, query and URL param as untrusted. Validate it.
  Joi rejects unknown fields; never turn that off (`allowUnknown`/`.unknown()`),
  or clients could set fields like `userId` or `status` themselves.
- Protect any route that changes data with `requireAuth`, and check ownership.
  Take the owner from `req.user.id`, never from the body or query.
- User text (pet names, descriptions) is stored exactly as typed. The frontend
  must render it as text: `{report.petName}` in React is safe;
  `innerHTML` / `dangerouslySetInnerHTML` with user text is an XSS hole.
- Owner-only queries (e.g. `getUserReports`) return contact info and exact
  coordinates. Public endpoints need their own `select` of public fields.
- Keep secrets in `.env`, never in code.
- Don't log tokens, passwords or full request bodies.
