import { jwtVerify, createLocalJWKSet, type JWTPayload } from "jose";
import { loadTideConfig } from "./tidecloakConfig";

export async function verifyTideJWT(token: string): Promise<JWTPayload> {
  const config = loadTideConfig();
  const { payload } = await jwtVerify(token, createLocalJWKSet(config.jwk), {
    algorithms: ["EdDSA"], issuer: `${config["auth-server-url"]}/realms/${config.realm}`,
    requiredClaims: ["sub", "exp", "iat"],
  });
  // Tide uses azp for the client; aud is commonly "account".
  if (payload.azp !== config.resource) throw new Error("Wrong authorized party");
  if (typeof payload.sub !== "string" || !payload.sub || payload.sub.length > 256) throw new Error("Invalid subject");
  if (typeof payload.iat !== "number" || payload.iat > Date.now()/1000 + 60) throw new Error("Invalid issued-at");
  return payload;
}
export function realmRoles(payload: JWTPayload): string[] {
  const value = payload.realm_access as { roles?: unknown } | undefined;
  return Array.isArray(value?.roles) ? value.roles.filter((r): r is string => typeof r === "string") : [];
}
export function hasRole(payload: JWTPayload, role: string) { return realmRoles(payload).includes(role); }
export function extractToken(header: string | null) {
  if (!header || !/^DPoP [^\s]+$/i.test(header)) throw new Error("DPoP authorization required");
  return header.slice(5);
}
