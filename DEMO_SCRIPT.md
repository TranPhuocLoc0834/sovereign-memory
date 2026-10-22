# Two-minute demonstration

## Current simulation walkthrough

Lead with the user's problem, not a permissions test. A student working on Project Alpha wants a study assistant to know the presentation date and a finance assistant to know the budget, without giving both all the context. The product demonstrated is a memory store with per-agent sharing, revocation and scoped access history.

Use [the complete Vietnamese storyboard and voiceover](HUONG_DAN_QUAY_DEMO.md) as the recording script. Start with `npm run build`, then `npm run demo`, and open `http://localhost:3000`. Keep the **SIMULATION — NOT PROTECTED BY TIDECLOAK** notice visible. Seed the existing samples before recording so the finance budget is ready.

1. **0:00–0:15 — Problem:** explain the two tasks and why sharing all context is unnecessary.
2. **0:15–0:35 — Capture context:** as Owner, use New memory to create a new Study note with the Friday presentation date. Show the saved note; do not merely load a fixture and call that creation.
3. **0:35–0:48 — Deliberate sharing:** grant Study Agent read access to that new note and copy its UUID. The finance budget has its own grant for Finance Agent. Category alone does not authorize access.
4. **0:48–1:07 — Useful, scoped access:** switch to Study Agent, paste the new note's UUID in Agent Access Lab and show the date. Then request the budget sample and show that no content is returned. Narrate the benefit, not just HTTP 200/403.
5. **1:07–1:18 — Another task still works:** switch to Finance Agent and show its granted budget. Sharing selectively does not mean blocking every useful request.
6. **1:18–1:42 — Control when needs change:** as Owner, revoke Study Agent on the new note and copy that same UUID again. Retry as Study Agent and show denial. Do not accidentally test the old seeded study note; custom notes are not among the two sample target chips.
7. **1:42–1:52 — Accountability:** as Owner, show the allowed/denied requests and revocation in Security Logs. Explain who requested what, when and the result; this is not an immutable log against the database operator.
8. **1:52–2:00 — Outcome and boundary:** summarize one context store, selective sharing and revocable future access. Identity is simulated, real Tide protection is unverified and SQLite holds plaintext synthetic data.

The app does not include an LLM, chatbot, autonomous agents, scheduling or budget analysis. The agent personas exercise the memory API; do not pretend they generated a study plan or financial advice. Administrator-role API testing is optional supplementary footage, not the main two-minute product story. The real-mode script below remains a future verification target, not a script for claiming the simulation is real Tide.

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
