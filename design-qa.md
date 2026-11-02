# Project builder design QA

## Evidence

- Source visual truth: `C:\Users\Home\.codex\generated_images\01a195d8-8754-7be1-9914-442c7af5be63\exec-c052f328-40be-45ec-a8ce-9f4d0943181d.png`
- Browser-rendered implementation: `qa/project-builder-brief-mobile.png`
- Review state: `qa/project-builder-review-mobile.png`
- Created working-project state: `qa/project-builder-created-mobile.png`
- Combined full-view comparison: `qa/project-builder-comparison.png`
- Viewport: 390 x 844 CSS px, device scale factor 1, mobile and touch enabled.
- Source pixels: 853 x 1844. The source was normalized to 390 px wide, approximately 390 x 843, in the combined comparison.
- Implementation pixels: 390 x 859 for the complete first screen; the visible browser viewport is 390 x 844.
- State: project brief filled with the reference content, brief focused, account defaults visible, no settings disclosure open.

## Findings

- No actionable P0, P1, or P2 differences remain.
- [P3] The source uses small document, attachment, settings, and arrow icons. The implementation keeps those actions as clear text controls rather than introducing a new icon dependency. This slightly reduces decorative fidelity without changing hierarchy or usability.
- [P3] The headless QA environment denied the external Google Fonts request. The browser rendered the declared Arial fallback; production can load the existing DM Sans import. There were no JavaScript exceptions or application console errors.

## Required fidelity surfaces

- Fonts and typography: hierarchy, weight, line height, letter spacing, wrapping, truncation, and small-label optical weight were checked at 390 px. The post-fix headline remains on one line like the source. The QA capture used the fallback because external font access was denied.
- Spacing and layout rhythm: the normalized source and implementation now occupy effectively one 390 x 844 screen. Header, headline, brief card, explanation, defaults strip, CTA, reassurance, and alternate route follow the same order and density. Borders, radii, and the restrained flat treatment match the Seabird system.
- Colors and visual tokens: off-white background, dark ink, muted secondary text, pale account-default panel, fine neutral borders, and restrained green primary action match the selected direction.
- Image quality and asset fidelity: there is no photographic or illustrative content. No source imagery was replaced with placeholders or generated code art. The remaining source icons are intentionally omitted and recorded as P3.
- Copy and content: the selected structure is preserved. Product copy was corrected to describe a live working project containing deliverables, programme, payment plan, and engagement terms rather than presenting Seabird as only a proposal generator.

## Focused region comparison

A separate crop was not needed. At 390 px the combined comparison keeps every first-screen control and label legible. The longer review and created-project states were captured separately to verify their complete layouts.

## Interaction and console verification

- Filled the project brief.
- Built the first set of suggestions.
- Verified prefilled client, deliverable, technical specification, programme, estimate, deposit, payment plan, and engagement terms.
- Created the working project through the final CTA.
- Verified the resulting live project screen and working-project status.
- Console check: one denied external font request from the restricted QA environment; no page exceptions or app errors.

## Comparison history

1. Initial comparison: `qa/project-builder-brief-mobile.png` was 390 x 1019. P2 findings were excessive vertical density on the first screen and a sticky review action bar that covered a field in the full review state.
2. Fixes: reduced only the mobile builder headline, brief field, explanatory copy, defaults strip, gaps, and CTA height; removed the sticky review action bar.
3. Post-fix evidence: the first screen is 390 x 859 and matches the normalized source's single-screen composition. `qa/project-builder-review-mobile.png` shows the complete review without obscured fields. No P0, P1, or P2 findings remain.

## Implementation checklist

- [x] Match selected option 3 at the mobile viewport.
- [x] Use real account defaults and editable first guesses.
- [x] Include deliverables, programme, engagement terms, and payment plan.
- [x] Create the project only after explicit review.
- [x] Verify the complete working-project path in a browser.
- [x] Run the repository test suite.

## Follow-up polish

- Add a small existing-library icon set only if Seabird adopts one elsewhere; do not introduce it for this screen alone.
- Recheck exact DM Sans rendering in an environment with external font access.

final result: passed
