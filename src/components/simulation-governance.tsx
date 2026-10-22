"use client";
import { useState } from "react";
import { Fingerprint, Shield, Users } from "lucide-react";
import type { SessionData } from "@/lib/types";

export function SimulationGovernance({ session, api }: { session: SessionData | null; api?: (path: string, init?: RequestInit) => Promise<Response> }) {
  const [result, setResult] = useState<{ status: number; body: unknown } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inspect = async () => {
    if (!api) return;
    setBusy(true); setError("");
    try { const response = await api("/api/simulation/roles"); setResult({ status: response.status, body: await response.json() }); }
    catch { setError("Could not reach the local simulation API."); }
    finally { setBusy(false); }
  };
  return <>
    <div className="info-strip"><Shield size={19}/><span>Integration plan, informed by Tide MCP. Sign-in and roles are simulated; memory grants are enforced by the application server. No Tide signatures, DPoP, ORKs, encryption or quorum approvals run in this mode.</span></div>
    <div className="governance-grid">
      <section className="panel"><div className="panel-heading"><div><h2>Where TideCloak fits</h2><p>The real integration is preserved separately.</p></div><Fingerprint size={22}/></div><div className="governance-body integration-plan">
        <p><strong>Identity:</strong> Replace the demo session selector with Tide’s SDK sign-in and account linking.</p>
        <p><strong>API boundary:</strong> Real mode requires the adapter’s pinned Ed25519 key, issuer/client/expiry checks and a fresh DPoP proof.</p>
        <p><strong>Application access:</strong> Keep ownership checks and active per-memory agent grants in the backend. An admin role never implies memory access.</p>
        <p><strong>Governance:</strong> Protect realm role changes through Tide IGA and independent enclave approvals. This simulator makes no quorum claim.</p>
      </div></section>
      <section className="panel"><div className="panel-heading"><div><h2>Test the administrator role</h2><p>A real HTTP decision using simulated identity.</p></div><Users size={22}/></div><div className="governance-body">
        <div className="trust-row"><span>Current simulated role</span><strong>{session?.principal.isAdmin ? "Administrator" : session?.principal.roles.join(", ") || "Signed out"}</strong></div>
        <p>Only the Administrator may inspect the synthetic role roster. Owner and agent sessions receive HTTP 403. The server checks the session, not the visibility of this button.</p>
        <button className="button secondary full" disabled={!session || busy} onClick={() => void inspect()}>{busy ? "Checking…" : "Call admin-only role API"}</button>
        {error && <p className="red-text" role="alert">{error}</p>}
      </div></section>
    </div>
    {result && <section className="panel"><div className="panel-heading"><h2>Role check · HTTP {result.status}</h2><span className="badge amber">Simulated identity</span></div><div className="governance-body"><pre className="governance-output">{JSON.stringify(result.body, null, 2)}</pre></div></section>}
  </>;
}
