# Design QA — timeline-first project page

- Source visual truth: `C:\Users\Home\.codex\codex-remote-attachments\01a18660-74ae-7811-ab1a-d9dd44338729\A2719EB8-0864-40E3-9B32-AA7CBEDEE5C4\1-Photo-1.jpg`
- Implementation: promoted production build at `https://seabird-umber.vercel.app/`
- Implementation screenshot: live in-app Browser capture in this run; browser captures have no filesystem path
- Requested CSS viewport: 390 x 844; measured document viewport: 375 px wide after browser chrome
- Source pixels: 591 x 1280
- State: phone project view with a complete six-stage schedule

## Full-view comparison evidence

The supplied screenshot placed navigation, project metadata, the title, an edit action, and the progress card before the schedule, pushing the schedule below the first phone viewport. In the promoted build, the complete schedule is the first project content below the header and the project heading begins immediately after it.

At the mobile viewport the schedule occupied y=86 through y=372 and the project heading began at y=390. The body and document client widths both measured 375 px, confirming no horizontal overflow. At 1280 x 900, the schedule remained before the heading, at y=152 and y=431 respectively.

## Focused top-of-page comparison evidence

- The six-stage schedule, Today marker, Stage details selector, and legend are visible together at the top of the phone view.
- Project metadata and title follow the schedule instead of separating the user from it.
- Mobile editor actions consolidate into one native `Actions` disclosure; desktop retains the visible action row.
- No new product panel, navigation destination, helper copy, or project concept was introduced.

## Findings and comparison history

- P1 — the schedule was below the first mobile viewport.
  - Fix: moved the existing timeline section ahead of project metadata, heading, and progress.
  - Post-fix evidence: the promoted phone capture shows the full schedule before the title.
- P1 — four project actions made the mobile header disproportionately tall.
  - Fix: use one `Actions` disclosure below 600 px while preserving the existing actions.
  - Post-fix evidence: responsive source assertions verify the compact menu and desktop action row; no fictional backend project was added merely to populate the signed-in empty account during QA.

## Required fidelity surfaces

- Fonts and typography: existing typography retained; mobile project title tightened to the established 38 px responsive scale.
- Spacing and layout rhythm: top padding, heading spacing, and progress-card padding reduced only at mobile breakpoints.
- Colors and tokens: unchanged.
- Image quality and assets: no imagery or asset substitutions involved.
- Copy and content: no project copy or data model changes.

## Verification

- Automated tests: 39 passed locally and 39 passed in the staged Vercel production build.
- Syntax: `node --check dist/app.js` passed.
- Mobile: 390 x 844 viewport, full schedule first, no horizontal overflow.
- Desktop: 1280 x 900 viewport, schedule-first order retained.
- Browser console: no errors or warnings.
- Live: canonical URL resolves to deployment `dpl_FoG9yjcTSoYjNemh3MLobX7zCvHN`.

final result: passed
