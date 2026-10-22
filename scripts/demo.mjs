/** Local, opt-in simulator. Does not change .env, the Tide realm, or real auth settings. */
import { spawn } from "node:child_process";
import { resolve } from "node:path";

console.log("SIMULATION ONLY — no TideCloak sign-in, signatures, DPoP, encryption, or quorum protection.");
console.log("Synthetic data only. Listening on loopback; real Tide data/configuration is preserved.");
const child = spawn(process.execPath, [resolve("node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1"], {
  stdio: "inherit", windowsHide: true,
  env: { ...process.env, AUTH_MODE: "simulation", SIMULATION_LOCAL_ONLY: "yes" },
});
child.on("error", error => { console.error(error.message); process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code ?? 1; });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { child.kill(signal); });
