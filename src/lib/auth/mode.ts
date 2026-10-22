/** Only an explicit server-side launch setting enables the local simulator. */
export function simulationEnabled() {
  return process.env.AUTH_MODE === "simulation" && process.env.SIMULATION_LOCAL_ONLY === "yes";
}
