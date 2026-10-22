/** HTTP workflow test. Writes only synthetic samples/grants in the explicit demo server. */
import assert from "node:assert/strict";
const origin = process.env.APP_URL || "http://localhost:3000";
const cookies = new Map();
async function call(path, { actor, method = "GET", body, headers = {} } = {}) {
  return fetch(`${origin}${path}`, { method, headers: {
    ...(actor && cookies.has(actor) ? { cookie: cookies.get(actor) } : {}),
    ...(method !== "GET" ? { origin, "content-type": "application/json" } : {}), ...headers,
  }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000) });
}
async function login(actor) {
  const response = await call("/api/simulation/session", { actor, method: "POST", body: { actor } });
  assert.equal(response.status, 200, `Simulated ${actor} sign-in HTTP ${response.status}`);
  const cookie = response.headers.get("set-cookie"); assert.ok(cookie); assert.match(cookie, /HttpOnly; SameSite=Strict/);
  cookies.set(actor, cookie.split(";")[0]);
}
const access = (actor, memoryId, extra = {}) => call("/api/access", { actor, method: "POST", body: { memoryId, ...extra } });
async function denied(response) {
  assert.equal(response.status, 403);
  assert.doesNotMatch(await response.text(), /Friday|5,000|"content"/);
}
try {
  const health = await (await call("/api/health")).json();
  assert.equal(health.mode, "simulation", "Refusing to write to a non-simulation server");
  assert.equal(health.authentication, "simulated"); assert.equal(health.governance, "not-simulated");
  const page = await call("/"); assert.equal(page.status, 200); assert.match(await page.text(), /NOT PROTECTED BY TIDECLOAK/);
  console.log("PASS clearly labelled simulation page and health; no real Tide claim");
  assert.equal((await call("/api/session")).status, 401);
  assert.equal((await call("/api/simulation/session", { method: "POST", body: { actor: "admin", roles: ["memory-owner"] } })).status, 400);
  assert.equal((await call("/api/simulation/session", { method: "POST", body: { actor: "admin" }, headers: { origin: "https://evil.invalid" } })).status, 403);
  console.log("PASS unauthenticated, role-injection and cross-origin attempts rejected");
  for (const actor of ["owner", "study", "finance", "admin"]) await login(actor);
  const session = await (await call("/api/session", { actor: "owner" })).json();
  assert.equal(session.principal.subject, "simulation:owner");
  const seeded = await call("/api/seed", { actor: "owner", method: "POST", body: {} }); assert.equal(seeded.status, 200);
  const { memories } = await seeded.json();
  const study = memories.find(memory => memory.category === "Study" && memory.title === "Project Alpha briefing");
  const finance = memories.find(memory => memory.category === "Finance" && memory.title === "Monthly project budget");
  const studyAgent = session.agents.find(agent => agent.kind === "study-agent");
  const financeAgent = session.agents.find(agent => agent.kind === "finance-agent");
  async function grant(memoryId, agentId, revoke) {
    const response = await call(`/api/memories/${memoryId}/permissions`, { actor: "owner", method: "POST", body: { agentId, revoke } });
    assert.equal(response.status, 200);
  }
  // Explicit grant changes are part of this synthetic workflow test, not hidden seed resets.
  await grant(study.id, studyAgent.id, false); await grant(finance.id, financeAgent.id, false);
  try {
    assert.equal((await access("study", study.id)).status, 200);
    assert.equal((await access("finance", finance.id)).status, 200);
    await denied(await access("study", finance.id)); await denied(await access("finance", study.id));
    await denied(await access("study", finance.id, { agentId: financeAgent.id }));
    await denied(await access("admin", study.id));
    console.log("PASS both allowed reads, cross-agent denials, forged agent and admin memory denial");
    await grant(study.id, studyAgent.id, true);
    await denied(await access("study", study.id));
    await call("/api/seed", { actor: "owner", method: "POST", body: {} });
    await denied(await access("study", study.id));
    console.log("PASS immediate revocation; repeated seeding does not restore the grant");
  } finally { await grant(study.id, studyAgent.id, false); }
  assert.equal((await access("study", study.id)).status, 200);
  assert.equal((await call("/api/simulation/roles", { actor: "admin" })).status, 200);
  assert.equal((await call("/api/simulation/roles", { actor: "study" })).status, 403);
  const logs = await (await call("/api/logs", { actor: "owner" })).text(); assert.doesNotMatch(logs, /Friday|5,000/);
  if (process.env.TIDE_VERIFY_URL) {
    const real = process.env.TIDE_VERIFY_URL.replace(/\/+$/, "");
    const realHealth = await (await fetch(`${real}/api/health`, { signal: AbortSignal.timeout(10000) })).json();
    assert.equal(realHealth.mode, "tide");
    const response = await fetch(`${real}/api/session`, { headers: { cookie: cookies.get("admin") }, signal: AbortSignal.timeout(10000) });
    assert.equal(response.status, 401);
    const loginResponse = await fetch(`${real}/api/simulation/session`, { method: "POST", headers: { origin: new URL(real).origin, "content-type": "application/json" }, body: JSON.stringify({ actor: "admin" }), signal: AbortSignal.timeout(10000) });
    assert.equal(loginResponse.status, 404);
    console.log("PASS separate running Tide server rejects demo cookie and disables simulated sign-in");
  }
  const oldCookie = cookies.get("study"); await login("study");
  assert.equal((await call("/api/session", { headers: { cookie: oldCookie } })).status, 401);
  for (const actor of cookies.keys()) {
    assert.equal((await call("/api/simulation/session", { actor, method: "DELETE" })).status, 200);
    assert.equal((await call("/api/session", { actor })).status, 401);
  }
  console.log("PASS admin role boundary, content-free logs, session rotation and sign-out");
  console.log("Simulation workflow passed. Synthetic samples are ready; no Tide login or quorum result is asserted.");
} catch (error) { console.error(`FAIL ${error.message}`); process.exitCode = 1; }
