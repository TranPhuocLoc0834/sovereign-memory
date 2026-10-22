# Verification record

Observed on 22 October 2026 in the local Windows workspace.

| Check | Observed result |
| --- | --- |
| Automated suite | 31 tests passed: 19 application security tests with local keys/in-memory SQLite, 4 transport/adapter diagnostics, 8 simulation/isolation tests |
| TypeScript | Passed |
| ESLint | Passed before the simulation changes; not rerun for this revision |
| Production build | Passed with Next.js 16.4.2 and Webpack |
| Running home page | HTTP 200 |
| Public health — real mode | Actual HTTP response: broker reachable, adapter missing, authentication not-ready, reason REALM_SETUP_INCOMPLETE; governance unverified |
| Public health — simulation | mode=simulation, authentication=simulated, broker/adapter not-used, governance not-simulated |
| Simulation HTTP workflow | Passed: fixed sign-in roles, allowed reads, content-free cross-agent/administrator denials, immediate revocation, no seed re-grant, role API guard, scoped logs, session rotation and sign-out |
| Mode isolation | Unit tests plus actual HTTP servers pass: demo on port 3000, real Tide mode on port 3001. Real server returns 401 for a live demo cookie and 404 for simulated sign-in. Both switches required; non-loopback/cross-origin/role injection denied |
| Protected session without credentials | HTTP 401, no-store |
| Served DPoP relay | HTTP 200; official SHA-256; required CSP and Allow-CSP-From |
| Tide official doctor | Eleven static and live wiring/secrets checks pass; real adapter missing |
| Docker prerequisite | Verified engine 29.9.2 and Compose 5.6.1; official TideCloak 0.14.41-DEV image running |
| Real realm setup | sovereign-memory created; initial activation returned HTTP 500 in Midgard FinalizeWallet |
| Real vendor-key recovery | Verified CreateTideVendorKey resume returned outer 500 / inner FinalizeWallet 403; no active gVRK/certificate |
| Fresh-realm reproduction | sovereign-memory-recovery: initial inner 500, then inner 403 on resume; optional backup change did not help and was restored |
| Real adapter export | HTTP 500; vendor public signing key is null; no adapter fabricated or saved |
| Live Tide sign-in | Not verified: vendor licensing/key activation remains blocked |
| Live allowed/denied with Tide identities | Not verified: realm and enrollment pending |
| Live quorum operation | Not verified: requires Tide-mode realm and independent enrolled reviewers |
| Visual browser QA | Blocked: browser and Computer Use runtimes could not initialize kernel assets |
| Dependency audit | Zero production advisories; five development advisories through ESLint’s braces/glob dependency chain |
| Video / public GitHub | Not recorded / not published |

The automated application tests cover missing/invalid/untrusted/expired/wrong-client tokens, DPoP binding and replay, allowed reads, content-free denied reads, forged agent IDs, owner isolation, administrator denial, revocation, explicit re-granting, role removal, scoped content-free logs, strict input validation, and cross-origin mutations. These do not exercise real Tide signing, licensing or enclave approvals.

The user explicitly requested simulated sign-in/roles/access after the activation blocker. The running local demo now uses an isolated simulation mode, not the unfinished real realm. `npm run verify:simulation` performs HTTP requests against that explicit mode, writes only synthetic samples/grants and restores the study grant after the revocation test. No real cryptographic approval is simulated. See `TIDE_INTEGRATION_PLAN.md`.

Never replace pending live results with a passing unit test claim. After Docker and interactive enrollment, update this file with the actual realm build, SDK compatibility, request IDs, thresholds, HTTP outcomes and observed approval result. Do not store tokens, invitations, passwords or personal email addresses in evidence.

See TIDE_SETUP_BLOCKER.md for the sanitized real activation failure. The realm and Docker volume have been retained. Docker per-user PATH and new-volume ownership issues were repaired in setup-local.mjs and compose.yaml. All subsequent Tide status checks were made against the actual local server.
