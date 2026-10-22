"use client";

import { TideCloakProvider } from "@tidecloak/nextjs";
import { createContext, useContext } from "react";
import type { TidePublicConfig } from "@/lib/types";

const ConfigurationContext = createContext<TidePublicConfig | null>(null);
export const useConfiguration = () => useContext(ConfigurationContext);
const AuthModeContext = createContext<"tide" | "simulation">("tide");
export const useAuthMode = () => useContext(AuthModeContext);

// Playbook: add-auth-nextjs-fresh Step 4a
// useDPoP goes inside config object (not as a separate JSX prop).
// Enables client-side DPoP proof generation (required for secureFetch).
export function Providers({ children, config, mode = "tide" }: { children: React.ReactNode; config: TidePublicConfig | null; mode?: "tide" | "simulation" }) {
  if (mode === "simulation" || !config) return <AuthModeContext.Provider value={mode}><ConfigurationContext.Provider value={null}>{children}</ConfigurationContext.Provider></AuthModeContext.Provider>;
  return (
    <AuthModeContext.Provider value="tide">
    <ConfigurationContext.Provider value={config}>
    <TideCloakProvider
      config={{ ...config, useDPoP: { mode: "strict", alg: "ES256" } }}
    >
      {children}
    </TideCloakProvider>
    </ConfigurationContext.Provider>
    </AuthModeContext.Provider>
  );
}
