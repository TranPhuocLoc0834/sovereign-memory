import type { NextRequest } from "next/server";
import type { JWTPayload } from "jose";
import { verifyTideJWT, extractToken, hasRole } from "./tideJWT";
import { verifyDpop } from "./verifyDpop";
import { proofStore } from "../db";
import { ZodError } from "zod";
import { simulationEnabled } from "./mode";
import { readSimulationClaims, SimulationError } from "./simulation";

type Handler = (request: NextRequest, claims: JWTPayload) => Promise<Response>;
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Authentication-Mode": simulationEnabled() ? "simulation" : "tide" } });
}
export function withAuth(handler: Handler) {
  return async (request: NextRequest) => {
    let claims: JWTPayload;
    try {
      if (simulationEnabled()) {
        claims = readSimulationClaims(request);
      } else {
        const token = extractToken(request.headers.get("authorization"));
        claims = await verifyTideJWT(token);
        await verifyDpop(request, token, claims as { cnf?: { jkt?: string } }, {
          jtiStore: proofStore, trustForwardedHeaders: false, iatSkewSeconds: 120,
        });
      }
    } catch (error) {
      if (simulationEnabled() && error instanceof SimulationError) return json({ error: error.message, simulation: true }, error.status);
      return json({ error: "Unauthorized", reason: "A valid TideCloak token and fresh DPoP proof are required." }, 401);
    }
    try {
      if (!["GET", "HEAD"].includes(request.method)) {
        const origin = request.headers.get("origin");
        if (origin && origin !== new URL(simulationEnabled() ? request.url : process.env.APP_URL || request.url).origin) throw new HttpError(403, "Origin rejected");
        if (Number(request.headers.get("content-length") || 0) > 32768) throw new HttpError(413, "Request too large");
      }
      return await handler(request, claims);
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status);
      if (error instanceof ZodError || error instanceof SyntaxError) return json({ error: "Invalid request" }, 400);
      return json({ error: "Request could not be completed" }, 500);
    }
  };
}
export function withRole(role: string, handler: Handler) {
  return withAuth(async (req, claims) => hasRole(claims, role) ? handler(req, claims) : json({ error: "Forbidden" }, 403));
}
export async function readBody(request: NextRequest) {
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > 32768) throw new HttpError(413, "Request too large");
  return JSON.parse(text);
}
