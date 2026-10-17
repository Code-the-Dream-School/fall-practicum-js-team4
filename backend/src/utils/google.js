const { OAuth2Client } = require("google-auth-library");

const client = new OAuth2Client();

// Verifies a Google ID token from the frontend; returns the profile or null
const verifyGoogleIdToken = async (credential) => {
  // Without an audience, Google tokens issued to any other app would be accepted
  const audience = process.env.GOOGLE_CLIENT_ID;
  if (!audience) throw new Error("GOOGLE_CLIENT_ID is not set");
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.email_verified) {
      console.warn("Google sign-in rejected: account has no verified email");
      return null;
    }
    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase(),
      name: payload.name || payload.email.split("@")[0],
      avatarUrl: payload.picture || null,
    };
  } catch (err) {
    // The client only sees GOOGLE_AUTH_FAILED; the reason is logged here for debugging.
    // Text after the first ":" can contain the raw token or profile, so it's dropped.
    console.warn("Google sign-in rejected:", String(err.message).split(":")[0]);
    return null;
  }
};

module.exports = { verifyGoogleIdToken };
