import { NextRequest } from "next/server";
import { z } from "zod";
import { json, readBody } from "@/lib/auth/protect";
import { assertLocalSimulation, createSimulationSession, readSimulationClaims, revokeSimulationSession, simulationActors, simulationClaims, simulationCookie, SimulationError } from "@/lib/auth/simulation";
import { principal, register } from "@/lib/memory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handle(request: NextRequest) {
  try {
    assertLocalSimulation(request);
    if (request.method === "GET") {
      let actor = null;
      try { actor = readSimulationClaims(request).sub?.replace(/^simulation:/, "") || null; }
      catch (error) { if (!(error instanceof SimulationError) || error.status !== 401) throw error; }
      return json({ simulation: true, actor, actors: simulationActors });
    }
    if (request.method === "POST") {
      const { actor } = z.object({ actor: z.enum(["owner", "study", "finance", "admin"]) }).strict().parse(await readBody(request));
      const cookie = createSimulationSession(request, actor);
      // Named synthetic identities exist in the isolated demo DB before memory grants are made.
      for (const fixture of simulationActors) register(principal(simulationClaims(fixture.id)));
      const response = json({ simulation: true, actor, message: "Simulated sign-in only. No TideCloak authentication occurred." });
      response.headers.set("Set-Cookie", cookie);
      return response;
    }
    if (request.method === "DELETE") {
      revokeSimulationSession(request);
      const response = json({ simulation: true, actor: null });
      response.headers.set("Set-Cookie", `${simulationCookie}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
      return response;
    }
    return json({ error: "Method not allowed" }, 405);
  } catch (error) {
    if (error instanceof SimulationError) return json({ error: error.message }, error.status);
    if (error instanceof z.ZodError || error instanceof SyntaxError) return json({ error: "Invalid simulated identity request" }, 400);
    return json({ error: "Simulation request failed" }, 500);
  }
}
export const GET = handle;
export const POST = handle;
export const DELETE = handle;
