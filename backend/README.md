# Lost & Found Pets — Backend

Node.js + Express REST API for the Lost & Found Pets platform. It handles user
accounts, authentication, pet reports and report photos today; matching and
analytics will be added on the same structure.

- **Runtime:** Node.js 24 (see `.nvmrc`; `package.json` requires 24.22.1 or later)
- **Framework:** Express 4
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** email/password, with a JWT in an httpOnly cookie
- **Validation:** Joi
- **Photos:** `multer` (uploads), `sharp` (cleaning and resizing), Cloudinary
  (storage)
- **Docs:** Swagger UI generated from `docs/openapi.yaml`
- **Tests:** Jest + Supertest

## Getting started

```bash
cd backend
npm install            # also generates the Prisma client
cp .env.example .env   # then fill in the values below
npm run db:migrate     # create the tables in your local database
npm run dev            # http://localhost:8080
```

Check it's running: http://localhost:8080 returns `Backend API is running`, and
the API docs are at http://localhost:8080/api/docs.

### Environment variables (`.env`)

| Variable                | Required   | Description                                                                                                                           |
| ----------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | yes        | PostgreSQL connection string (local or Neon, see [Database](#database))                                                               |
| `JWT_SECRET`            | yes        | Signs session tokens. Generate your own: `openssl rand -hex 32`                                                                       |
| `CLIENT_URL`            | no         | Frontend origin allowed to send the auth cookie. Default `http://localhost:5173`                                                      |
| `COOKIE_SAME_SITE`      | no         | `lax` (default), `strict`, or `none` (needs HTTPS; for frontend and backend on different domains)                                     |
| `TRUST_PROXY`           | no         | When deployed: number of proxies in front of the app (`1` on Render, Railway, Fly) so rate limits apply per user. Leave unset locally |
| `CLOUDINARY_CLOUD_NAME` | for photos | From the Cloudinary dashboard (API Keys page). Only photo uploads need the three Cloudinary values                                    |
| `CLOUDINARY_API_KEY`    | for photos | Same page. Never commit it                                                                                                            |
| `CLOUDINARY_API_SECRET` | for photos | Same page. Never commit it or put it in frontend code                                                                                 |
| `PORT`                  | no         | Default `8080`                                                                                                                        |
| `NODE_ENV`              | no         | `production` makes the cookie `Secure` (HTTPS only). Jest sets `test`, which disables rate limiting                                   |

`.env` is gitignored. Never commit it or paste its values into chat. `MONGO_URI`
and `POSTGRES_URI` in `.env.example` are unused leftovers from the starter template.

## Scripts

| Command                | What it does                                                                   |
| ---------------------- | ------------------------------------------------------------------------------ |
| `npm run dev`          | Start with auto-reload (`node --watch`). Restart manually after `.env` changes |
| `npm start`            | Start without auto-reload                                                      |
| `npm test`             | Run all tests                                                                  |
| `npm run test:cov`     | Run tests and print a coverage table                                           |
| `npm run lint`         | ESLint                                                                         |
| `npm run typecheck`    | TypeScript type check (no build output)                                        |
| `npm run format`       | Format all files with Prettier                                                 |
| `npm run format:check` | Fail if any file isn't formatted (for CI)                                      |
| `npm run db:migrate`   | Create and apply migrations, **local database only**                           |
| `npm run db:deploy`    | Apply committed migrations, safe for shared/production databases               |
| `npx prisma studio`    | Browse the database in the browser                                             |

Before opening a PR, run `npm run lint && npm run typecheck && npm run format:check && npm test`.

## Project structure

```text
backend/
├── docs/openapi.yaml        # API spec (Swagger UI at /api/docs)
├── prisma/
│   ├── schema.prisma        # database models
│   └── migrations/          # generated SQL, committed to git
├── src/
│   ├── app.js               # Express app: middleware, routes, error handling
│   ├── config/              # Prisma client, session/cookie settings, Cloudinary
│   ├── routes/              # URL + HTTP method → middleware + controller
│   ├── controllers/         # read the request, call a service, send the response
│   ├── services/            # business logic, database access (Prisma), photo storage
│   ├── validators/          # Joi schemas for request bodies and query strings
│   ├── middleware/          # requireAuth, validate, photoUpload, notFound, errorHandler
│   └── utils/               # AppError, asyncHandler, JWT, passwords
├── test/                    # Jest + Supertest tests
└── server.js                # loads .env and starts the server
```

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

```js
const requireAuth = require("../middleware/requireAuth");

router.post("/", requireAuth, validate(createReportSchema), asyncHandler(controller.create));
// In the controller: req.user.id is the signed-in user
```

`requireAuth` answers `401 UNAUTHENTICATED` by itself. Checking that the user
owns a resource is your code's job; answer `403 FORBIDDEN` if they don't.

## Reports

Request and response formats: Swagger UI at `/api/docs` (`docs/openapi.yaml`).

| Method | Path                | Auth | Purpose                                                   |
| ------ | ------------------- | ---- | --------------------------------------------------------- |
| `POST` | `/api/reports`      | yes  | Create a lost or found report owned by the signed-in user |
| `GET`  | `/api/reports/mine` | yes  | The signed-in user's reports, newest first, with `total`  |

- The owner is always the signed-in user (`req.user.id`). Sending `userId`,
  `status`, ids or timestamps in the body is a `400`.
- A user can have at most 100 reports (`403 REPORT_LIMIT_REACHED`).
- `GET /mine` isn't paginated. Optional `?search=` is a case-insensitive
  partial match on pet name, breed, color, distinctive features or city
  (`%` and `_` are matched literally). Unknown query parameters are a `400`.
- `GET /mine` is owner-only: it includes contact info, so it is sent with
  `Cache-Control: private, no-store`. A future public listing needs its own
  query that selects only public fields.
- Photos are uploaded as files with `multipart/form-data` (see below). Photo
  URLs in a JSON body are a `400`. Reports return
  `photos: [{ petPhotoId, imageUrl, createdAt }]`; Cloudinary's `publicId` is
  stored but never sent.

### Photos

`POST /api/reports` accepts up to 5 photos when sent as `multipart/form-data`:
a `report` field with the report as JSON text, plus `photos` files.

```js
// Frontend
const form = new FormData();
form.append("report", JSON.stringify(report));
for (const file of fileInput.files) form.append("photos", file);
await fetch(`${API_URL}/api/reports`, { method: "POST", body: form, credentials: "include" });
// Don't set Content-Type yourself: the browser adds the multipart boundary
```

```bash
# curl (with a saved session cookie)
curl -b cookies.txt -F 'report={"reportType":"LOST","petType":"DOG","color":"Golden","size":"LARGE","gender":"MALE","eventDate":"2026-10-20"}' \
  -F photos=@milo.jpg -F photos=@milo2.png http://localhost:8080/api/reports
```

How it works (`src/middleware/photoUpload.js`, `src/services/photo.service.js`):

1. `multer` keeps files in memory: at most 5, 5 MB each.
2. `sharp` checks each file really is a JPEG, PNG or WebP (from its contents, not
   the name), applies the phone's rotation, **removes all metadata including GPS
   location**, resizes to at most 1600 px and converts to WebP.
3. The images go to Cloudinary (`pawradar/reports` folder). The report and its
   photos (`imageUrl` plus Cloudinary's `publicId`) are saved together.
4. If an upload or the database save fails, photos already uploaded for that
   request are deleted from Cloudinary, so nothing is left behind.

Use `accept="image/jpeg,image/png,image/webp"` on the file input: iPhones then
send JPEG instead of HEIC, which the server can't read. Tests mock Cloudinary,
so `npm test` needs no Cloudinary account.

## API conventions

Every response uses the same envelope:

```json
{ "success": true, "data": { ... } }
{ "success": false, "code": "VALIDATION_ERROR", "message": "Invalid request data", "details": [ ... ] }
```

- `code` is stable and for frontend logic; `message` is for display.
- To fail a request, `throw new AppError(status, code, message)` (from
  `src/utils/AppError.js`). The central `errorHandler` turns it into the error
  response. Client errors raised by Express itself keep their status (e.g.
  `413 PAYLOAD_TOO_LARGE` for a body over 100 kB). Any other error becomes a
  generic `500 INTERNAL_ERROR`; the details are logged on the server, never sent
  to the client.
- Wrap async controllers in `asyncHandler(...)`. Express 4 doesn't catch errors
  from async functions on its own.
- Validate every request body with a Joi schema and the `validate()` middleware,
  and query strings with `validate(schema, "query")`. Unknown fields are rejected.
- Never return password hashes or other internal fields; send users through
  `toPublicUser()`.

### Adding an endpoint: checklist

1. **Validator** in `src/validators/` (Joi schema).
2. **Service** in `src/services/` (Prisma queries, business rules, `AppError`s).
3. **Controller** in `src/controllers/` (calls the service, sends the response).
4. **Route** in `src/routes/` with `requireAuth` if needed, `validate(schema)` and
   `asyncHandler(controller.fn)`; mount new routers in `src/app.js`.
5. **Docs:** add the endpoint to `docs/openapi.yaml`, including a `429` response
   (the global rate limit applies everywhere). `test/docs.test.js` fails if an
   auth or reports route is missing or an operation has no `429`; add new
   routers to that test too.
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
npx jest test/auth.test.js    # one file
```

Tests need no database: Prisma is replaced by an in-memory fake. Test files go in `test/` and end in
`.test.js`.

| To test…                         | Start from                  |
| -------------------------------- | --------------------------- |
| A simple endpoint                | `test/hello.test.js`        |
| Signed-in requests, database use | `test/auth.test.js`         |
| A plain function                 | `test/jwt.test.js`          |
| File uploads, a mocked service   | `test/reportPhotos.test.js` |

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
- Uploaded files are untrusted too: photos are checked by content, size and
  count, then re-encoded so no metadata (e.g. GPS location) is stored.
- Keep secrets in `.env`, never in code. The Cloudinary API secret must never
  reach frontend code.
- Don't log tokens, passwords or full request bodies.
