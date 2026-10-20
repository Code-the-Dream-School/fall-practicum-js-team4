const request = require("supertest");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "test-secret";

// In-memory stand-in for the Prisma users table, so tests don't need a database
jest.mock("../src/config/prisma", () => {
  const crypto = require("crypto");
  const users = [];
  const find = (where) =>
    users.find((u) => Object.entries(where).every(([key, value]) => u[key] === value)) || null;
  return {
    _users: users,
    user: {
      findUnique: jest.fn(async ({ where }) => find(where)),
      create: jest.fn(async ({ data }) => {
        if (find({ email: data.email }))
          throw Object.assign(new Error("unique"), { code: "P2002" });
        const now = new Date();
        const user = {
          id: crypto.randomUUID(),
          tokenVersion: 0,
          createdAt: now,
          updatedAt: now,
          ...data,
        };
        users.push(user);
        return user;
      }),
      update: jest.fn(async ({ where, data }) => {
        const user = find(where);
        for (const [key, value] of Object.entries(data)) {
          user[key] = value?.increment !== undefined ? user[key] + value.increment : value;
        }
        return user;
      }),
    },
  };
});

const prisma = require("../src/config/prisma");
const app = require("../src/app");

const newUser = { name: "Sam Rivera", email: "Sam@Example.com", password: "correct-horse-1" };

const getTokenCookie = (res) =>
  (res.headers["set-cookie"] || []).find((c) => c.startsWith("token="));

const register = (body = newUser) => request(app).post("/api/auth/register").send(body);

beforeEach(() => {
  prisma._users.length = 0;
  jest.clearAllMocks();
});

describe("POST /api/auth/register", () => {
  it("creates the user, returns the public user and sets an httpOnly cookie", async () => {
    const res = await register();

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toEqual({
      id: expect.any(String),
      email: "sam@example.com",
      name: "Sam Rivera",
      createdAt: expect.any(String),
    });
    const cookie = getTokenCookie(res);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).toMatch(/Max-Age=604800/);
  });

  it("stores a hash, never the plain password", async () => {
    await register();
    expect(prisma._users[0].passwordHash).toBeTruthy();
    expect(prisma._users[0].passwordHash).not.toContain(newUser.password);
  });

  it("rejects invalid input with field details", async () => {
    const res = await register({ name: "", email: "not-an-email", password: "short" });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
    expect(res.body.details.map((d) => d.field).sort()).toEqual(["email", "name", "password"]);
    expect(getTokenCookie(res)).toBeUndefined();
  });

  it("rejects unknown fields", async () => {
    const res = await register({ ...newUser, isAdmin: true });
    expect(res.status).toBe(400);
    expect(res.body.details[0].field).toBe("isAdmin");
  });

  it("returns 409 EMAIL_TAKEN for an existing email, ignoring case", async () => {
    await register();
    const res = await register({ ...newUser, email: "SAM@example.com" });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("EMAIL_TAKEN");
  });

  it("returns 409 when another request registers the same email at the same moment", async () => {
    // The existence check passes, then the database rejects the duplicate insert
    prisma.user.findUnique.mockResolvedValueOnce(null);
    prisma.user.create.mockRejectedValueOnce(Object.assign(new Error("unique"), { code: "P2002" }));

    const res = await register();

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("EMAIL_TAKEN");
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(() => register());

  it("signs in with the right password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "sam@example.com", password: newUser.password });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe("sam@example.com");
    expect(getTokenCookie(res)).toBeDefined();
  });

  it.each([
    ["wrong password", { email: "sam@example.com", password: "wrong-password" }],
    ["unknown email", { email: "nobody@example.com", password: newUser.password }],
  ])("returns 401 INVALID_CREDENTIALS for %s", async (_, body) => {
    const res = await request(app).post("/api/auth/login").send(body);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("INVALID_CREDENTIALS");
    expect(getTokenCookie(res)).toBeUndefined();
  });
});

