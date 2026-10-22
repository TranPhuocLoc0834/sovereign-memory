"use client";

import { useAuthCallback } from "@tidecloak/nextjs";
import { useEffect, useState } from "react";
import { useConfiguration } from "@/app/providers";
import Link from "next/link";

// Post-auth redirect handler (I-16).
// Processes the OIDC callback, then redirects:
//   - On success: to returnUrl (where user was before login) or home
//   - On error or missing verifier: back to home
//
// Separated so useAuthCallback only runs after hydration (avoids SSR window error).
function RedirectHandler() {
  const { isProcessing, isSuccess, error } = useAuthCallback({
    onSuccess: (returnUrl) => {
      const target = new URL(returnUrl || "/", window.location.origin);
      window.location.assign(target.origin === window.location.origin ? target.href : window.location.origin);
    },
    onError: () => {
      window.location.assign("/");
    },
    onMissingVerifierRedirectTo: "/",
  });

  useEffect(() => {
    // Direct navigation without callback params — redirect to home.
    const params = new URLSearchParams(window.location.search);
    if (!params.has("code") && !params.has("error")) {
      window.location.assign("/");
    }
  }, []);

  if (error) {
    return <p>Authentication failed: {error.message}</p>;
  }

  if (isProcessing || !isSuccess) {
    return <p>Completing login...</p>;
  }

  return <p>Redirecting...</p>;
}

export default function AuthRedirectPage() {
  const config = useConfiguration();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <p>Loading...</p>;
  if (!config) return <p>Connect a real TideCloak realm before signing in. <Link href="/">Return to workspace</Link></p>;
  return <RedirectHandler />;
}
