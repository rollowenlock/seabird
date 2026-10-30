# Design QA — mobile Today marker

- Source visual truth: `C:\Users\Home\.codex\codex-remote-attachments\01a18660-74ae-7811-ab1a-d9dd44338729\29ED1B45-5D99-4F61-A63B-9B89F316C4C9\1-Photo-1.jpg`
- Implementation: local capture at `http://127.0.0.1:4318/#project=…`, then the same build verified at `https://seabird-umber.vercel.app/#project=…`
- Implementation screenshot: in-app Browser captures from local tab 11 and live tab 16 in this run; browser captures have no filesystem path
- Requested CSS viewport: 390 × 844; measured page viewport: 375 × 812 after in-app browser chrome
- Source pixels: 591 × 1280, corresponding to approximately 390 × 844 CSS pixels at 1.515 density
- State: today is before a future project start; the Kick-off milestone is at the left edge

## Full-view comparison evidence

The supplied phone screenshot and the corrected local phone capture were compared at the same narrow responsive state. The schedule remains fully visible within its card, the stage picker remains below it, and the following content keeps the same reading order. The page measured 361 px wide inside a 375 px viewport, so it does not introduce horizontal overflow.

## Focused timeline comparison evidence

The timeline region needed a focused comparison because the source issue was concentrated at its left edge. In the source, the Today dot and current-stage outline overlap and the narrow Kick-off label wraps vertically. In the corrected capture, the out-of-range Today marker retains its label and guide line but has no duplicate dot, and the zero-duration milestone relies on its stage number plus the full name in the stage picker rather than rendering a broken label.

## Findings and comparison history

- P1 — overlapping Today and current-stage markers at the schedule edge.
  - Fix: classify before/after-schedule markers and suppress only their terminal dot.
  - Post-fix evidence: the local phone capture shows one clean edge indicator while the accessible label still reads “Today, 30 Oct, is before the project starts.”
- P1 — Kick-off wraps into a vertical word in its zero-duration mobile segment.
  - Fix: hide only the compact inline name for point milestones on mobile; retain stage number, accessible button name, and the full picker option.
  - Post-fix evidence: the first segment is uncluttered and “1. Kick-off · 2 Nov” remains available in Stage details.

## Required fidelity surfaces

- Fonts and typography: unchanged DM Sans hierarchy; removed the pathological narrow-word wrap.
- Spacing and layout rhythm: timeline, picker, legend, and following section retain their established spacing.
- Colors and tokens: existing neutral, green, review, and Today colors are unchanged.
- Image quality and assets: no product imagery or asset substitutions are involved.
- Copy and content: no copy was added or changed; full milestone wording remains accessible.

## Verification

- Primary interaction retained: the Stage details selector exposes every complete stage name.
- Browser console: no errors or warnings.
- Automated tests: 36 passed.
- Desktop: the point milestone name remains visible and the full-width schedule is unchanged.
- Live: the promoted canonical URL reproduces the corrected phone layout.

final result: passed
