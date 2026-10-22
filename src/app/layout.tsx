import { Providers } from "./providers";
import { loadTideConfig } from "@/lib/auth/tidecloakConfig";
import type { Metadata } from "next";
import "./globals.css";
import "./simulation.css";
import { simulationEnabled } from "@/lib/auth/mode";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sovereign Memory — Trustless Memory Access", description: "A memory vault for AI agents, with TideCloak identity and protected governance. RMIT × Tide UNLOCKED." };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const simulated = simulationEnabled();
  let config = null;
  if (!simulated) try { config = loadTideConfig(); } catch { /* Setup state; APIs remain fail closed. */ }
  return (
    <html lang="en">
      <body>
        <Providers config={config} mode={simulated ? "simulation" : "tide"}>{children}</Providers>
      </body>
    </html>
  );
}
