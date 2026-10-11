# ROLL Project Notes

A small app for pricing title-sequence projects and presenting the scope, commercial terms and schedule on one simple client page.

## Run locally

Requires Node.js 22 or newer. There are no npm dependencies to install.

```sh
npm run dev
```

Open http://127.0.0.1:4318. On Windows PowerShell, use `npm.cmd run dev` if script execution policy blocks `npm`.

```sh
npm test
```

## Current version

- Editable projects, deliverables, client materials and commercial terms.
- Day-rate estimate with a separately adjustable client fee and currency.
- Deposit/balance split linked to kick-off and delivery.
- One clickable timeline; review durations shift subsequent stages, skipping weekends.
- Client preview and shareable, read-only project snapshots without internal rates or costs.
- Browser-local drafts, JSON backup/import, and client print/PDF view.

The initial project is fictional example content. Commercial wording is editable starter content, not a complete approved contract.

## Data and sharing

Drafts are stored in this browser's local storage, not on a server or in GitHub. Export backups before moving browsers or clearing storage. There is no account system or device sync.

Shared project data is encoded in the URL fragment, not encrypted or digitally signed. Anyone with the complete link can read it and could create an altered copy. Each link is a snapshot: subsequent edits require a new link, and existing links cannot be revoked. This version does not record acceptance, signatures or payments.

For remote client sharing, deploy `dist/` to an HTTPS static host accessible without login. A localhost link works only on the machine running the app. Repository creation does not publish the app. The source repository can remain private while the deployed app is public; the public app does not contain your browser's drafts.

## Structure

- `dist/index.html` — page shell
- `dist/style.css` — responsive interface
- `dist/app.js` — editing, local persistence and client view
- `dist/model.js` — schedule calculations, validation and snapshot encoding
- `server.js` — local preview server
- `test/model.test.js` — model checks

`dist/` is maintained source, not generated build output. Google Fonts is the only external presentation request, with a system-font fallback.

## Before everyday client use

Review the commercial wording and pricing defaults. Browser interaction and mobile layout verification are still pending. Decide whether to add durable server storage, stable revocable client URLs and recorded acceptance. Working-day calculations currently skip weekends but not public holidays.

GitHub is the source of truth. Hosting is not yet configured.
