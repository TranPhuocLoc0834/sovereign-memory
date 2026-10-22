/** Discovery fixtures only; none represent a licensed Tide realm or real login. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { tideHealth } from "../src/lib/tide-health";
import type { TidePublicConfig } from "../src/lib/types";

const env = { TIDECLOAK_URL: "http://localhost:8080", REALM_NAME: "test-realm" };
const issuer = "http://localhost:8080/realms/test-realm";
const missing = () => { throw Object.assign(new Error("missing adapter"), { code: "ENOENT" }); };
const online: typeof fetch = async (url, options) => {
  assert.equal(url, `${issuer}/.well-known/openid-configuration`);
  assert.equal(options?.redirect, "error");
  assert.equal(options?.cache, "no-store");
  return Response.json({ issuer });
};
const config: TidePublicConfig = {
  realm: "test-realm", "auth-server-url": "http://localhost:8080", resource: "test-only",
  "public-client": true, "ssl-required": "external", "confidential-port": 0,
  jwk: { keys: [] }, vendorId: "TEST-ONLY", homeOrkUrl: "https://test.invalid",
};

test("a reachable server without an adapter is not a configured or verified login", async () => {
  const result = await tideHealth({ loadConfig: missing, env, fetcher: online });
  assert.equal(result.broker, "reachable");
  assert.equal(result.tidecloak, "not-configured");
  assert.equal(result.adapter, "missing");
  assert.equal(result.authentication, "not-ready");
  assert.equal(result.reason, "REALM_SETUP_INCOMPLETE");
  assert.equal(result.governance, "unverified");
});

test("a malformed adapter remains invalid even when the broker responds", async () => {
  const result = await tideHealth({ loadConfig: () => { throw new Error("invalid"); }, env, fetcher: online });
  assert.equal(result.broker, "reachable");
  assert.equal(result.adapter, "invalid");
  assert.equal(result.authentication, "not-ready");
  assert.equal(result.reason, "INVALID_PUBLIC_ADAPTER");
});

test("offline, wrong-issuer and error responses are not reachable", async () => {
  const responses: (typeof fetch)[] = [
    async () => { throw new Error("offline"); },
    async () => Response.json({ issuer: "https://wrong.invalid" }),
    async () => Response.json({ issuer }, { status: 503 }),
  ];
  for (const fetcher of responses) {
    const result = await tideHealth({ loadConfig: missing, env, fetcher });
    assert.equal(result.broker, "unreachable");
    assert.equal(result.reason, "TIDECLOAK_UNREACHABLE");
    assert.equal(result.authentication, "not-ready");
  }
});

test("a configured adapter and discovery never imply successful authentication", async () => {
  const result = await tideHealth({ loadConfig: () => config, env: {}, fetcher: online });
  assert.equal(result.broker, "reachable");
  assert.equal(result.adapter, "configured");
  assert.equal(result.authentication, "unverified");
  assert.equal(result.reason, "SIGN_IN_REQUIRED");
});