describe("GET /api/auth/me", () => {
  it("returns the signed-in user when the cookie is sent", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send(newUser);

    const res = await agent.get("/api/auth/me");

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe("sam@example.com");
  });

  it("returns 401 UNAUTHENTICATED without a cookie", async () => {
    const res = await request(app).get("/api/auth/me");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      success: false,
      code: "UNAUTHENTICATED",
      message: "Please sign in",
    });
  });

  it.each([
    ["a token signed with another secret", () => jwt.sign({ sub: "x" }, "other-secret")],
    ["an expired token", () => jwt.sign({ sub: "x", exp: 1 }, "test-secret")],
    ["a garbage token", () => "not-a-jwt"],
  ])("returns 401 for %s", async (_, makeToken) => {
    const res = await request(app).get("/api/auth/me").set("Cookie", `token=${makeToken()}`);
    expect(res.status).toBe(401);
  });

  it("returns 401 when the user in the token no longer exists", async () => {
    const res = await register();
    prisma._users.length = 0;

    const me = await request(app).get("/api/auth/me").set("Cookie", getTokenCookie(res));
    expect(me.status).toBe(401);
  });
});

describe("PATCH /api/auth/password", () => {
  const changePassword = (agent, body) => agent.patch("/api/auth/password").send(body);
  const signedInAgent = async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send(newUser);
    return agent;
  };

  it("changes the password, keeps this session signed in and returns the user", async () => {
    const agent = await signedInAgent();

    const res = await changePassword(agent, {
      currentPassword: newUser.password,
      newPassword: "new-password-1",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe("sam@example.com");
    expect(getTokenCookie(res)).toBeDefined();
    expect((await agent.get("/api/auth/me")).status).toBe(200);
  });

  it("makes the new password work for login and the old one fail", async () => {
    const agent = await signedInAgent();
    await changePassword(agent, {
      currentPassword: newUser.password,
      newPassword: "new-password-1",
    });

    const login = (password) =>
      request(app).post("/api/auth/login").send({ email: "sam@example.com", password });

    expect((await login("new-password-1")).status).toBe(200);
    expect((await login(newUser.password)).status).toBe(401);
  });

  it("signs out other sessions", async () => {
    const agent = await signedInAgent();
    const otherDevice = request.agent(app);
    await otherDevice
      .post("/api/auth/login")
      .send({ email: "sam@example.com", password: newUser.password });

    await changePassword(agent, {
      currentPassword: newUser.password,
      newPassword: "new-password-1",
    });

    const res = await otherDevice.get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHENTICATED");
  });

  it("returns 400 INVALID_CURRENT_PASSWORD and changes nothing when the current password is wrong", async () => {
    const agent = await signedInAgent();
    const hashBefore = prisma._users[0].passwordHash;

    const res = await changePassword(agent, {
      currentPassword: "wrong-password",
      newPassword: "new-password-1",
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_CURRENT_PASSWORD");
    expect(prisma._users[0].passwordHash).toBe(hashBefore);
    // A wrong password in the form must not end the session
    expect((await agent.get("/api/auth/me")).status).toBe(200);
  });

  it("requires currentPassword", async () => {
    const agent = await signedInAgent();
    const res = await changePassword(agent, { newPassword: "new-password-1" });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
    expect(res.body.details[0].field).toBe("currentPassword");
  });

  it.each([
    ["too short", { currentPassword: newUser.password, newPassword: "short" }],
    [
      "the same as the current one",
      { currentPassword: newUser.password, newPassword: newUser.password },
    ],
  ])("rejects a new password that is %s", async (_, body) => {
    const agent = await signedInAgent();
    const res = await changePassword(agent, body);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
    expect(res.body.details[0].field).toBe("newPassword");
  });

  it("returns 401 when not signed in", async () => {
    const res = await changePassword(request(app), {
      currentPassword: newUser.password,
      newPassword: "new-password-1",
    });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("clears the cookie so /me returns 401 afterwards", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send(newUser);

    const res = await agent.post("/api/auth/logout");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: null });
    expect(getTokenCookie(res)).toMatch(/Expires=Thu, 01 Jan 1970/);

    expect((await agent.get("/api/auth/me")).status).toBe(401);
  });

  it("succeeds even when nobody is signed in", async () => {
    expect((await request(app).post("/api/auth/logout")).status).toBe(200);
  });
});

describe("error handling", () => {
  it("returns 400 VALIDATION_ERROR for malformed JSON", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{not json");

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 NOT_FOUND for unknown routes", async () => {
    const res = await request(app).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("NOT_FOUND");
  });

  it("returns a generic 500 without leaking internals", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    prisma.user.findUnique.mockRejectedValueOnce(new Error("db exploded"));

    const res = await register();

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      success: false,
      code: "INTERNAL_ERROR",
      message: "Something went wrong",
    });
    spy.mockRestore();
  });

  it("allows the frontend origin to send credentials", async () => {
    const res = await request(app).get("/api/auth/me").set("Origin", "http://localhost:5173");
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });
});
