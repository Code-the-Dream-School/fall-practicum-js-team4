# Authentication — API Contract

How users sign in, how the backend knows who is calling, and exactly what the
frontend sends and receives. Frontend and backend both build against this
document; change it first if the contract needs to change.

## Decisions

| Topic                    | Decision                                                                                                                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sign-in methods          | Email + password only for the MVP. Third-party sign-in (e.g. Google) can be added after the MVP                                                                                                                                |
| Session mechanism        | A JWT stored in an **httpOnly cookie** named `token`                                                                                                                                                                           |
| Who is the current user  | The backend reads the cookie, verifies the JWT, and loads the user whose id is in the token's `sub` claim                                                                                                                      |
| Surviving a page refresh | The browser keeps the cookie (7-day lifetime) and sends it automatically. On app load the frontend calls `GET /api/auth/me` to find out who is signed in                                                                       |
| Session length           | 7 days, then the user signs in again. With "remember me" unchecked at login, the cookie is deleted when the browser closes. No refresh tokens in the MVP                                                                       |
| Sign out                 | `POST /api/auth/logout` clears the cookie                                                                                                                                                                                      |
| Changing the password    | `PATCH /api/auth/password`. Signs the user out on every other device; the current one gets a new cookie                                                                                                                        |
| Password storage         | Hashed with Node's built-in `scrypt` (OWASP minimum: N=2^17, r=8, p=1) and a random salt per user, stored as `scrypt$N$r$p$salt$hash`. Older hashes are upgraded on the next login. Plain passwords are never stored or logged |

### Why a cookie and not `localStorage`

The JWT never touches frontend JavaScript. An injected script cannot read an
httpOnly cookie, so it cannot steal the session. It also means the frontend has
no token to store, attach or refresh: the browser does it.

### Cookie settings

| Attribute  | Value                                                                                                                                   |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Name       | `token`                                                                                                                                 |
| `HttpOnly` | always                                                                                                                                  |
| `Secure`   | in production (`NODE_ENV=production`)                                                                                                   |
| `SameSite` | `Lax` by default; set `COOKIE_SAME_SITE=none` if the deployed frontend and backend are on different sites (this also requires `Secure`) |
| `Max-Age`  | 7 days; omitted when signing in with `rememberMe: false`, so the browser deletes the cookie when it closes                              |
| `Path`     | `/`                                                                                                                                     |

JWT payload: `{ "sub": "<user id>", "ver": 0, "rem": true, "iat": ..., "exp": ... }`, signed
with `JWT_SECRET` (HS256). It contains no personal data. `ver` must match the
user's `tokenVersion` in the database; changing the password increments it,
which invalidates every token issued before. `rem` is the "remember me" choice,
so the cookie reissued after a password change keeps the same lifetime. The
token itself always expires after 7 days.

## Frontend checklist

1. Send every API request with credentials, or the cookie is not sent:
   ```js
   fetch(`${API_URL}/api/auth/me`, { credentials: "include" });
   // axios: axios.create({ baseURL: API_URL, withCredentials: true })
   ```
2. Send bodies as JSON with `Content-Type: application/json`.
3. On app load, call `GET /api/auth/me`:
   - `200` → signed in; keep `data.user` in app state (e.g. an `AuthContext`).
   - `401` → signed out. This is the normal "not logged in" answer, not an error to display.
4. After register or login, use `data.user` from the response;
   there is no need to call `/me` again.
5. If any request returns `401 UNAUTHENTICATED`, the session expired: clear the
   user from state and send them to the login page.
6. Never try to read the `token` cookie; JavaScript can't see it by design.

## Response format

Every response uses the same envelope.

Success:

```json
{ "success": true, "data": { ... } }
```

