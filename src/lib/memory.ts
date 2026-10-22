import { randomUUID } from "node:crypto";
import type { JWTPayload } from "jose";
import { db } from "./db";
import { realmRoles } from "./auth/tideJWT";
import { HttpError } from "./auth/protect";
import type { AccessLog, Agent, Grant, Memory, Principal } from "./types";

export function principal(claims: JWTPayload): Principal {
  const roles = realmRoles(claims);
  const resource = claims.resource_access as Record<string, { roles?: string[] }> | undefined;
  return { subject: claims.sub!, displayName: typeof claims.name === "string" ? claims.name.slice(0,80) : typeof claims.preferred_username === "string" ? claims.preferred_username.slice(0,80) : `Tide user ${claims.sub!.slice(0,8)}`, roles, isAdmin: resource?.["realm-management"]?.roles?.includes("tide-realm-admin") === true };
}
export function requireOwner(actor: Principal) {
  if (!actor.roles.includes("memory-owner")) {
    log(actor,null,"owner.operation","DENIED","Memory owner role required");
    throw new HttpError(403, "Memory owner role required");
  }
}
export function register(actor: Principal): Agent | null {
  const connection = db();
  connection.prepare("INSERT INTO users(id,tidecloak_subject,display_name) VALUES (?,?,?) ON CONFLICT(tidecloak_subject) DO UPDATE SET display_name=excluded.display_name").run(actor.subject, actor.subject, actor.displayName);
  const kinds = actor.roles.filter(r => r === "study-agent" || r === "finance-agent");
  if (kinds.length !== 1) return null;
  const kind = kinds[0];
  const name = kind === "study-agent" ? "Study Agent" : "Finance Agent";
  connection.prepare("INSERT INTO agents(id,name,identity_subject,description,kind) VALUES (?,?,?,?,?) ON CONFLICT(identity_subject) DO UPDATE SET kind=excluded.kind,name=excluded.name").run(randomUUID(), name, actor.subject, `Authenticated ${name.toLowerCase()} test client`, kind);
  return connection.prepare("SELECT * FROM agents WHERE identity_subject=?").get(actor.subject) as unknown as Agent;
}
export function log(actor: Principal, memoryId: string | null, action: string, result: string, reason: string) {
  db().prepare("INSERT INTO access_logs(id,actor_id,actor_name,memory_id,action,result,reason) VALUES (?,?,?,?,?,?,?)").run(randomUUID(), actor.subject, actor.displayName, memoryId, action, result, reason);
}
export function agents() { return db().prepare("SELECT * FROM agents ORDER BY kind,name").all() as unknown as Agent[]; }
export function ownedMemories(actor: Principal) {
  return (db().prepare("SELECT m.*, u.display_name AS owner_name FROM memories m JOIN users u ON u.id=m.owner_id WHERE owner_id=? ORDER BY created_at DESC").all(actor.subject) as unknown as Memory[]).map(memory => ({
    ...memory, permissions: db().prepare("SELECT p.agent_id,a.name AS agent_name,p.revoked_at FROM memory_permissions p JOIN agents a ON a.id=p.agent_id WHERE p.memory_id=?").all(memory.id) as unknown as Grant[],
  }));
}
export function visibleLogs(actor: Principal) {
  return db().prepare("SELECT l.* FROM access_logs l WHERE l.actor_id=? OR l.memory_id IN (SELECT id FROM memories WHERE owner_id=?) ORDER BY timestamp DESC, rowid DESC LIMIT 100").all(actor.subject, actor.subject) as unknown as AccessLog[];
}
export function owns(actor: Principal, memoryId: string) {
  requireOwner(actor);
  const memory = db().prepare("SELECT * FROM memories WHERE id=? AND owner_id=?").get(memoryId,actor.subject) as unknown as Memory | undefined;
  if (!memory) { log(actor,null,"permission.change","DENIED","Not owner or memory unavailable"); throw new HttpError(404, "Memory unavailable"); }
  return memory;
}
export function createMemory(actor: Principal, input: { title: string; content: string; category: string }) {
  requireOwner(actor); register(actor);
  const id = randomUUID();
  db().prepare("INSERT INTO memories(id,owner_id,title,content,category) VALUES (?,?,?,?,?)").run(id,actor.subject,input.title,input.content,input.category);
  log(actor,id,"memory.create","ALLOWED","Owner created memory");
  return id;
}
export function setGrant(actor: Principal, memoryId: string, agentId: string, revoke: boolean) {
  owns(actor,memoryId);
  if (!db().prepare("SELECT id FROM agents WHERE id=?").get(agentId)) throw new HttpError(404,"Agent unavailable");
  db().prepare("INSERT INTO memory_permissions(id,memory_id,agent_id,revoked_at) VALUES (?,?,?,?) ON CONFLICT(memory_id,agent_id) DO UPDATE SET revoked_at=excluded.revoked_at").run(randomUUID(),memoryId,agentId,revoke ? new Date().toISOString() : null);
  log(actor,memoryId,revoke ? "permission.revoke" : "permission.grant","ALLOWED",revoke ? "Future reads revoked" : "Read permission granted");
}
export function readMemory(actor: Principal, memoryId: string, claimedAgentId?: string) {
  const connection = db();
  const agent = register(actor);
  if (!agent || (claimedAgentId !== undefined && claimedAgentId !== agent.id)) {
    log(actor,null,"memory.read","DENIED","Agent identity missing, ambiguous, or mismatched");
    throw new HttpError(403,"Insufficient permission");
  }
  const memory = connection.prepare(`SELECT m.id,m.title,m.content,m.category FROM memories m
    JOIN memory_permissions p ON p.memory_id=m.id
    WHERE m.id=? AND p.agent_id=? AND p.permission='read' AND p.revoked_at IS NULL`).get(memoryId,agent.id);
  if (!memory) {
    const knownMemory = connection.prepare("SELECT id FROM memories WHERE id=?").get(memoryId);
    log(actor,knownMemory ? memoryId : null,"memory.read","DENIED","No active read permission");
    throw new HttpError(403,"Insufficient permission");
  }
  log(actor,memoryId,"memory.read","ALLOWED","Verified agent has active read permission");
  return memory;
}
