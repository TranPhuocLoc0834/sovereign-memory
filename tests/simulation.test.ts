/** Local simulated identity and real application authorization. NOT Tide network tests. */
import { before, test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET, POST } from "../src/app/api/[...path]/route";
import { GET as sessionInfo, POST as signIn, DELETE as signOut } from "../src/app/api/simulation/session/route";
import { GET as roleRoster } from "../src/app/api/simulation/roles/route";
import { simulationCookie } from "../src/lib/auth/simulation";
import { simulationEnabled } from "../src/lib/auth/mode";
import { tideHealth } from "../src/lib/tide-health";
import { db } from "../src/lib/db";

const origin = "http://localhost:3000";
const cookies: Record<string, string> = {};
let studyMemory: string, financeMemory: string, studyAgent: string, financeAgent: string;
before(() => {
  process.env.AUTH_MODE = "simulation";
  process.env.SIMULATION_LOCAL_ONLY = "yes";
  process.env.SIMULATION_DATABASE_PATH = ":memory:";
  process.env.APP_URL = origin;
});
function request(method: string, path: string, cookie?: string, body?: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`${origin}${path}`, { method, headers: {
    ...(cookie ? { cookie } : {}), ...(method !== "GET" ? { origin, "content-type": "application/json" } : {}), ...headers,
  }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
}
const api = (actor: string, method: string, path: string, body?: unknown) => (method === "GET" ? GET : POST)(request(method, path, cookies[actor], body));
async function login(actor: string) {
  const response = await signIn(request("POST", "/api/simulation/session", cookies[actor], { actor }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-authentication-mode"), "simulation");
  const cookie = response.headers.get("set-cookie")!;
  assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Strict/);
  cookies[actor] = cookie.split(";")[0];
}

test("simulation requires both explicit server settings and exposes no unauthenticated memory", async () => {
  delete process.env.SIMULATION_LOCAL_ONLY;
  assert.equal(simulationEnabled(), false);
  assert.equal((await sessionInfo(request("GET", "/api/simulation/session"))).status, 404);
  process.env.SIMULATION_LOCAL_ONLY = "yes";
  assert.equal((await GET(request("GET", "/api/session"))).status, 401);
  assert.equal((await GET(request("GET", "/api/session", `${simulationCookie}=owner`))).status, 401);
});

test("local sign-in rejects arbitrary identities, roles, cross-origin and non-loopback requests", async () => {
  for (const body of [{ actor: "unknown" }, { actor: "study", roles: ["memory-owner"] }, { actor: "admin", subject: "someone" }]) {
    assert.equal((await signIn(request("POST", "/api/simulation/session", undefined, body))).status, 400);
  }
  assert.equal((await signIn(request("POST", "/api/simulation/session", undefined, { actor: "admin" }, { origin: "https://evil.invalid" }))).status, 403);
  assert.equal((await signIn(request("POST", "/api/simulation/session", undefined, { actor: "admin" }, { origin: "" }))).status, 403);
  assert.equal((await sessionInfo(new NextRequest("https://public.invalid/api/simulation/session"))).status, 403);
  assert.equal((await sessionInfo(request("GET", "/api/simulation/session", undefined, undefined, { host: "evil.invalid" }))).status, 403);
});

test("the server chooses fixed simulated claims and seeds distinct agent grants", async () => {
  for (const actor of ["owner", "study", "finance", "admin"]) await login(actor);
  const owner = await (await api("owner", "GET", "/api/session")).json();
  assert.deepEqual(owner.principal.roles, ["memory-owner"]);
  assert.equal(owner.principal.subject, "simulation:owner");
  studyAgent = owner.agents.find((a: { kind: string }) => a.kind === "study-agent").id;
  financeAgent = owner.agents.find((a: { kind: string }) => a.kind === "finance-agent").id;
  const seeded = await api("owner", "POST", "/api/seed", {});
  assert.equal(seeded.status, 200);
  const body = await seeded.json();
  studyMemory = body.memories.find((m: { category: string }) => m.category === "Study").id;
  financeMemory = body.memories.find((m: { category: string }) => m.category === "Finance").id;
  const study = await (await api("study", "GET", "/api/session")).json();
  assert.deepEqual(study.principal.roles, ["study-agent"]);
  assert.deepEqual(study.memories, []);
  assert.equal(study.targets.length, 2); // Only synthetic sample metadata; no plaintext.
});

test("simulated agents receive allowed reads, cross-agent 403s and anti-impersonation checks", async () => {
  assert.equal((await api("study", "POST", "/api/access", { memoryId: studyMemory })).status, 200);
  assert.equal((await api("finance", "POST", "/api/access", { memoryId: financeMemory })).status, 200);
  for (const [actor, memoryId] of [["study", financeMemory], ["finance", studyMemory], ["admin", studyMemory], ["owner", studyMemory]]) {
    const response = await api(actor, "POST", "/api/access", { memoryId });
    assert.equal(response.status, 403);
    const text = await response.text(); assert.doesNotMatch(text, /5,000|Friday|content|budget/);
  }
  assert.equal((await api("study", "POST", "/api/access", { memoryId: financeMemory, agentId: financeAgent })).status, 403);
  assert.equal((await api("study", "POST", "/api/memories", { title: "No", category: "Study", content: "No" })).status, 403);
});

test("owner revocation takes effect immediately and repeated seeding cannot restore access", async () => {
  const path = `/api/memories/${studyMemory}/permissions`;
  assert.equal((await api("admin", "POST", path, { agentId: studyAgent, revoke: true })).status, 403);
  assert.equal((await api("owner", "POST", path, { agentId: studyAgent, revoke: true })).status, 200);
  assert.equal((await api("study", "POST", "/api/access", { memoryId: studyMemory })).status, 403);
  await api("owner", "POST", "/api/seed", {});
  assert.equal((await api("study", "POST", "/api/access", { memoryId: studyMemory })).status, 403);
  await api("owner", "POST", path, { agentId: studyAgent, revoke: false });
  assert.equal((await api("study", "POST", "/api/access", { memoryId: studyMemory })).status, 200);
});

test("administrator-only role inspection does not confer memory access or real governance", async () => {
  assert.equal((await roleRoster(request("GET", "/api/simulation/roles", cookies.admin))).status, 200);
  for (const actor of ["owner", "study", "finance"]) assert.equal((await roleRoster(request("GET", "/api/simulation/roles", cookies[actor]))).status, 403);
  assert.equal((await GET(request("GET", "/api/session", cookies.study, undefined, { authorization: "DPoP fake" }))).status, 401);
  const health = await tideHealth({ fetcher: async () => { throw new Error("Simulator must not contact Tide"); } });
  assert.equal(health.mode, "simulation"); assert.equal(health.authentication, "simulated"); assert.equal(health.governance, "not-simulated");
});

test("role switching rotates sessions; sign-out and expiration invalidate them", async () => {
  const previous = cookies.owner;
  await login("owner");
  assert.notEqual(cookies.owner, previous);
  assert.equal((await GET(request("GET", "/api/session", previous))).status, 401);
  assert.equal((await signOut(request("DELETE", "/api/simulation/session", cookies.owner))).status, 200);
  assert.equal((await api("owner", "GET", "/api/session")).status, 401);
  db().prepare("UPDATE simulation_sessions SET expires_at=0 WHERE actor='finance'").run();
  assert.equal((await api("finance", "GET", "/api/session")).status, 401);
});

test("Tide mode never accepts simulation cookies or exposes the simulator", async () => {
  process.env.AUTH_MODE = "tide";
  try {
    assert.equal((await GET(request("GET", "/api/session", cookies.study))).status, 401);
    assert.equal((await sessionInfo(request("GET", "/api/simulation/session", cookies.study))).status, 404);
    assert.equal((await roleRoster(request("GET", "/api/simulation/roles", cookies.admin))).status, 404);
    assert.equal((await signIn(request("POST", "/api/simulation/session", undefined, { actor: "admin" }))).status, 404);
  } finally { process.env.AUTH_MODE = "simulation"; }
});
