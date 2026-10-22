import { withAuth, json } from "@/lib/auth/protect";
import { simulationEnabled } from "@/lib/auth/mode";
import { simulationActors } from "@/lib/auth/simulation";
import { principal } from "@/lib/memory";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
const handler = withAuth(async (_request, claims) => {
  if (!principal(claims).isAdmin) return json({ simulation: true, error: "Administrator role required" }, 403);
  return json({ simulation: true, actors: simulationActors, governance: "Not implemented in the simulator. Real Tide approval and signatures are required in Tide mode." });
});
export const GET = (request: NextRequest) => simulationEnabled() ? handler(request) : json({ error: "Simulation is disabled" }, 404);
