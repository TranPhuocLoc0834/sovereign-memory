import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { TidePublicConfig } from "../types";

const schema = z.object({
  realm: z.string().min(1), "auth-server-url": z.url(), resource: z.string().min(1),
  "public-client": z.literal(true), "ssl-required": z.string().default("external"),
  "confidential-port": z.number().default(0),
  jwk: z.object({ keys: z.array(z.object({ kty: z.literal("OKP"), crv: z.literal("Ed25519"), x: z.string().min(1), kid: z.string().optional(), alg: z.string().optional() }).passthrough()).min(1) }),
  vendorId: z.string().min(1), homeOrkUrl: z.string().min(1),
}).passthrough();

export function loadTideConfig(): TidePublicConfig {
  const raw = process.env.CLIENT_ADAPTER || readFileSync(join(process.cwd(), "data", "tidecloak.json"), "utf8");
  const parsed = schema.parse(JSON.parse(raw));
  if (parsed.credentials || parsed.secret || parsed.jwk.keys.some(key => key.d)) throw new Error("Expected a public Tide adapter with public keys only");
  return {
    // Tide's signed origin attestations are public adapter fields required by the enclave.
    ...Object.fromEntries(Object.entries(parsed).filter(([key,value])=>key.startsWith("client-origin-auth-")&&typeof value==="string")),
    realm: parsed.realm, "auth-server-url": parsed["auth-server-url"].replace(/\/+$/, ""), resource: parsed.resource,
    "public-client": true, "ssl-required": parsed["ssl-required"], "confidential-port": parsed["confidential-port"],
    jwk: { keys: parsed.jwk.keys.map(({ kty, crv, x, kid, alg }) => ({ kty, crv, x, ...(kid ? {kid} : {}), ...(alg ? {alg} : {}) })) },
    vendorId: parsed.vendorId, homeOrkUrl: parsed.homeOrkUrl,
  };
}
