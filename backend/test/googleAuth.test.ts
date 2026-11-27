import crypto from "crypto";
import request from "supertest";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import app from "../src/app";
import type { FakePrisma } from "./helpers/fakePrisma";
import { getTokenCookie } from "./helpers/types";

process.env.JWT_SECRET = "test-secret";
const CLIENT_ID = "test-client.apps.googleusercontent.com";

// In-memory database (see test/helpers/fakePrisma.ts)
jest.mock("../src/config/prisma", () =>
  jest
    .requireActual<typeof import("./helpers/fakePrisma")>("./helpers/fakePrisma")
    .createFakePrisma(),
);
const prisma = jest.requireMock<FakePrisma>("../src/config/prisma");

// A key pair standing in for Google's. Tokens are signed with the private key,
// and the library gets the public key instead of downloading Google's, so its
// real signature, issuer, audience and expiry checks run in these tests.
const KID = "test-key";
const keyPair = () =>
  crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
const googleKeys = keyPair();
const certsSpy = jest.spyOn(OAuth2Client.prototype, "getFederatedSignonCertsAsync");

// Claims of a valid Google ID token for our app
interface Claims {
  iss?: string;
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  iat?: number;
  exp?: number;
}

const now = () => Math.floor(Date.now() / 1000);

const googleToken = (
  claims: Claims = {},
  { key = googleKeys.privateKey, kid = KID }: { key?: string; kid?: string } = {},
) =>
  jwt.sign(
    {
      iss: "https://accounts.google.com",
      aud: CLIENT_ID,
      sub: "google-sam",
      email: "sam@gmail.com",
      email_verified: true,
      name: "Sam Rivera",
      iat: now(),
      exp: now() + 3600,
      ...claims,
    },
    key,
    { algorithm: "RS256", keyid: kid },
  );

const googleLogin = (body: object, agent = request(app)) =>
  agent.post("/api/auth/google").send(body);

const register = (email = "sam@gmail.com", agent = request(app)) =>
  agent.post("/api/auth/register").send({ name: "Sam Rivera", email, password: "correct-horse-1" });

const link = (agent: ReturnType<typeof request.agent>, body: object) =>
  agent.post("/api/auth/google/link").send(body);

beforeEach(() => {
  prisma._users.length = 0;
  jest.clearAllMocks();
  process.env.GOOGLE_CLIENT_ID = CLIENT_ID;
  certsSpy.mockResolvedValue({
    certs: { [KID]: googleKeys.publicKey },
    format: "PEM",
  } as unknown as Awaited<ReturnType<OAuth2Client["getFederatedSignonCertsAsync"]>>);
});

