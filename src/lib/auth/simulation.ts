import { createHash, randomBytes } from "node:crypto";
import type { JWTPayload } from "jose";
import type { NextRequest } from "next/server";
import { db } from "../db";
import { simulationEnabled } from "./mode";

export const simulationCookie = "sovereign_memory_simulation";
export const simulationActors = [
  { id: "owner", name: "Demo Owner", roles: ["memory-owner"], isAdmin: false, description: "Create memories, grant and revoke reads." },
  { id: "study", name: "Study Agent", roles: ["study-agent"], isAdmin: false, description: "Read only memories with an active grant." },
  { id: "finance", name: "Finance Agent", roles: ["finance-agent"], isAdmin: false, description: "Try finance access and cross-agent denial." },
  { id: "admin", name: "Demo Administrator", roles: [], isAdmin: true, description: "Inspect roles. No automatic memory access." },
] as const;
export class SimulationError extends Error { constructor(public status: number, message: string) { super(message); } }

export function assertLocalSimulation(request: NextRequest) {
  if (!simulationEnabled()) throw new SimulationError(404, "Simulation is disabled");
  const url = new URL(request.url);
  const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);
  const host = request.headers.get("host");
  if (!loopback.has(url.hostname) || (host && host !== url.host) || request.headers.get("sec-fetch-site") === "cross-site") {
    throw new SimulationError(403, "Simulation is restricted to same-origin loopback requests");
  }
  // A cross-origin site must not silently sign a visitor into a privileged local demo actor.
  if (!["GET", "HEAD"].includes(request.method) && request.headers.get("origin") !== url.origin) {
    throw new SimulationError(403, "Same-origin simulation request required");
  }
}

export function simulationClaims(actorId: string): JWTPayload {
  const actor = simulationActors.find(item => item.id === actorId);
  if (!actor) throw new SimulationError(400, "Unknown simulated identity");
  // Plain in-process claims, NOT a token, signature, or asserted Tide identity.
  return {
    sub: `simulation:${actor.id}`, name: actor.name, realm_access: { roles: [...actor.roles] },
    resource_access: actor.isAdmin ? { "realm-management": { roles: ["tide-realm-admin"] } } : {},
  };
}

function sessionStore() {
  const connection = db();
  connection.exec("CREATE TABLE IF NOT EXISTS simulation_sessions (token_hash TEXT PRIMARY KEY, actor TEXT NOT NULL, expires_at INTEGER NOT NULL)");
  return connection;
}
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export function revokeSimulationSession(request: NextRequest) {
  const token = request.cookies.get(simulationCookie)?.value;
  if (token) sessionStore().prepare("DELETE FROM simulation_sessions WHERE token_hash=?").run(hash(token));
}

export function createSimulationSession(request: NextRequest, actor: string) {
  simulationClaims(actor); // Reject arbitrary role/subject selection before touching state.
  revokeSimulationSession(request);
  const token = randomBytes(32).toString("hex");
  const connection = sessionStore();
  connection.prepare("DELETE FROM simulation_sessions WHERE expires_at<=?").run(Date.now());
  connection.prepare("INSERT INTO simulation_sessions(token_hash,actor,expires_at) VALUES (?,?,?)").run(hash(token), actor, Date.now() + 3600000);
  return `${simulationCookie}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600`;
}

export function readSimulationClaims(request: NextRequest) {
  assertLocalSimulation(request);
  if (request.headers.has("authorization")) throw new SimulationError(401, "Simulation accepts only its local demo session, not Tide tokens");
  const token = request.cookies.get(simulationCookie)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new SimulationError(401, "Choose a simulated identity first");
  const record = sessionStore().prepare("SELECT actor FROM simulation_sessions WHERE token_hash=? AND expires_at>?").get(hash(token), Date.now());
  if (!record) throw new SimulationError(401, "Simulated session expired or signed out");
  return simulationClaims(String(record.actor));
}
