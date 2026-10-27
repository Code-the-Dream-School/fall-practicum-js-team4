// Value for Express's "trust proxy" setting, from TRUST_PROXY.
//
// Behind a hosting proxy (Render, Railway, Fly...), every request arrives from the
// proxy, so without this req.ip is the proxy's address and all users share one
// rate-limit bucket. Set TRUST_PROXY to the number of proxies in front of the app
// (1 on most hosts). Unset (local development): trust nothing, so clients can't
// fake their IP with an X-Forwarded-For header.
export const parseTrustProxy = (value: string | undefined): boolean | number | string => {
  if (value === undefined || value.trim() === "" || value.trim() === "false") return false;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  // Trusting every proxy lets any client choose its own IP
  if (trimmed === "true") {
    throw new Error("TRUST_PROXY=true is unsafe; set the number of proxies instead (e.g. 1)");
  }
  // Also accepts Express's named ranges or IPs, e.g. "loopback" or "10.0.0.0/8"
  return trimmed;
};
