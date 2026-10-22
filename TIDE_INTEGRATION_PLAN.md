# TideCloak integration plan and simulation boundary

The owner explicitly requested a simulated Tide-style experience after real realm activation failed. This is an isolated local demo, not a fix or substitute for Tide cryptography.

## Tide MCP planning used

- `tide_choose_playbook`: supplied the current Next.js architecture, actual activation blocker and requested simulation boundary.
- `tide_canon(feature-mapping)`: distinguished SDK sign-in/UI role gating, backend JWT/DPoP verification, application memory grants, and cryptographically governed realm changes.
- `tide_doctor`: checked the retained real integration. Relay, provider, verifier and secret checks pass; the real adapter is still missing. The simulation does not make the real doctor pass.

## Placement

| Concern | Local simulation now | Real Tide mode / future activation |
| --- | --- | --- |
| Sign-in | Select one of four named synthetic identities; opaque HttpOnly local session | Tide SDK OIDC sign-in and interactive account linking |
| API authentication | Server looks up a hashed opaque session in the separate demo SQLite DB | Existing pinned adapter Ed25519 verification, issuer/azp/time/subject and ES256 DPoP checks |
| Roles | Fixed server-side fixture map; browser cannot supply arbitrary claims | Signed `realm_access.roles`; admin client role under `realm-management` |
| Memory access | Existing owner/agent/grant/revocation checks on every backend request | The same application checks, applied to Tide-verified principals |
| Realm governance | Integration plan and an admin-only synthetic roster endpoint; no approval simulation | Existing direct browser-to-Tide IGA requests and official enclave approvals |
| Storage | Unencrypted `data/sovereign-memory-demo.sqlite`, synthetic data only | Separate `data/sovereign-memory.sqlite`; still unencrypted prototype storage |

## Role matrix

| Simulated identity | Create/manage owned memories | Read through Agent Access Lab | Inspect synthetic roles |
| --- | --- | --- | --- |
| Owner | Yes | No: not an agent | No |
| Study Agent | No | Only explicitly granted memories | No |
| Finance Agent | No | Only explicitly granted memories | No |
| Administrator | No | No automatic memory access | Yes |

Category does not itself authorize access. The initial two synthetic samples grant the matching agent. An owner may explicitly grant another agent; revocation blocks subsequent reads. Repeated sample preparation never restores a revoked grant.

## Isolation and activation

`npm run demo` explicitly sets `AUTH_MODE=simulation` plus `SIMULATION_LOCAL_ONLY=yes` and binds Next.js to `127.0.0.1`. Simulation API requests require a loopback host; mutations require the exact same Origin. Sessions expire after one hour, rotate when identities change and are invalidated on sign-out. Tokens are stored only as SHA-256 hashes. Selecting an identity is intentionally not proof of identity: anyone using the local demo can choose the administrator.

`npm run start` / `npm run dev` retain real Tide mode by default. Simulation endpoints are unavailable there and simulation cookies cannot authenticate real APIs. There is no automatic fallback if Tide is unavailable. No fake adapter, Tide token, signature, DPoP proof, approval count or encrypted payload is generated. The real `.env`, partial realms and Docker volume were not altered for simulation.

Only the two synthetic sample titles/IDs are shared across demo roles for convenient allowed/denied tests; no sample plaintext is returned without an active grant. Real Tide mode retains its original metadata visibility rules.

After Tide activation is actually repaired, complete enrollment and export the real public adapter, stop the simulator and launch ordinary Tide mode. Verify real login and governance separately; demo/test results are not evidence of Tide protection. See `TIDE_SETUP_BLOCKER.md` for the unresolved real activation failure.
