# Seabird

Seabird helps freelancers price projects and present the scope, commercial terms and schedule on one simple client page. In the mockup, Roll is the studio using Seabird and Northlight Films is their client.

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
- Six expandable overview cards, with one open at a time.
- Agreement view shows a styled webpage and generates a downloadable PDF only on request, including all scope, specifications, stage responsibilities, dates, payments, terms and blank signature/name/date lines for both parties.
- Browser-local drafts and JSON backup/import.

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

Review the commercial wording and pricing defaults. The cards and PDF download have been checked in desktop and mobile browser layouts, and the sample PDF has been rendered and inspected. PDF signatures are blank spaces for signing externally; the app does not capture signatures or send emails. Decide whether to add durable server storage, stable revocable client URLs and recorded acceptance. Working-day calculations currently skip weekends but not public holidays.

PDF generation runs locally in the browser using the vendored pdfmake 0.2.20 distribution and its bundled Roboto fonts in `dist/vendor/`. The library is loaded only when clicking Download PDF; project data is not sent to a PDF service.

## Hosting

Live app: https://seabird-umber.vercel.app

GitHub repository: https://github.com/rollowenlock/seabird

The Vercel project `seabird` is connected to this repository. Pushes to `main` deploy to production; other branches receive preview deployments. `vercel.json` serves `dist/` and runs `npm test` before deployment. Production is accessible without a login. Drafts still remain in the browser that created them.
