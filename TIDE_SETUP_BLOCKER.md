# Real Tide activation failure — support handoff

## Environment

- Observed: 22 October 2026, approximately 15:22–15:53 Asia/Saigon (08:22–08:53 UTC).
- Windows, Docker Desktop engine 29.9.2, Compose 5.6.1.
- Official image: `tideorg/tidecloak-dev:latest`, image label `0.14.41-DEV`, built 13 October 2026.
- Image source revision: `f9d3e906f73b403e748bc95bb774a380d66c1f8e`.
- Docker Hub's latest digest was checked and matches the running image: `sha256:3f52d0bc3e4e3ae5153e172960003bbe94705cd40af6561fd4c7c4434aaa2708` (tag updated 19 October 2026).
- Local endpoint: `http://localhost:8080`; fresh realm: `sovereign-memory`.
- The owner supplied a real licence email and explicitly accepted Tide’s terms. Values are held in ignored `.env`, omitted here.
- Complete official realm template imported successfully; no application users have been created/enrolled.

## Initial supported operation and actual result

`POST /admin/realms/sovereign-memory/vendorResources/setUpTideRealm`

Form-encoded `email` (the user-supplied address) and `isRagnarokEnabled=true`, with an on-demand master-admin token. No hardcoded credential, missing-email fallback, JSON body, or skipLicense option was used.

Result: **HTTP 500**. Local server log:

```text
[Midgard] FinalizeWallet failed: HttpRequestException:
Response status code does not indicate success: 500 (Internal Server Error).
TIDE-IDPEXT-VENDOR-KEYGEN_FAILED
The vendor key was created but the license could not be set up.
```

The failing call is `TideVendorLifecycleManager.FinalizeVendor` → `Midgard.FinalizeWallet`. This establishes a real dependency failure; it does not establish whether the root cause is the current image, account state, or an upstream service defect.

## Retained partial state

- Realm exists, enabled, still reports default signing algorithm RS256.
- Tide identity provider exists, as does the `tide-vendor-key` component.
- No active `gVRK` or `gVRKCertificate`.
- A pending `gVRK` is exposed by the component API, but it is not a usable active signing key. Provider-hidden fields omitted from that API cannot be assumed absent.
- `isPendingLicenseActive` returns true, which does not correspond to a usable active signing key here.
- No pending IGA requests; Tide-mode IGA has not been enabled because licensing did not complete.
- No real app adapter was produced.

## Recovery checks already performed

1. Ran Tide’s official doctor: application wiring, relay and secrets checks pass; adapter is missing. Its optional realm check lacks jq on this Windows host; separate Node requests inspected the real realm directly.
2. Retried the documented setup call once, following the server’s retry instruction. It returned HTTP 500 with `TIDE-IDPEXT-VENDOR-REALM_SETUP_FAILED` and a duplicate `tide` identity-provider constraint. It does not resume this partial state idempotently.
3. Called documented `POST .../vendorResources/force-gen-vrk` once, only after verifying this is a new realm with no users. It returned HTTP 200, but subsequent reads still found no active gVRK/certificate.
4. Requested the real public adapter via `get-installations-provider`. It returned HTTP 500. The server log shows `VendorResource.formatJwk`: the signing key’s `getPublicKey()` is null.
5. The logs additionally report `DetermineGVRKExpiry ... Insufficient data to read` for this incomplete state.
6. Verified the installed `VendorResource` and lifecycle implementation (without changing the server). `CreateTideVendorKey` resumes an existing vendor lifecycle; `force-gen-vrk` is not an activation substitute. The latter experimental helper was removed.
7. Called `POST .../vendorResources/CreateTideVendorKey` with form `licensingTier=free` and the already-authorized email. Local response: HTTP 500. **Inner `Midgard.FinalizeWallet` response: HTTP 403 Forbidden**, at approximately 08:43 UTC.
8. Reproduced in one isolated fresh realm, `sovereign-memory-recovery`, preserving the primary realm. Initial activation: inner HTTP 500 at 08:51:10 UTC. Official resume endpoint: inner HTTP 403 at 08:51:44 UTC. This second realm had not been subjected to `force-gen-vrk`.
9. Tested disabling optional Ragnarok backup only in the unused recovery realm. Finalization still returned inner HTTP 403 at 08:53:01 UTC. **The original IdP configuration was restored after failure.** No reduced-security setting was retained.

No realm was deleted, no keys were substituted, no staging image or network override was introduced, and no security result was simulated. Both unused partial realms and the volume remain intact for support investigation. The application still targets `sovereign-memory`; the recovery realm is not an app authentication fallback. No paid tier or payment was authorized.

## Local connection diagnosis repaired

The application health route previously returned early when the adapter was absent, so it never tested the running broker. It now separately reports `broker`, `adapter`, `authentication`, and a reason code. Matching OIDC discovery proves only reachability. A missing adapter keeps sign-in disabled, authentication not-ready and governance unverified. No master credential is used by this public health check.

## Next required action

Ask the Tide team to investigate why initial free-tier `FinalizeWallet` returns 500 and subsequent finalization returns 403 on 0.14.41, including the fresh-realm reproduction. This is not evidence of a global outage; account/license state and the image or upstream service remain possible causes. Provide this sanitized report and the logs if requested; do not send `.env`, master tokens, component configuration values, or invitation URLs. Do not keep retrying initial setup, regenerate cryptographic state, delete realms, or create additional realms to bypass the failure.

Official support referenced by Tide MCP: [Tide Discord](https://discord.gg/XBMd9ny2q5) or info@tide.org. No message has been sent externally.

After the actual vendor key/certificate is active, resume the remaining canonical setup: Tide-mode IGA, test users and grants, first-admin enrollment, signed IdP settings, first admin-role grant, adapter export and real browser sign-in. Then verify a real governed request with threshold ≥ 2 before claiming the no-single-administrator demonstration.
