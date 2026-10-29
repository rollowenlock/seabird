# Seabird

Seabird brings Roll’s pricing, scope, schedule, client proposal and agreement together.
Live: https://seabird-umber.vercel.app · Repository: https://github.com/rollowenlock/seabird

## Run and check

Node.js 22 or newer. `npm ci`, then `npm run dev` (Windows: `npm.cmd`).
Open http://127.0.0.1:4318. Run `npm test` for model, agreement, session and real
PostgreSQL policy/version tests (PGlite). Runtime code has no npm dependencies.

## Everyday workflow

1. Open Workspace and sign in using an existing Cookham email/password.
2. On a new device, Seabird loads the account's project list when there are no device drafts. If both exist, export a backup before choosing Load cloud projects.
3. Create or open a project, then edit its price, deliverables, timeline and commercial terms.
4. Save to cloud. Each changed project has its own revision, so an update on one project cannot overwrite another project.
5. Share project → Publish client version → Copy link. Publishing also saves the draft.
6. The client reviews the page or agreement, then enters their name/email and accepts
   the exact published version. No login is needed and no payment is taken.
7. Open Share project to see acceptance history or download the records with the exact
   published content. Publish changes deliberately; old acceptance never approves a new version.

Sign-in survives reloads in the same browser tab. Refresh tokens are kept in session
storage, never passwords; closing the tab ends the saved session. Account drafts have
separate device-storage keys. Signed-out drafts remain separate and can be moved with
JSON export/import. Email onboarding and password recovery are deferred with Cookham SMTP.

Cloud saves use per-project revision checks. A stale save is rejected rather than overwriting
another device. Saving does not publish. Cloud loading requires explicit confirmation when
device and cloud drafts differ; it does not merge. Device drafts are not encrypted; export
before clearing browser storage.

## Client sharing and acceptance

New `#proposal=` links contain a random capability token, not project content. The server
returns only the latest explicitly published client-safe version. Anyone with the link can
view and accept; the entered identity/email is self-declared, not independently verified.
Internal day rates, estimates and costs are excluded in both client code and the database.
There is no public table listing. Revocation stops further reads and acceptance. Replacing
a revoked link generates a new token. It cannot erase copies already downloaded.

Published versions are immutable. Acceptance stores version, name, email, server timestamp
and the exact agreement statement. Retries cannot replace the first acceptance. An outdated
open page must reload and review before accepting. History is visible only to the workspace
owner; the public page shows acceptance time, without the submitted email.

Legacy `#project=` snapshots still open, but cannot be updated/revoked or record acceptance.
The PDF is generated on demand in the browser and can be signed externally. There is no
email sending, payment collection, verified electronic signature, or holiday calendar.
Editable starter contract wording should be reviewed for each real project.

Deleting Seabird cloud data removes its proposals, versions and acceptances as well as the
workspace. It does not remove the shared Cookham identity or other apps. Device copies remain.

## Implementation and release

`dist/` is maintained source. `app.js` edits drafts, `model.js` handles schedules/validation,
`cloud.js` handles sessions and cloud saves, `sharing.js` handles publication and acceptance,
and `agreement.js` renders the webpage/PDF. Vendored pdfmake 0.2.20/fonts generate PDFs locally.

The isolated `seabird` schema lives in Cookham. Editable projects are owner-scoped rows with
independent revisions; the legacy workspace JSON row remains temporarily for a compatible
rollout. See `cookham/README.md` for backend details.
Apply migrations through Cookham’s pinned per-app ledger before releasing the frontend.
Production-only public environment variables generate `dist/backend-config.js`; previews and
local development default to cloud-disabled. Vercel installs with `npm ci`, runs tests and
builds the public configuration. Stage a production build, verify it, then promote it.
