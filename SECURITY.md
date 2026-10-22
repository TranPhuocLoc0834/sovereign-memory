# Security boundaries

## Explicit local simulation mode

The user requested a simulated sign-in/roles/access demo. `npm run demo` opts into a separate local mode and database. Anyone at the local demo can select any fixture identity, including Administrator: **this is not real authentication or Tide protection**. The app nevertheless makes actual backend ownership, role, active-grant and revocation decisions, not precomputed success/failure responses.

Sessions are random opaque values stored hashed in SQLite, sent in HttpOnly SameSite=Strict cookies, rotated on identity selection, expired after an hour and invalidated on sign-out. The API accepts only loopback same-origin simulation mutations and rejects arbitrary subjects/roles and token headers. Both server environment switches must be explicit. Real Tide mode ignores these cookies and does not expose simulation endpoints. Demo data uses `sovereign-memory-demo.sqlite`, never the default real database.

No Tide signature, proof of possession, encryption or quorum guarantee exists in this mode. The Governance tab is an integration plan plus an ordinary server-side administrator role check, not an approval enclave. Only named synthetic sample IDs/titles are shared for denial tests. Use no real data and never expose the simulator publicly.

The following sections describe the retained **real Tide mode**, not the simulator. Live Tide sign-in and governance remain unverified; see `TIDE_SETUP_BLOCKER.md`.

This prototype separates three mechanisms: Tide identity, application memory authorization, and Tide realm governance. They do not provide interchangeable guarantees.

## Tide identity

The API verifies EdDSA signatures only against the public key embedded in the real adapter exported by TideCloak. There is no remote JWKS fallback and no locally minted production token. Issuer, authorized party (`azp`), required subject/expiry/issued-at, and token validity are checked. Roles are read from the verified token, with memory roles restricted to `realm_access.roles`. The administrator role is specifically `resource_access['realm-management'].roles`.

The resource server verifies the DPoP proof’s ES256 signature, P-256 key, binding thumbprint, access-token hash, request method, URL, timestamp, and unique ID. A SQLite unique constraint records consumed proofs across local workers/restarts. Bearer presentation of a sender-constrained token is rejected. Forwarded host/protocol headers are ignored; direct localhost is the supported deployment.

The public adapter route allowlists public values, rejects confidential clients/private key material, and never returns bootstrap credentials. Bootstrap credentials remain in the ignored server-side `.env` and are not used by the application memory API.

## Application authorization

An agent’s database identity is registered from its verified token subject. A single unambiguous `study-agent` or `finance-agent` role is required on every read; an `agentId` supplied in a request must match that principal and never selects another caller. An active explicit grant is required regardless of category, administrator privileges, or possession of a memory UUID.

Owner operations require `memory-owner` and exact `owner_id` equality. Another owner gets the same unavailable response as a missing record. Session responses disclose owned plaintext only to an authenticated principal carrying the owner role. Agents receive previously granted target metadata, not automatic plaintext. Unknown actors are denied by default.

Revocation updates `revoked_at`; authorization and plaintext selection occur in a single SQL query on the next read. Idempotent sample seeding cannot restore revoked grants. Prepared SQL statements and strict Zod schemas prevent SQL fragments, ownership overrides, and unexpected request fields. Mutation origins and body sizes are checked.

Logs record verified actors, target IDs, decisions and fixed reasons, never memory contents, access tokens, proof material or passwords. Owners see events on their memories and their own actions. Other principals see their own activity. These logs remain editable by a database operator.

## Tide governance

The browser uses its own administrator token for direct documented TideCloak API calls. The app inspects live realm attributes and change requests. It only stages a role grant after the realm reports `isIGAEnabled=true` and `iga.attestor=tide`. HTTP 202 is staging, not successful application. Only role-grant/revocation requests have a commit action in the application.

Approval signatures are generated through Tide’s official console/enclave. The app cannot invent an approval, increase a local counter, or use the master administrator’s password as a proxy for a user approval. Real threshold and readiness fields come from TideCloak. A 412 is evidence of a refused commit; inspect whether the actual cause is quorum or a dependency. It is not automatically proof of quorum enforcement.

Use independently controlled administrator credentials, not three identities controlled by one operator, when making a claim about independent human control. Headcount is not quorum: verify threshold ≥ 2 on the actual request. Tideless software governance is insufficient for the claimed cryptographic authority demonstration.

## Residual trust and deployment limits

The application and SQLite operator can read and modify plaintext memories and ordinary grants. QEA protects supported realm operations, **not arbitrary SQL writes**. A malicious app deployment can also change its verifier, replace its pinned adapter or exfiltrate UI data. This prototype does not solve trusted client distribution or memory E2EE.

Tide role changes appear in newly issued tokens; old tokens can retain roles until expiry (the realm template uses ten-minute access tokens). App-level revocation is checked live and does not wait for token expiry. Data already read cannot be revoked retroactively.

The local deployment has no Internet-facing abuse controls, production TLS termination, audit immutability, data retention policy or backup/recovery guarantee. Do not expose it publicly or use real personal/financial records. The Docker image is a development image; it connects to real Tide network services.
