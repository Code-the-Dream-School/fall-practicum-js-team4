// Checks a Google ID token (the "credential" Google Identity Services gives the
// frontend) on the server. The token is the only proof of identity we accept:
// an email address sent by the client proves nothing.
import { OAuth2Client } from "google-auth-library";
import AppError from "./AppError";

// What we keep from a verified token
export interface GoogleProfile {
  // Google's stable account id ("sub"). Unlike the email, it never changes
  // and is never reused for another person
  googleId: string;
  email: string;
  name: string;
}

// Only Google issues sign-in tokens. Set explicitly: the library's default
// list also includes "googleapis.com", which never issues ID tokens.
const ISSUERS = ["accounts.google.com", "https://accounts.google.com"];

// Same limit as the name in registerSchema
const MAX_NAME_LENGTH = 60;

// One client for the whole app, so Google's public keys are cached between
// requests (for as long as Google's Cache-Control allows)
const client = new OAuth2Client();

const authFailed = () => new AppError(401, "GOOGLE_AUTH_FAILED", "Google sign-in failed");

// Returns the verified profile, or throws:
//   401 GOOGLE_TOKEN_EXPIRED       token is past its expiry time
//   401 GOOGLE_AUTH_FAILED         bad signature, issuer, audience, or format
//   401 GOOGLE_EMAIL_NOT_VERIFIED  Google hasn't verified the account's email
//   503 GOOGLE_UNAVAILABLE         Google's public keys couldn't be downloaded
export const verifyGoogleIdToken = async (idToken: string): Promise<GoogleProfile> => {
  // Without an audience, tokens Google issued to any other app would be accepted
  const audience = process.env.GOOGLE_CLIENT_ID;
  if (!audience) throw new Error("GOOGLE_CLIENT_ID is not set");

  // Downloaded separately, so "Google is down" isn't reported as a bad token
  let certs;
  try {
    ({ certs } = await client.getFederatedSignonCertsAsync());
  } catch (err) {
    console.error("Google sign-in: could not get Google's keys:", (err as Error).message);
    throw new AppError(
      503,
      "GOOGLE_UNAVAILABLE",
      "Google sign-in is unavailable right now, please try again later",
    );
  }

  let payload;
  try {
    // Checks the signature against Google's keys, the issuer, the audience
    // (our client id), and the issue and expiry times (allowing 5 minutes of clock skew)
    const ticket = await client.verifySignedJwtWithCertsAsync(idToken, certs, audience, ISSUERS);
    payload = ticket.getPayload();
  } catch (err) {
    // The library's messages include the raw token and its contents after the
    // first ":" or ",", so only the part before is logged
    const reason = String((err as Error).message).split(/[:,]/)[0];
    console.warn("Google sign-in rejected:", reason);
    if (reason.startsWith("Token used too late")) {
      throw new AppError(401, "GOOGLE_TOKEN_EXPIRED", "Google sign-in expired, please try again");
    }
    throw authFailed();
  }

  if (!payload?.sub || !payload.email) throw authFailed();
  // Google's own check that the person controls this address
  if (payload.email_verified !== true) {
    throw new AppError(
      401,
      "GOOGLE_EMAIL_NOT_VERIFIED",
      "Your Google account's email address isn't verified",
    );
  }

  const email = payload.email.toLowerCase();
  const name = (payload.name?.trim() || email.split("@")[0]).slice(0, MAX_NAME_LENGTH);
  return { googleId: payload.sub, email, name };
};
