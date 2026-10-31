# Seabird compact project view — design QA

- Source visual truth: `C:\Users\Home\.codex\codex-remote-attachments\01a18660-74ae-7811-ab1a-d9dd44338729\19FCD0A4-06EE-48E7-BB20-E1ADE0928043\1-Photo-1.jpg`
- Implementation screenshot: `.openai/design-qa/implementation-mobile.png`
- Side-by-side evidence: `.openai/design-qa/comparison.png`
- Viewport: 390 × 650 CSS px, device scale factor 1, Pacific/Auckland timezone
- Source pixels: 590 × 1280. The browser chrome was excluded and the 590px app region was normalized to a 390px comparison width.
- Implementation pixels: 390 × 650
- State: collapsed client project snapshot. The owner uses the same shell; private progress actions appear only after expanding Program.

## Full-view comparison

The implementation preserves the reference palette, type character, thin borders, stage colors, Today marker, and calm project hierarchy while intentionally removing the reference's redundant stage selector, legend, standalone progress card, overview block, and permanent edit action. Project identity, Program, Today, and all six project summaries are visible within 650px without horizontal or vertical overflow.

## Focused-region comparison

The Program and summary-list region required focused review because it carries the density target. Stage labels now use compact `R1`, `R2`, and `Final` forms rather than breaking words. Summary rows retain readable titles, commercial/timing summaries, and explicit View affordances at mobile size.

## Findings

No actionable P0, P1, or P2 findings remain.

- Typography: DM Sans, weights, hierarchy, and truncation are consistent with the existing product. Mobile summary text was increased after the first comparison.
- Spacing: the compact rhythm fits all required collapsed information above the fold with clear grouping.
- Colors: existing Seabird tokens and semantic schedule colors are preserved.
- Images/assets: this screen contains no required raster imagery or non-standard icons.
- Copy: every collapsed row carries a job-specific summary; decorative descriptions and numbering were removed.
- Accessibility: native disclosure controls remain keyboard-accessible, stage buttons retain descriptive labels, and only one project disclosure stays open.

## Interaction and regression evidence

- Timeline-stage click opened the correct stage dialog.
- Opening a second project disclosure closed the first.
- Local browser console contained no errors.
- All 39 automated tests passed, including backend privacy, client snapshot, timeline fit, Today positioning, and responsive-layout coverage.

## Comparison history

1. Initial capture found two P2 legibility issues: 9px summary text was too fine, and narrow Review/Delivery labels broke awkwardly.
2. Increased summary typography and row height slightly; shortened track-only labels to `R1`, `R2`, and `Final`.
3. Re-captured at 390 × 650. All six summaries still fit, label breaks are resolved, and no P0/P1/P2 issues remain.

## Follow-up polish

None required for this iteration.

final result: passed
