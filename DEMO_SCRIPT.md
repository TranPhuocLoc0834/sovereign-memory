# Two-minute demonstration

## Current simulation walkthrough

Start with `npm run build`, then `npm run demo`, and open `http://localhost:3000`. Keep the amber **SIMULATION — NOT PROTECTED BY TIDECLOAK** notice visible. Say: "This is a local identity simulation. The backend access checks run, but Tide authentication and cryptographic governance have not been demonstrated."

1. Choose Demo Owner → Prepare demo memories. Show the two synthetic examples and per-agent grants in Memory Vault.
2. Choose Study Agent → Agent Access Lab → study sample → Request access: show HTTP 200 and the reminder.
3. Select the finance sample: show HTTP 403 and no plaintext. Choose Finance Agent and show the opposite allowed/denied pair.
4. Return to Owner → Memory Vault → revoke Study Agent on the study sample. Switch back to Study Agent and show HTTP 403. Explicitly re-grant as Owner if rehearsing again.
5. As an Agent, open Governance and call the admin-only role API → 403. As Demo Administrator, repeat → 200. An Administrator's memory read still returns 403.
6. Show scoped Security Logs and the Tide integration plan. State: "Real mode will replace the fixture session with Tide SDK sign-in and pinned JWT/DPoP verification. Real realm governance still requires Tide's enclave; no quorum approval is simulated here. SQLite contains plaintext synthetic data."

Do not describe this recording as real Tide authentication or a successful cryptographic governance demo. The original real-mode script below remains a future verification target.

## Real Tide demonstration — not yet verified

Do not record until real sign-in and the governance scenario have been verified. Pre-open separate owner, Study Agent, Finance Agent and administrator browser profiles. Prepare synthetic memories and copy IDs. Independently controlled reviewers must be available for real enclave approvals. Hide invitation links, `.env`, passwords, tokens and browser developer tools containing credentials.

## 0:00–0:20 — The possibility and the constraint

“AI assistants work better when they remember context. But sharing memories usually means trusting an application administrator with the rules. Sovereign Memory separates who you are, which memories an agent may read, and who can change identity authority.”

Show Overview. Briefly point out the three distinct layers.

## 0:20–0:40 — The vault

“This owner shares a synthetic presentation reminder with a Study Agent, and a synthetic budget with a Finance Agent. These are separate Tide-authenticated identities. Administrator access alone does not reveal the vault.”

Show Memory Vault and the two explicit read grants. State that prototype SQLite storage is unencrypted.

## 0:40–1:15 — Allowed, denied, revoked

In the Study Agent’s session, request the study UUID. Show HTTP 200 and the reminder. Request the finance UUID. Show HTTP 403 and no plaintext.

“The backend verifies the Tide token and proof of possession, then checks the live grant. Selecting or forging another agent ID cannot change the authenticated caller.”

Revoke the study grant as owner. Repeat its read as Study Agent and show 403. Briefly show the audit entry.

“Revocation stops future reads. It cannot erase a memory already disclosed.”

## 1:15–1:45 — Protected authority

In Governance, retrieve live Tide-mode IGA state. Stage the preselected test role grant. Show HTTP 202 and the actual pending request with threshold ≥ 2.

Attempt commit before enough approvals: show the actual 412 and its quorum-related reason. Complete independent approvals in the official Tide console/enclave, refresh, and confirm the change applied. Time this flow before recording; reduce narration rather than editing in a fake result.

“This is Tide’s protected realm operation. An administrator cannot apply this change alone under the policy shown. Application memory grants remain a separate control.”

## 1:45–2:00 — Impact and boundary

“Agents can share useful context under explicit grants, while changes to identity authority can require independent approval. This prototype demonstrates that boundary honestly: app authorization protects ordinary reads; Tide governs supported realm changes. End-to-end encrypted memory storage is future work.”

## If live governance is unavailable

Do not use the successful-governance narration. Show the actual unavailable state, describe the supported integration that was implemented, and say that independent approval has not been demonstrated. This does not satisfy the full P0 acceptance criteria; do not present it as complete.

## Recording checklist

- Record the application and the real protected operation, not unit tests as a substitute.
- Use the same synthetic data each time; explicitly restore grants before rehearsal.
- Capture real HTTP statuses and actual Tide responses.
- Keep the MP4 at two minutes and under 100 MB; review the exported file for credentials.
- Place the actual recording in the public repository before submission. No video is supplied by this project yet.
