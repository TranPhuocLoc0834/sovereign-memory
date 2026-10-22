/** Read-only HTTP smoke test. Does not impersonate a real Tide principal. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
const origin=process.env.APP_URL||"http://localhost:3000";
const get=(path,init={})=>fetch(`${origin}${path}`,{...init,signal:AbortSignal.timeout(10000)});
try{
  const home=await get("/");assert.equal(home.status,200);assert.match(await home.text(),/Sovereign/);console.log("PASS page HTTP 200");
  const health=await get("/api/health");const status=await health.json();assert.equal(status.app,"ready");assert.equal(status.mode,"tide","This check targets Tide mode. Use npm run verify:simulation for the local simulator.");assert.equal(health.headers.get("cache-control"),"no-store");assert.ok(["reachable","unreachable"].includes(status.broker));assert.ok(["configured","missing","invalid"].includes(status.adapter));assert.notEqual(status.authentication,"verified");console.log(`PASS health: app ready, broker ${status.broker}, adapter ${status.adapter}, authentication ${status.authentication}`);
  for(const path of ["/api/session","/api/logs"]){const response=await get(path);assert.equal(response.status,401);assert.equal(response.headers.get("cache-control"),"no-store");console.log(`PASS ${path} rejects unauthenticated requests (401, no-store)`);}
  const invalid=await get("/api/session",{headers:{authorization:"DPoP invalid"}});assert.equal(invalid.status,401);console.log("PASS invalid token rejected");
  const unauthenticatedWrite=await get("/api/access",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({memoryId:"00000000-0000-4000-8000-000000000000"})});assert.equal(unauthenticatedWrite.status,401);console.log("PASS memory read rejects unauthenticated caller");
  const relay=await get("/tide_dpop/iss/6161/aud/6262/tide_dpop_auth.html");assert.equal(relay.status,200);assert.equal(relay.headers.get("content-security-policy"),"default-src 'self'; script-src 'unsafe-inline'");assert.equal(relay.headers.get("allow-csp-from"),"*");
  const served=Buffer.from(await relay.arrayBuffer());const local=readFileSync("public/tide_dpop_auth.html");const sha=bytes=>createHash("sha256").update(bytes).digest("hex");assert.equal(sha(served),sha(local));assert.equal(sha(served),"9d7844b938f0a2565fa910d3d30e9b8797cbfd6e0b73d59d804169a089aea757");console.log("PASS DPoP relay is byte-exact with required headers");
  console.log("HTTP smoke checks passed. Live login, enrolled identities, and governance approvals require the real Tide realm and interactive browser evidence.");
  if(process.argv.includes("--require-tide")&&(status.broker!=="reachable"||status.adapter!=="configured"))throw new Error("A reachable TideCloak server and a real configured adapter are both required; this check does not verify login");
}catch(error){console.error(`FAIL ${error.message}`);process.exitCode=1;}
