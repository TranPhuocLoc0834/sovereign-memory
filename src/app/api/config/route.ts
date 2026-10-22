import { loadTideConfig } from "@/lib/auth/tidecloakConfig";

// Serve adapter JSON for server-side use (e.g. JWT verification).
// The client-side SDK now imports the adapter JSON directly via TideCloakProvider's config prop.
// This route remains available for any server-side consumers that need the config.
export async function GET() {
  try {
    const config = loadTideConfig();
    return Response.json(config, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      { error: "TideCloak is not configured. Complete setup and export data/tidecloak.json." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
