import { z } from "zod";
import { withAuth, json, readBody, HttpError } from "@/lib/auth/protect";
import { agents, createMemory, log, ownedMemories, principal, readMemory, register, requireOwner, setGrant, visibleLogs } from "@/lib/memory";
import { db } from "@/lib/db";
import { simulationEnabled } from "@/lib/auth/mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const idSchema = z.string().uuid();
const memorySchema = z.object({ title: z.string().trim().min(1).max(120), content: z.string().trim().min(1).max(12000), category: z.enum(["Study","Finance","General"]) }).strict();

const handler = withAuth(async (req, claims) => {
  const actor = principal(claims);
  const agent = register(actor);
  const path = req.nextUrl.pathname.split("/").filter(Boolean).slice(1);
  if (req.method === "GET" && path.join("/") === "session") {
    const owner = actor.roles.includes("memory-owner");
    const logs = visibleLogs(actor);
    const memories = owner ? ownedMemories(actor) : [];
    const roster = owner ? agents() : agent ? [agent] : [];
    // Only the two named synthetic sample IDs are shared across demo roles for denial tests.
    // Real Tide mode still exposes targets solely through the caller's grants.
    const targets = simulationEnabled()
      ? db().prepare("SELECT id,title,category FROM memories WHERE owner_id='simulation:owner' AND title IN ('Project Alpha briefing','Monthly project budget')").all()
      : agent ? db().prepare("SELECT m.id,m.title,m.category FROM memories m JOIN memory_permissions p ON p.memory_id=m.id WHERE p.agent_id=?").all(agent.id) : [];
    const counts = db().prepare(`SELECT result,COUNT(*) AS count FROM access_logs
      WHERE action='memory.read' AND (actor_id=? OR memory_id IN (SELECT id FROM memories WHERE owner_id=?)) GROUP BY result`).all(actor.subject,owner ? actor.subject : "");
    return json({ principal:actor, agent, agents:roster, memories, targets, logs, stats:{ memories:memories.length, agents:roster.length, allowed:Number(counts.find(c=>c.result==="ALLOWED")?.count || 0), denied:Number(counts.find(c=>c.result==="DENIED")?.count || 0) } });
  }
  if (req.method === "GET" && path.join("/") === "logs") return json({ logs:visibleLogs(actor) });
  if (req.method === "POST" && path.join("/") === "memories") {
    requireOwner(actor);
    const input = memorySchema.parse(await readBody(req));
    return json({ id:createMemory(actor,input) },201);
  }
  if (req.method === "POST" && path.length===3 && path[0]==="memories" && path[2]==="permissions") {
    const memoryId = idSchema.parse(path[1]);
    const input = z.object({ agentId:idSchema, revoke:z.boolean() }).strict().parse(await readBody(req));
    setGrant(actor,memoryId,input.agentId,input.revoke);
    return json({ result:input.revoke ? "REVOKED" : "GRANTED", timestamp:new Date().toISOString() });
  }
  if (req.method === "POST" && path.join("/") === "access") {
    const input = z.object({ memoryId:idSchema, agentId:idSchema.optional() }).strict().parse(await readBody(req));
    const timestamp = new Date().toISOString();
    try {
      const memory = readMemory(actor,input.memoryId,input.agentId);
      return json({ result:"ALLOWED", reason:"Authorized memory access", memory, identity:{subject:actor.subject, agentId:agent?.id}, timestamp });
    } catch (error) {
      if (error instanceof HttpError && error.status===403) return json({ result:"DENIED", reason:"Insufficient permission", timestamp },403);
      throw error;
    }
  }
  if (req.method === "POST" && path.join("/") === "seed") {
    requireOwner(actor);
    // Repeated seeding never restores a revoked grant. Owners explicitly re-grant in the vault.
    const samples = [
      { title:"Project Alpha briefing",content:"Project Alpha has a presentation scheduled for Friday.",category:"Study" },
      { title:"Monthly project budget",content:"Monthly project budget: 5,000 USD.",category:"Finance" },
    ];
    db().exec("BEGIN IMMEDIATE");
    try {
      for (const sample of samples) {
        const existing = db().prepare("SELECT id FROM memories WHERE owner_id=? AND title=?").get(actor.subject,sample.title);
        if (existing) continue;
        const id = createMemory(actor,sample);
        for (const registered of agents().filter(a=>a.kind===(sample.category==="Study" ? "study-agent" : "finance-agent"))) setGrant(actor,id,registered.id,false);
      }
      db().exec("COMMIT");
    } catch(error) { db().exec("ROLLBACK"); throw error; }
    log(actor,null,"demo.seed","ALLOWED","Synthetic demo memories prepared");
    return json({ result:"READY", memories:ownedMemories(actor) });
  }
  throw new HttpError(404,"Endpoint unavailable");
});

export const GET = handler;
export const POST = handler;
// Deny unsupported operations through the same auth boundary.
export const DELETE = handler;
export const PATCH = handler;
