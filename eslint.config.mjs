import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([...nextVitals,...nextTs,globalIgnores([".next/**",".tide-pack/**","next-env.d.ts","public/**"]),{
  rules: { "react-hooks/set-state-in-effect":"off" }
},{
  files: ["src/app/auth/redirect/page.tsx"],
  // Tide's official callback deliberately reloads the page after processing OIDC.
  rules: { "@next/next/no-location-assign-relative-destination":"off" }
}]);
