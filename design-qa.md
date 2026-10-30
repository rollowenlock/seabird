# Design QA — calm proportional timeline

- Source visual truth: inline user screenshot in this conversation; no filesystem path was supplied
- Source pixels: 998 x 936
- Implementation: local build at `http://127.0.0.1:4318/` using the same six-stage 2 Nov to 27 Nov schedule
- Implementation screenshot: in-app Browser capture from tab 18 in this run; browser captures have no filesystem path
- Requested browser viewport: 1000 x 900; measured page viewport: 962 x 865 with a 947 px document client width
- Density normalization: browser CSS pixels at 1x; comparison focused on the timeline region because the project title and authentication state differ
- State: Today is before a six-stage project beginning 2 Nov

## Full-view comparison evidence

The source page showed the schedule at the top, but each duration segment also carried its own date, wrapped name, and owner. Those independent rows made the line look irregular even though the bars themselves were proportional. The revised view preserves the same page hierarchy and schedule card size while reducing the timeline to one segmented track plus one aligned label row.

The revised desktop document measured 947 px wide with a 947 px body width, so no horizontal overflow was introduced. At the narrow check, the document and body both measured 361 px inside a 375 x 812 page viewport.

## Focused timeline comparison evidence

The focused comparison shows six bars on one baseline and six labels on one baseline. The measured track widths were 32, 209, 61, 357, 61, and 61 px; the corresponding label widths were 30, 219, 59, 355, 59, and 59 px. This preserves the meaning of duration instead of imposing an unrelated equal grid.

Kick-off remains fully readable despite being a point milestone. The adjacent Direction label receives enough separation to avoid collision. The long working stage is shortened visually to “Animate” and Final delivery to “Delivery”; the complete names and dates remain in each stage button's accessible name and the details dialog.

## Findings and comparison history

- P1 — timeline metadata formed several uneven visual rows.
  - Fix: separated the proportional track from its desktop labels, removed owner names from the compact timeline surface, and placed dates consistently below stage names.
  - Post-fix evidence: every label top measured 252 px and every bar shares the same track baseline.
- P1 — the first iteration used an equal label grid that weakened the relationship between labels and duration.
  - Fix: labels now inherit the same duration weight as their matching bars.
  - Post-fix evidence: each measured label width now closely matches its corresponding segment width.
- P2 — the zero-duration Kick-off label initially truncated, then touched Direction when allowed to overflow.
  - Fix: retained the full point label and added 12 px separation to the following label.
  - Post-fix evidence: the final desktop capture shows both names fully and distinctly.

## Required fidelity surfaces

- Fonts and typography: existing DM Sans hierarchy, weights, and sizes retained; only compact timeline names use the existing shortening helper.
- Spacing and layout rhythm: the track is 8 px high, labels share one top baseline, and dates share one secondary baseline.
- Colors and tokens: existing making, reviewing, delivery, Today, current, and neutral tokens are unchanged.
- Image quality and assets: the timeline contains no imagery or substituted assets.
- Copy and content: full stage names, dates, owners, and interaction details remain available; only the dense visual summary is reduced.

## Verification

- Automated tests: 39 passed.
- Desktop: proportional track and label widths correspond; no horizontal overflow.
- Mobile: desktop labels are hidden, Stage details remains visible, and no horizontal overflow occurs.
- Primary interaction: selecting Direction opens its correct 2 Nov to 9 Nov details dialog.
- Browser console: no errors or warnings.

final result: passed
