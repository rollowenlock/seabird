# Design QA — efficient mobile project hierarchy

- Source visual truth: `C:\Users\Home\.codex\codex-remote-attachments\01a18660-74ae-7811-ab1a-d9dd44338729\DB6BD841-7E38-4F15-BA1A-02AFCB228354\1-Photo-1.jpg`
- Source pixels: 591 x 1280
- Implementation: local component-state rendering at `http://127.0.0.1:4318/qa-progress.html` using the production stylesheet and exact project-state markup; the temporary QA file was removed before commit
- Implementation screenshot: in-app Browser capture from tab 19 in this run; browser captures have no filesystem path
- Requested CSS viewport: 390 x 844; measured page viewport: 375 x 812 after in-app browser chrome
- Density normalization: source phone capture compared against the implementation's 375 x 812 app viewport; browser chrome excluded from layout measurements
- State: signed-in project, Kick-off upcoming, no waiting reason, two immediate actions and three secondary actions

## Full-view comparison evidence

The source used most of the first screen for three separate oversized blocks. From the start of app content, the project identity occupied roughly 312 source pixels, the Today card roughly 377 pixels, and “What we're making” did not begin until around source y=923.

In the implementation, the project heading measured 89 CSS px, the Today card measured 135 CSS px, and “What we're making” began at y=289. The phone view therefore exposes the project identity, current status, primary actions, description, deliverable state, and timing tags within the first viewport. The body and document widths both measured 375 px, so the density reduction introduces no horizontal overflow.

## Focused hierarchy comparison evidence

- Project identity: the title falls to a single 32 px line at this width, the repeated description is removed from the heading, and Edit project becomes a quiet text action.
- Today status: label, stage, due state, and owner remain visible, but the card uses 13 px vertical padding and one action row.
- Actions: Mark complete and Waiting on remain immediate. Change plan, Change project, and Activity are preserved under one More disclosure.
- Project content: the description appears once, under “What we're making,” at 24 px with tighter supporting copy and tags.

## Findings and comparison history

- P1 — the mobile page repeated full display hierarchy across the project title, Today card, and project description.
  - Fix: reduced the mobile title scale, removed the duplicate heading description, tightened section spacing, and reduced the “What we're making” display scale.
  - Post-fix evidence: the overview now begins at y=289 instead of below the source's first 900 pixels of app content.
- P1 — five always-visible workflow buttons made the current-status card taller than its information.
  - Fix: retained the two immediate actions and moved the three secondary actions into a native More disclosure.
  - Post-fix evidence: the Today card measures 135 px and the opened menu shows Change plan, Change project, and Activity without moving the page.
- P2 — Edit project had the visual weight of a primary action despite being a secondary maintenance task.
  - Fix: converted it to a small underlined text action on mobile while retaining the existing desktop button.
  - Post-fix evidence: project identity reads first and the edit affordance remains visible directly below it.

## Required fidelity surfaces

- Fonts and typography: existing DM Sans retained; mobile project title is 32 px, current stage 20 px, and project description 24 px.
- Spacing and layout rhythm: mobile heading, Today card, overview, and tag gaps are reduced; desktop spacing remains unchanged.
- Colors and tokens: existing neutral, status green, border, and primary-action tokens are unchanged.
- Image quality and assets: no imagery or asset substitutions are involved.
- Copy and content: no project data or workflow actions were removed; duplicated presentation was consolidated.

## Verification

- Automated tests: 39 passed.
- Mobile: 375 x 812 measured viewport, no horizontal overflow.
- More disclosure: opens and exposes all three secondary actions.
- Desktop: project description remains visible, desktop heading scale remains responsive, and the progress card remains compact.
- Browser console: no errors or warnings.

final result: passed