describe("POST /api/auth/google", () => {
  it("creates an account on first sign-in, with no password, and starts a session", async () => {
    const agent = request.agent(app);
    const res = await googleLogin({ credential: googleToken({ email: "Sam@Gmail.com" }) }, agent);

    expect(res.status).toBe(201);
    expect(res.body.data.user).toEqual({
      id: expect.any(String),
      email: "sam@gmail.com",
      name: "Sam Rivera",
      createdAt: expect.any(String),
    });
    expect(getTokenCookie(res)).toMatch(/HttpOnly/);
    expect(getTokenCookie(res)).toMatch(/Max-Age=604800/);
    expect(prisma._users).toEqual([
      expect.objectContaining({
        email: "sam@gmail.com",
        googleId: "google-sam",
        passwordHash: null,
      }),
    ]);

    // The cookie is a normal session
    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.data.user.id).toBe(res.body.data.user.id);
  });

  it("signs in to the same account next time, without creating another", async () => {
    const first = await googleLogin({ credential: googleToken() });
    const second = await googleLogin({ credential: googleToken() });

    expect(second.status).toBe(200);
    expect(second.body.data.user.id).toBe(first.body.data.user.id);
    expect(prisma._users).toHaveLength(1);
  });

  it("finds the account by Google's id, even after the Google email changes", async () => {
    const first = await googleLogin({ credential: googleToken() });
    const res = await googleLogin({ credential: googleToken({ email: "sam.new@gmail.com" }) });

    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(first.body.data.user.id);
  });

  it("creates one account when the same new user signs in twice at once", async () => {
    const [a, b] = await Promise.all([
      googleLogin({ credential: googleToken() }),
      googleLogin({ credential: googleToken() }),
    ]);

    expect([a.status, b.status].sort()).toEqual([200, 201]);
    expect(a.body.data.user.id).toBe(b.body.data.user.id);
    expect(prisma._users).toHaveLength(1);
  });

  it("with rememberMe: false, sets a cookie that ends with the browser session", async () => {
    const res = await googleLogin({ credential: googleToken(), rememberMe: false });

    expect(res.status).toBe(201);
    expect(getTokenCookie(res)).not.toMatch(/Max-Age/);
  });

  it("falls back to the email's name part when Google sends no name, and caps long names", async () => {
    await googleLogin({
      credential: googleToken({ name: undefined, sub: "a", email: "kim@gmail.com" }),
    });
    await googleLogin({
      credential: googleToken({ name: "x".repeat(100), sub: "b", email: "b@gmail.com" }),
    });

    expect(prisma._users.map((u) => u.name)).toEqual(["kim", "x".repeat(60)]);
  });

  describe("an account with the same email already exists", () => {
    it("doesn't link it or create a second account (signed up with a gmail password first)", async () => {
      await register("Sam@Gmail.com");

      const res = await googleLogin({ credential: googleToken() });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("GOOGLE_ACCOUNT_NOT_LINKED");
      expect(getTokenCookie(res)).toBeUndefined();
      expect(prisma._users).toHaveLength(1);
      expect(prisma._users[0].googleId).toBeNull();
    });

    it("keeps someone who registered another person's email from getting their Google sign-ins", async () => {
      // An attacker registers the victim's address with a password they know
      await register("victim@gmail.com");

      // The real owner later signs in with Google: they must not end up in the
      // attacker's account (which the attacker could still open with the password)
      const res = await googleLogin({
        credential: googleToken({ sub: "google-victim", email: "victim@gmail.com" }),
      });

      expect(res.status).toBe(409);
      expect(prisma._users[0].googleId).toBeNull();
    });

    it("doesn't take over an account that's linked to a different Google account", async () => {
      await googleLogin({ credential: googleToken() });

      const res = await googleLogin({ credential: googleToken({ sub: "someone-else" }) });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("GOOGLE_ACCOUNT_NOT_LINKED");
      expect(prisma._users).toHaveLength(1);
    });
  });

  describe("a Google-only account can't be opened with a password", () => {
    beforeEach(async () => {
      await googleLogin({ credential: googleToken() });
    });

    it("rejects password login the same way as a wrong password", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "sam@gmail.com", password: "anything-at-all" });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("INVALID_CREDENTIALS");
    });

    it("doesn't let anyone register a password account with the same email", async () => {
      const res = await register("sam@gmail.com");

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("EMAIL_TAKEN");
      expect(prisma._users).toHaveLength(1);
    });

    it("doesn't let the signed-in user add a password", async () => {
      const agent = request.agent(app);
      await googleLogin({ credential: googleToken() }, agent);

      const res = await agent
        .patch("/api/auth/password")
        .send({ currentPassword: "guess-guess", newPassword: "new-password-1" });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("NO_PASSWORD");
      expect(prisma._users[0].passwordHash).toBeNull();
    });
  });

  describe("rejected Google credentials", () => {
    let warn: jest.SpyInstance;
    beforeEach(() => {
      warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    });
    afterEach(() => warn.mockRestore());

    const otherKeys = keyPair();

    it.each([
      [
        "issued to another app (wrong audience)",
        googleToken({ aud: "other-app.apps.googleusercontent.com" }),
      ],
      ["not issued by Google", googleToken({ iss: "https://evil.example.com" })],
      // In the library's default list, but never an ID token issuer
      ["issued by googleapis.com", googleToken({ iss: "googleapis.com" })],
      ["signed with a different key", googleToken({}, { key: otherKeys.privateKey })],
      ["signed with a key Google doesn't have", googleToken({}, { kid: "unknown-key" })],
      ["issued in the future", googleToken({ iat: now() + 3600, exp: now() + 7200 })],
      ["valid for too long", googleToken({ exp: now() + 3 * 24 * 3600 })],
      ["missing the account id", googleToken({ sub: undefined })],
      ["missing the email", googleToken({ email: undefined })],
    ])("returns 401 GOOGLE_AUTH_FAILED for a token %s", async (_case, credential) => {
      const res = await googleLogin({ credential });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("GOOGLE_AUTH_FAILED");
      expect(getTokenCookie(res)).toBeUndefined();
      expect(prisma._users).toHaveLength(0);
    });

    it("rejects a token whose contents were changed after signing", async () => {
      const [header, , signature] = googleToken().split(".");
      const payload = Buffer.from(
        JSON.stringify({
          iss: "https://accounts.google.com",
          aud: CLIENT_ID,
          sub: "attacker",
          email: "sam@gmail.com",
          email_verified: true,
          iat: now(),
          exp: now() + 3600,
        }),
      ).toString("base64url");

      const res = await googleLogin({ credential: `${header}.${payload}.${signature}` });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("GOOGLE_AUTH_FAILED");
    });

    it("rejects an unsigned token (alg: none)", async () => {
      const unsigned = jwt.sign(
        { iss: "https://accounts.google.com", aud: CLIENT_ID, sub: "x", email: "x@gmail.com" },
        "",
        { algorithm: "none" },
      );

      // An empty signature fails the shape check; a fake one fails verification
      const res = await googleLogin({ credential: `${unsigned}AAAA` });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("GOOGLE_AUTH_FAILED");
    });

    it("returns 401 GOOGLE_TOKEN_EXPIRED for an expired token", async () => {
      // Past the 5 minutes of clock skew the check allows
      const res = await googleLogin({
        credential: googleToken({ iat: now() - 7200, exp: now() - 3600 }),
      });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("GOOGLE_TOKEN_EXPIRED");
    });

    it("returns 401 GOOGLE_EMAIL_NOT_VERIFIED when Google hasn't verified the email", async () => {
      const res = await googleLogin({ credential: googleToken({ email_verified: false }) });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("GOOGLE_EMAIL_NOT_VERIFIED");
      expect(prisma._users).toHaveLength(0);
    });

    it("never logs the token or its contents", async () => {
      const credential = googleToken({ aud: "other-app" });

      await googleLogin({ credential });

      const logged = warn.mock.calls.flat().join(" ");
      expect(logged).toContain("Wrong recipient");
      expect(logged).not.toContain(credential.split(".")[1]);
      expect(logged).not.toContain("sam@gmail.com");
    });
  });

  it("returns 503 GOOGLE_UNAVAILABLE when Google's keys can't be downloaded", async () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    certsSpy.mockRejectedValueOnce(new Error("Failed to retrieve verification certificates"));

    const res = await googleLogin({ credential: googleToken() });

    expect(res.status).toBe(503);
    expect(res.body.code).toBe("GOOGLE_UNAVAILABLE");
    error.mockRestore();
  });

  it("returns 500 without checking anything when GOOGLE_CLIENT_ID isn't set", async () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    delete process.env.GOOGLE_CLIENT_ID;

    const res = await googleLogin({ credential: googleToken() });

    expect(res.status).toBe(500);
    expect(prisma._users).toHaveLength(0);
    error.mockRestore();
  });

  describe("request validation", () => {
    it.each([
      ["no credential", {}],
      ["a credential that isn't a token", { credential: "sam@gmail.com" }],
      ["a credential that's too long", { credential: `${"a".repeat(4000)}.b.c${"d".repeat(100)}` }],
      ["a non-boolean rememberMe", { credential: "a.b.c", rememberMe: "yes" }],
      // The client's word for its email is never used
      ["an email next to the credential", { credential: "a.b.c", email: "sam@gmail.com" }],
    ])("returns 400 for %s", async (_case, body) => {
      const res = await googleLogin(body);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
      expect(certsSpy).not.toHaveBeenCalled();
    });
  });
});

