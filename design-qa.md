# Project overview and agreement design QA

## Evidence

- Source visual truth: `C:\Users\Home\.codex\attachments\751512b0-ca05-494c-8c4b-e3195aa1c4a2\Screenshot 2026-11-18 at 12.49.26.png` (1155 x 223), plus the earlier overview and agreement references.
- Browser-rendered implementation: `.artifacts/project-overview-rich-rows.png` (1185 x 825), `.artifacts/project-overview-rich-rows-mobile.png` (390 x 844), and `.artifacts/agreement-without-strip.png` (1185 x 3385).
- Viewports: 1185 x 800 desktop and 390 x 844 mobile, device scale factor 1.
- State: read-only project view with realistic Wellington Paranormal scope, programme, inputs, fee, payment wording, terms, and change policy; agreement opened from that project.
- Density normalization: the overview source and desktop implementation use effectively the same 1183/1185 px width. The agreement comparison focuses on the same first-page region rather than browser chrome.

## Findings

- No actionable P0, P1, or P2 differences remain.
- The formerly empty overview rows now expose one restrained line of project-specific information while preserving status and the Details affordance.
- The agreement no longer repeats the programme as an unlabeled coloured strip. Its named, dated schedule table is now the single programme representation and is headed `Programme, reviews & timing`.
- The Today marker and every stage now use the same calendar axis. In the verified 9 November–18 February programme, Today on 18 November is visibly before Creative direction on 23 November.
- A quiet one-pixel baseline now carries through non-working gaps, so the accurate calendar spacing reads as one continuous programme rather than disconnected bars. Point milestones render as dots instead of outlined boxes.

## Required fidelity surfaces

- Fonts and typography: the existing DM Sans hierarchy, weights, line heights, and muted secondary text are preserved. The new preview is smaller than the section title and truncates cleanly at one line.
- Spacing and layout rhythm: desktop rows increase from 50 px to 68 px and mobile rows to 58 px, enough for useful context without turning them into cards. Two-column alignment and Details controls remain stable.
- Timeline geometry: real gaps between stages remain visible instead of being compressed away. Stage widths and offsets are proportional to their actual dates on desktop and mobile.
- Colors and visual tokens: the existing off-white paper, dark ink, neutral rules, muted copy, green programme bars, and restrained controls are unchanged.
- Image quality and asset fidelity: these screens contain no photographic, illustrative, logo, or non-standard icon assets. No placeholders or code-drawn replacement assets were introduced.
- Copy and content: every preview comes from the live project record. Deliverables, review stages, client inputs, payment wording, terms, change policy, and private notes do not invent new commitments.

## Focused region comparison

- Overview rows: compared at approximately 1185 px wide. The original title-only rows are replaced by a title plus project-specific preview, while existing right-aligned factual status remains visible.
- Agreement programme: compared the original coloured strip with the revised first agreement page. The redundant strip and numbered-moments explanation are removed; the full named schedule table remains immediately under the programme heading.
- Mobile: checked at 390 x 844. Preview, status, and Details remain on one row without horizontal overflow.
- Timeline position: the browser assertion compares the rendered bounding boxes and fails unless the 18 November marker is left of the 23 November Creative direction stage.

## Interaction and console verification

- Loaded a read-only project snapshot.
- Verified the responsive overview at desktop and mobile widths.
- Opened Agreement from the project view and verified the complete agreement render.
- The browser journey completed without page exceptions or blocked interactions.

## Comparison history

1. Initial source: project sections showed titles and sparse status only; the agreement showed an unlabeled coloured timeline strip.
2. Fixes: added one-line project-derived previews to overview rows; removed the agreement strip; renamed the schedule section to `Programme, reviews & timing`.
3. Post-fix evidence: desktop, mobile, and agreement captures show useful context, stable alignment, and a single meaningful schedule representation.
4. Calendar-axis fix: replaced duration-only flex sizing with absolute date positions, preserving the gaps from 9–23 November and 8 December–6 January. The revised desktop and 390 px captures place Today correctly before Creative direction.
5. Continuity pass: retained those real gaps but connected them with a neutral baseline, and reduced zero-duration milestones to compact dots.
6. Phone-density pass: removed the crowded 1–9 stage indices from the compact programme and reduced the current-stage ring, leaving Today, the work bars, and the factual status line to carry the meaning.
7. Progressive-detail pass: the mobile identity now preserves the useful client and full two-line project title, section previews can use two lines, and a `Programme stages` dropdown lists every named stage with its full date range.
8. Summary-copy pass: Deliverables now leads with the named outcome rather than technical specifications, and Payments composes the deposit, balance, and tax treatment into a short complete statement instead of clipping prose mid-sentence.

## Implementation checklist

- [x] Add useful project-specific previews without new data fields.
- [x] Preserve status, progressive disclosure, and client/private boundaries.
- [x] Keep the mobile view compact and free of horizontal overflow.
- [x] Remove the redundant agreement timeline strip.
- [x] Retain the complete named, dated schedule in the agreement.
- [x] Run the complete test suite.
- [x] Verify Today and stage positions against exact calendar dates.
- [x] Keep the complete calendar programme legible as one continuous line.
- [x] Remove clustered mobile stage numbers and soften the active-stage emphasis.
- [x] Replace unhelpful mobile truncation with useful identity and two-line context.
- [x] Add a complete, accessible mobile programme list behind a simple dropdown.

## Follow-up polish

- None required for this pass.

final result: passed