Error:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Human-readable summary",
  "details": [
    { "field": "email", "message": "\"email\" must be a valid email" }
  ]
}
```

`code` is stable and meant for frontend logic; `message` may change and is meant
for display. `details` is only present on `VALIDATION_ERROR`.

### User object

Returned by every auth endpoint as `data.user`. It never includes the password
hash.

```json
{
  "id": "6f1c2b9e-1d2a-4c6e-9a51-3d8f0e2b7a10",
  "email": "sam@example.com",
  "name": "Sam Rivera",
  "createdAt": "2026-10-16T19:40:00.000Z"
}
```

## Endpoints

Base path: `/api/auth`.

| Method  | Path        | Auth required | Purpose                                              |
| ------- | ----------- | ------------- | ---------------------------------------------------- |
| `POST`  | `/register` | no            | Create an account with email + password, and sign in |
| `POST`  | `/login`    | no            | Sign in with email + password                        |
| `PATCH` | `/password` | yes           | Change the password                                  |
| `POST`  | `/logout`   | no            | Sign out                                             |
| `GET`   | `/me`       | yes           | Return the signed-in user                            |

### `POST /api/auth/register`

Request:

```json
{
  "name": "Sam Rivera",
  "email": "sam@example.com",
  "password": "correct-horse-1"
}
```

| Field      | Rules                                                       |
| ---------- | ----------------------------------------------------------- |
| `name`     | required, 1–60 characters after trimming                    |
| `email`    | required, valid email, max 254 characters; stored lowercase |
| `password` | required, 8–128 characters                                  |

Success: `201 Created`, sets the `token` cookie.

```json
{ "success": true, "data": { "user": { ...User } } }
```

Errors: `400 VALIDATION_ERROR`, `409 EMAIL_TAKEN`, `429 TOO_MANY_REQUESTS`.

### `POST /api/auth/login`

Request:

```json
{
  "email": "sam@example.com",
  "password": "correct-horse-1",
  "rememberMe": true
}
```

| Field        | Rules                                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `email`      | required, valid email                                                                                                          |
| `password`   | required, max 128 characters                                                                                                   |
| `rememberMe` | optional boolean, default `true`. `false` sets a browser-session cookie (no `Max-Age`) that is deleted when the browser closes |

Success: `200 OK`, sets the `token` cookie, same body as register.

Errors: `400 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS`, `429 TOO_MANY_REQUESTS`.

`INVALID_CREDENTIALS` is returned for both a wrong password and an unknown
email. The response deliberately doesn't say which, so
it can't be used to discover who has an account.

### `PATCH /api/auth/password`

Requires a signed-in user.

Request:

```json
{ "currentPassword": "correct-horse-1", "newPassword": "even-better-horse-2" }
```

| Field             | Rules                                                          |
| ----------------- | -------------------------------------------------------------- |
| `currentPassword` | required                                                       |
| `newPassword`     | required, 8–128 characters, must differ from `currentPassword` |

Success: `200 OK`, same body as register. It also **replaces** the `token` cookie:
every other device where this user is signed in gets `401 UNAUTHENTICATED` on
its next request, while this browser stays signed in.

Errors: `400 VALIDATION_ERROR`, `400 INVALID_CURRENT_PASSWORD`,
`401 UNAUTHENTICATED`, `429 TOO_MANY_REQUESTS` (shares the 20-attempt limit with
login).

A wrong current password is a `400`, not a `401`, on purpose: the frontend
treats `401` as "session expired", and a typo in this form must not sign the
user out. Show the message next to the "current password" field.

### `POST /api/auth/logout`

No request body. Always `200 OK`, even if no one was signed in, and clears the
`token` cookie.

```json
{ "success": true, "data": null }
```

### `GET /api/auth/me`

Success: `200 OK`

```json
{ "success": true, "data": { "user": { ...User } } }
```

Errors: `401 UNAUTHENTICATED` when the cookie is missing, invalid or expired, or
the user no longer exists.

## Protecting other routes

Backend routes that need a signed-in user use the `requireAuth` middleware. It
sets `req.user` (the same public user object) or responds with
`401 UNAUTHENTICATED`:

```ts
import requireAuth from "../middleware/requireAuth";

router.post("/", requireAuth, createReport); // req.user!.id is the owner
```

Checking that the user _owns_ a resource (e.g. editing a report) is the route's
job, and should answer `403 FORBIDDEN`.

## Error codes

| HTTP | `code`                     | When                                                                                                   |
| ---- | -------------------------- | ------------------------------------------------------------------------------------------------------ |
| 400  | `VALIDATION_ERROR`         | Missing/invalid fields, unknown fields, or a body that isn't valid JSON                                |
| 400  | `INVALID_CURRENT_PASSWORD` | Changing the password with a wrong current password                                                    |
| 401  | `INVALID_CREDENTIALS`      | Email/password login failed                                                                            |
| 401  | `UNAUTHENTICATED`          | Route needs a signed-in user and there isn't a valid session                                           |
| 403  | `FORBIDDEN`                | Signed in, but not allowed (reserved for other features)                                               |
| 404  | `NOT_FOUND`                | Unknown route                                                                                          |
| 409  | `EMAIL_TAKEN`              | Registering with an email that already has an account                                                  |
| 413  | `PAYLOAD_TOO_LARGE`        | Request body over 100 kB                                                                               |
| 415  | `UNSUPPORTED_MEDIA_TYPE`   | Request body in an unsupported charset                                                                 |
| 429  | `TOO_MANY_REQUESTS`        | More than 20 register/login/change-password attempts per IP in 15 minutes, or 100 requests of any kind |
| 500  | `INTERNAL_ERROR`           | Unexpected server error; details are logged on the server only                                         |

## Configuration

Backend `.env`:

| Variable           | Example                                                            | Notes                                                                                                |
| ------------------ | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`     | `postgresql://user:password@localhost:5432/pawradar?schema=public` | Used by Prisma                                                                                       |
| `JWT_SECRET`       | output of `openssl rand -hex 32`                                   | Required; the server refuses to issue tokens without it                                              |
| `CLIENT_URL`       | `http://localhost:5173`                                            | Frontend origin allowed by CORS (credentials enabled)                                                |
| `COOKIE_SAME_SITE` | `lax`                                                              | `lax` (default), `strict` or `none`                                                                  |
| `TRUST_PROXY`      | `1`                                                                | Number of proxies in front of the app when deployed (1 on Render, Railway, Fly). Leave unset locally |

## Known limitations (MVP)

- **Logout only signs out this browser.** It clears the cookie, but a copied
  token stays valid until it expires (at most 7 days). Changing the password
  is the way to invalidate every session; a "sign out everywhere" button can
  reuse the same `tokenVersion` mechanism later.
- **No "forgot password" reset or email verification.** Both need an email
  provider. Changing the password requires being signed in.
- **Emails are not verified,** so anyone can register with an address they
  don't own. Keep this in mind before adding third-party sign-in (e.g. Google):
  **never link a provider to an existing account just because the email
  matches.** Otherwise an attacker can pre-register the victim's email with
  their own password, and keep access after the victim signs in with Google
  ("account pre-hijacking"). When linking, either require the user to confirm
  the existing password first, or clear `passwordHash` and increment
  `tokenVersion` so only the provider can sign in afterwards.
