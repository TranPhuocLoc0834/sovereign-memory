import { loadTideConfig } from "./auth/tidecloakConfig";
import type { TidePublicConfig } from "./types";
import { simulationEnabled } from "./auth/mode";

/** Discovery proves transport reachability, never successful Tide authentication. */
export async function tideHealth({
  loadConfig = loadTideConfig,
  env = { TIDECLOAK_URL: process.env.TIDECLOAK_URL, REALM_NAME: process.env.REALM_NAME },
  fetcher = fetch,
}: {
  loadConfig?: () => TidePublicConfig;
  env?: { TIDECLOAK_URL?: string; REALM_NAME?: string };
  fetcher?: typeof fetch;
} = {}) {
  if (simulationEnabled()) return {
    app: "ready", mode: "simulation", tidecloak: "not-used", broker: "not-used", adapter: "not-used",
    authentication: "simulated", reason: "SIMULATION_ENABLED", governance: "not-simulated", storage: "unencrypted-synthetic-demo",
  };
  let config: TidePublicConfig | undefined;
  let adapter: "configured" | "missing" | "invalid" = "configured";
  try { config = loadConfig(); }
  catch (error) {
    adapter = error && typeof error === "object" && "code" in error && error.code === "ENOENT" ? "missing" : "invalid";
  }

  let broker: "reachable" | "unreachable" = "unreachable";
  try {
    // These are operator-controlled settings, never values supplied by an HTTP caller.
    const server = config?.["auth-server-url"] || env.TIDECLOAK_URL || "http://localhost:8080";
    const realm = config?.realm || env.REALM_NAME || "sovereign-memory";
    const issuer = new URL(`${server.replace(/\/+$/, "")}/realms/${encodeURIComponent(realm)}`);
    if (!["http:", "https:"].includes(issuer.protocol) || issuer.username || issuer.password) throw new Error("Invalid broker URL");
    const response = await fetcher(`${issuer.href}/.well-known/openid-configuration`, {
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(4000),
    });
    const discovery = await response.json();
    if (response.ok && discovery.issuer === issuer.href) broker = "reachable";
  } catch { /* A failed discovery must not turn a missing adapter into a ready login. */ }

  return {
    app: "ready",
    mode: "tide",
    tidecloak: adapter === "configured" ? broker : "not-configured",
    broker, adapter,
    authentication: adapter === "configured" ? "unverified" : "not-ready",
    reason: broker !== "reachable" ? "TIDECLOAK_UNREACHABLE" : adapter === "invalid" ? "INVALID_PUBLIC_ADAPTER" : adapter === "missing" ? "REALM_SETUP_INCOMPLETE" : "SIGN_IN_REQUIRED",
    governance: "unverified",
    storage: "unencrypted-prototype",
  };
}