describe("POST /api/auth/google/link", () => {
  // Signed in with a password account
  const signedIn = async (email = "sam@gmail.com") => {
    const agent = request.agent(app);
    await register(email, agent);
    return agent;
  };

  it("lets a password user connect Google, then sign in with either (gmail sign-up, then Google)", async () => {
    const agent = await signedIn("Sam@Gmail.com");
    expect((await googleLogin({ credential: googleToken() })).status).toBe(409);

    const res = await link(agent, { credential: googleToken(), password: "correct-horse-1" });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe("sam@gmail.com");
    expect(prisma._users[0].googleId).toBe("google-sam");

    const viaGoogle = await googleLogin({ credential: googleToken() });
    expect(viaGoogle.status).toBe(200);
    expect(viaGoogle.body.data.user.id).toBe(res.body.data.user.id);

    const viaPassword = await request(app)
      .post("/api/auth/login")
      .send({ email: "sam@gmail.com", password: "correct-horse-1" });
    expect(viaPassword.status).toBe(200);
    expect(prisma._users).toHaveLength(1);
  });

  it("works when the Google email differs from the account's email", async () => {
    const agent = await signedIn("sam@yahoo.com");

    const res = await link(agent, { credential: googleToken(), password: "correct-horse-1" });

    expect(res.status).toBe(200);
    expect(prisma._users[0]).toEqual(
      expect.objectContaining({ email: "sam@yahoo.com", googleId: "google-sam" }),
    );
  });

  it("requires the account's password, so a stolen session can't add a Google account", async () => {
    const agent = await signedIn();

    const res = await link(agent, { credential: googleToken(), password: "wrong-password" });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_CURRENT_PASSWORD");
    expect(prisma._users[0].googleId).toBeNull();
  });

  it("requires a session", async () => {
    const res = await link(request.agent(app), {
      credential: googleToken(),
      password: "correct-horse-1",
    });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHENTICATED");
  });

  it("returns 409 GOOGLE_ACCOUNT_IN_USE when that Google account belongs to another user", async () => {
    await googleLogin({ credential: googleToken({ email: "sam.other@gmail.com" }) });
    const agent = await signedIn();

    const res = await link(agent, { credential: googleToken(), password: "correct-horse-1" });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("GOOGLE_ACCOUNT_IN_USE");
  });

  it("is a no-op for the Google account that's already linked, and 409 for a different one", async () => {
    const agent = await signedIn();
    await link(agent, { credential: googleToken(), password: "correct-horse-1" });

    const again = await link(agent, { credential: googleToken(), password: "correct-horse-1" });
    const other = await link(agent, {
      credential: googleToken({ sub: "google-other" }),
      password: "correct-horse-1",
    });

    expect(again.status).toBe(200);
    expect(other.status).toBe(409);
    expect(other.body.code).toBe("GOOGLE_ALREADY_LINKED");
    expect(prisma._users[0].googleId).toBe("google-sam");
  });

  it("rejects an invalid Google token and keeps the session", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const agent = await signedIn();

    const res = await link(agent, {
      credential: googleToken({ aud: "other-app" }),
      password: "correct-horse-1",
    });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("GOOGLE_AUTH_FAILED");
    expect(prisma._users[0].googleId).toBeNull();
    expect((await agent.get("/api/auth/me")).status).toBe(200);
    warn.mockRestore();
  });

  it("returns 400 without a password", async () => {
    const agent = await signedIn();

    const res = await link(agent, { credential: googleToken() });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });
});
