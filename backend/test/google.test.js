const { OAuth2Client } = require("google-auth-library");
const { verifyGoogleIdToken } = require("../src/utils/google");

// Stub Google's check so tests never call Google's servers
const verifyIdToken = jest.spyOn(OAuth2Client.prototype, "verifyIdToken");
const googleReturns = (payload) => verifyIdToken.mockResolvedValue({ getPayload: () => payload });

const validPayload = {
  sub: "google-123",
  email: "Sam@Example.com",
  email_verified: true,
  name: "Sam Rivera",
  picture: "https://example.com/sam.png",
};

const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

beforeEach(() => {
  process.env.GOOGLE_CLIENT_ID = "test-client-id";
  verifyIdToken.mockReset();
  warn.mockClear();
});

describe("verifyGoogleIdToken", () => {
  it("refuses to run without GOOGLE_CLIENT_ID, so any app's token can't be accepted", async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    await expect(verifyGoogleIdToken("token")).rejects.toThrow("GOOGLE_CLIENT_ID is not set");
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it("checks the token against our client ID", async () => {
    googleReturns(validPayload);
    await verifyGoogleIdToken("id-token");
    expect(verifyIdToken).toHaveBeenCalledWith({
      idToken: "id-token",
      audience: "test-client-id",
    });
  });

  it("maps the Google profile and lowercases the email", async () => {
    googleReturns(validPayload);
    expect(await verifyGoogleIdToken("id-token")).toEqual({
      googleId: "google-123",
      email: "sam@example.com",
      name: "Sam Rivera",
      avatarUrl: "https://example.com/sam.png",
    });
  });

  it("falls back to the email name and a null avatar when the profile lacks them", async () => {
    googleReturns({ ...validPayload, name: undefined, picture: undefined });
    expect(await verifyGoogleIdToken("id-token")).toMatchObject({
      name: "Sam",
      avatarUrl: null,
    });
  });

  it.each([
    ["the email is not verified", { ...validPayload, email_verified: false }],
    ["there is no email", { ...validPayload, email: undefined }],
    ["there is no payload", undefined],
  ])("returns null when %s", async (_, payload) => {
    googleReturns(payload);
    expect(await verifyGoogleIdToken("id-token")).toBeNull();
  });

  it("returns null when Google rejects the token and logs why", async () => {
    verifyIdToken.mockRejectedValue(
      new Error("Wrong recipient, payload audience != requiredAudience"),
    );
    expect(await verifyGoogleIdToken("id-token")).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      "Google sign-in rejected:",
      "Wrong recipient, payload audience != requiredAudience",
    );
  });

  it("never logs the token itself", async () => {
    verifyIdToken.mockRejectedValue(
      new Error("Wrong number of segments in token: ya29.secret-access-token"),
    );
    await verifyGoogleIdToken("ya29.secret-access-token");
    expect(JSON.stringify(warn.mock.calls)).not.toContain("secret-access-token");
  });
});
