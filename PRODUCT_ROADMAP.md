# Seabird product plan

Updated: 30 October 2026

## Product direction

Seabird helps a small creative studio turn an initial project conversation into a clear,
client-approved plan, then keep that plan useful as the work moves through its stages.

The primary user is currently a solo studio owner or freelancer. The client does not need
an account. Seabird should feel simpler than a general project-management system because its
first job is to get a project clearly agreed and ready to begin.

**Core promise:** create a credible project proposal in less than 15 minutes, share one link,
retain a clear record of exactly what the client accepted, and always understand where the
project is now.

## Product lifecycle

1. A studio owner signs in.
2. They create or reopen a project.
3. They define the deliverables, price, stages, timeline, responsibilities, payment terms and change policy.
4. They preview exactly what the client will see.
5. They publish a versioned client link.
6. The client reviews the proposal and agreement without creating an account.
7. The client records acceptance of that exact version.
8. The studio retains the accepted version and acceptance record.
9. As time passes, Seabird shows the current stage, what is coming next and whether the plan has moved.

Seabird does not need to become a general task manager to remain useful after acceptance. Its job
is to keep the agreed project legible as planned time becomes real time.

## The seven product areas

These are Seabird's canonical product areas. Authentication, cloud storage, sharing, notifications
and analytics support them, but are not the product's organising model.

| Area | Product question | Current position |
| --- | --- | --- |
| **Price** | What will the project cost, what sits behind that figure, and when is it paid? | Strong initial implementation: private costing, agreed fee, currency, tax, deposit and payment wording. |
| **Timeline** | When does the project begin and finish, and what is the overall sequence? | Planned and working timelines use working-day durations; deliberate replanning moves remaining incomplete stages without rewriting the accepted version. |
| **Deliverables** | What exactly is being made and to what specification? | Strong structured implementation with named outputs and technical specifications. |
| **Terms** | What are the rules, responsibilities, rights and consequences of change? | Strong editable implementation; the starter wording still needs content/legal review. |
| **Agreement** | What exact combination of price, timeline, deliverables and terms did the client accept? | Versioned publication, readable agreement, PDF and recorded acceptance are built; the current hosted journey still needs final validation. |
| **Stages** | What are the meaningful phases of the work, who owns each phase and how does work move between them? | Stages now have stable identities, current/upcoming/completed states, confirmation actions and an owner-only activity record. |
| **Time passing** | Where are we today, what should be happening now, what is next and what has slipped? | Built for owner testing: today, working-day countdowns, overdue and waiting states, deliberate replanning and formal project variations. Hosted validation remains. |

The relationship is:

```text
Deliverables + Price + Terms + Stages
                 │
                 ├── create the Timeline
                 └── freeze into the Agreement

After acceptance: Time passing moves through the Stages and tests reality against the Timeline.
```

This creates three clear modes without adding a generic task board:

1. **Define** — deliverables, price, terms and stages.
2. **Agree** — timeline, client view, agreement and acceptance.
3. **Progress** — current stage, elapsed time, upcoming moments, delays and deliberate replanning.

## Status language

- **Live:** deployed and available on a public Seabird URL.
- **Built:** implemented and covered by automated tests, but not released or fully configured.
- **Partial:** useful capability exists, but an important part of the user outcome is missing.
- **Not started:** no meaningful product implementation yet.
- **Needs validation:** code or deployment exists, but the complete real-user journey has not
  been retested in the current release.

## Feature map

| Product area | Status | What exists now | What remains |
| --- | --- | --- | --- |
| Account creation and sign-in | **Partial** | Cookham email/password sign-in and session restoration. Google OAuth UI and callback handling are deployed and tested in code. | Enable Google in Cookham, then test a brand-new account on phone and desktop. Password recovery is not implemented. |
| Projects home | **Live** | Empty state, project count, project cards, reopen project and create project. | Add project status, useful sorting and search only when real accounts have enough projects to need them. |
| Project creation | **Live** | Name, client, description and kick-off date. New projects do not invent commercial figures or sample work. | Improve first-project guidance and provide optional duplication from an existing project. |
| Scope and deliverables | **Live** | Named deliverables with technical specifications and client-safe rendering. | Test the language and editing flow with working studios; consider reusable deliverable templates later. |
| Pricing | **Live** | Private day rate, estimated days and costs; separate agreed fee, currency, tax and deposit. Private workings are excluded from client versions. | Validate whether studios need discounts, line items or multiple currencies within one project before adding complexity. |
| Schedule | **Live** | Working-day stages, review rounds, automatic downstream dates and weekend exclusion. | Public holidays, manual stage dates and changed-project rescheduling are absent. Validate demand first. |
| Terms and responsibilities | **Live** | Client inputs, usage rights, payment terms, commercial terms and changes/delays policy. | Starter wording needs a deliberate content/legal review before broad release. No clause library or studio templates yet. |
| Client preview | **Live** | Studio can preview the client-safe proposal without private estimates. | Run current mobile visual QA and add a clearer readiness check before publishing if testers miss incomplete fields. |
| Agreement and PDF | **Live** | Readable agreement webpage plus on-demand PDF with signature blocks. | The PDF is for external signing; there is no verified electronic signature or accepted-PDF receipt. |
| Cloud project storage | **Live, needs validation** | Owner-scoped project rows, per-project revisions, explicit cloud save/load, device drafts and JSON backup/import. Automated isolation and stale-write tests pass. | Complete a two-device hosted test. Resolve the temporary legacy workspace compatibility path after the new client has been proven. There is no automatic merge. |
| Client sharing | **Live, needs validation** | Random capability links, immutable published versions, republishing, revocation and link replacement. | Complete the current hosted owner-to-client test after Google sign-in is enabled. Add delivery by email only after renewed product approval. |
| Client acceptance | **Live, needs validation** | Name, email, agreement checkbox, version locking, server time and owner-only acceptance history/export. | Identity is self-declared, not verified. Decide whether this is enough for the target customer before considering a signing provider. |
| Project deletion and archiving | **Partial** | Backend supports owner-scoped project deletion and whole Seabird workspace deletion. | Add safe project-level archive/delete UI and recovery expectations. |
| Mobile experience | **Partial** | Responsive styles and earlier mobile checks exist. | Retest the full current create, edit, publish and accept journey on a real phone. |
| Collaboration and permissions | **Not started** | Projects currently have one owner. Clients only receive public proposal links. | Do not build team roles until solo users prove the core workflow and describe a concrete collaboration need. |
| Tasks, files and chat | **Not started** | Seabird has no task board, file store or project chat. | Keep these outside the defined product unless stage and time-passing research demonstrates a specific missing job. |
| Stages as live project state | **Live, needs validation** | Stable stages have current/upcoming/completed states, confirmed completion dates, waiting state and a compact owner-only activity history. Existing projects can identify their current stage without invented historical dates. | Test stage progression on a real project and complete mobile visual QA. |
| Time passing | **Live, needs validation** | Owner view shows today, working-day countdowns, due/overdue state and the next stage. Replanning shifts only remaining incomplete stages; material changes route through a formal variation and new agreement version. Accepted/public dates remain frozen until republished. | Complete hosted and mobile journey validation. Research whether clients should later see progress and whether public holidays matter enough to model. |
| Notifications and email | **Not started** | No email is sent by Seabird. | Possible later work: send proposal, remind client and issue acceptance receipt. This requires renewed approval before setup. |
| Billing | **Not started** | No subscriptions, invoices or payments. | Keep out of the alpha until usage demonstrates value and a charging model is chosen. |
| Product analytics and support | **Not started** | Automated technical tests exist; there is no product event funnel or in-product feedback route. | Add privacy-conscious activation/publish/acceptance events and a simple tester feedback channel before expanding the alpha. |

## Current assessment

Seabird's differentiated core is already built: a studio can combine scope, commercial terms,
schedule, client proposal, agreement and acceptance rather than moving among separate documents.
The repository currently passes **29 automated tests**, including real PostgreSQL policy,
revision, publication, privacy, acceptance and revocation tests.

The product is not yet a dependable alpha for new users because the most important entry point,
Google sign-up, is still awaiting provider configuration. Its code and the time-passing release are
deployed, and the public URL responds successfully, but a complete new-user-to-client-acceptance
journey has not been verified against an enabled Google provider.

## Roadmap

### Milestone 0 — Release the private alpha

Goal: one invited studio can complete the entire core lifecycle without developer intervention.

1. Enable Cookham Google OAuth with the Seabird origin and callback.
2. Deploy the tested Google sign-up implementation to the existing Cookham preview URL.
3. Test a new account from a real phone: sign up, create a project, save it, reload it and reopen it.
4. Publish a client version in the owner session.
5. Open the client link in a signed-out browser, review it and record acceptance.
6. Confirm the owner can see and export the exact acceptance record.
7. Fix every blocker discovered in that journey before inviting testers.

**Exit criteria:** the complete journey passes twice with two fresh accounts, including one phone;
no database or dashboard intervention is required; failed network actions leave the device draft safe.

### Milestone 1 — Make the solo workflow dependable

Goal: five invited studios can use Seabird for a real proposal with minimal guidance.

- Add a short first-run orientation and a visible path from blank account to published proposal.
- Add project archive/delete and duplicate-project actions.
- Clarify local, saving, saved, conflict and offline states in plain language.
- Add a guided conflict choice rather than leaving cloud replacement as a technical concept.
- Run accessibility and mobile checks across creation, all editors, sharing and acceptance.
- Add a small product event funnel and an in-product feedback route.
- Review starter contract language and identify which wording must remain editable or carry a disclaimer.
- Remove the legacy workspace storage path after hosted migration and rollback checks pass.

**Exit criteria:** at least four of five testers publish a real proposal without help; no data-loss
incident; every failure is diagnosable; feedback identifies a repeated next problem rather than basic confusion.

### Milestone 2 — Strengthen client approval

Goal: make sending, reviewing and recording approval feel professionally complete.

- Add proposal readiness checks for incomplete or placeholder content.
- Show a concise change summary when publishing a new version.
- Provide a durable owner/client PDF copy of the accepted version.
- Explore email delivery, reminders and acceptance receipts only after explicit approval.
- Decide from customer evidence whether self-declared acceptance is sufficient or a signing provider is required.
- Add studio-level defaults for payment terms, rights, change policy and common deliverables.

**Exit criteria:** testers trust the acceptance record for their normal work; clients understand what
they are accepting; republishing never creates ambiguity about which version is current.

### Milestone 3 — Make the agreed plan live — released, awaiting journey validation

Goal: keep Seabird useful after acceptance by showing how the real project is moving through the agreed plan.

Built for owner-side validation:

- A clear today marker, current stage and working-day countdown.
- Upcoming stage transitions, client reviews and delivery moments.
- Completed, active, upcoming, waiting and overdue stage states.
- Confirmed completion dates without rewriting the accepted agreement.
- A deliberate replan flow that distinguishes the accepted baseline from the latest forecast.
- A compact private record of why a timeline moved and who is responsible for the next action.

The stage-plan publication migration and matching frontend are live. Next: validate setup,
completion, waiting, replanning and republishing on a real project and mobile browser.

Research whether clients should see live progress and whether reminders belong here. Continue to
exclude task lists, chat, file management, team roles, invoicing and payments until repeated evidence
shows they are required. Stages and time passing should deepen Seabird's plan, not turn it into a
generic task board.

## Prioritised backlog

| Priority | Work | Outcome | Dependency |
| --- | --- | --- | --- |
| P0 | Configure and release Google sign-up | New testers can enter the product | Local browser access for configuration |
| P0 | Full hosted journey test | Establishes an honest alpha baseline | Google release |
| P0 | Fix journey blockers | Makes the first tester session viable | Hosted journey findings |
| P1 | First-run guidance and readiness checks | More users reach a published proposal | Alpha observations |
| P1 | Project archive/delete/duplicate | Makes an ongoing workspace manageable | Confirm deletion/recovery language |
| P1 | Cloud state and conflict UX | Builds confidence that work is safe | Two-device testing |
| P1 | Mobile and accessibility pass | Makes the core journey usable anywhere | Stable alpha flow |
| P1 | Product funnel and feedback | Gives roadmap evidence | Privacy/event decisions |
| P2 | Studio defaults and templates | Reduces repeat setup time | Repeated real projects |
| P2 | Version change summary | Improves client confidence on revisions | Approval feedback |
| P2 | Accepted-version receipt/PDF | Improves record keeping | Legal/content decision |
| P0 | Validate time passing on a real project | Makes the accepted plan useful during the project | Mobile/browser access |
| Explore | Email delivery and reminders | Reduces manual sending/follow-up | Renewed approval and provider choice |
| Explore | Team access | Supports multi-person studios | Repeated demand from active users |
| Explore | Client-visible progress | Extends the shared plan after acceptance | Stage/time-passing validation |
| Later | Billing and payments | Monetisation | Demonstrated retention and pricing decision |

## Product metrics

Use a small funnel rather than vanity traffic:

- **Activation:** account created and first valid project saved.
- **Value reached:** first client version published.
- **Outcome reached:** a client accepts a published version.
- **Time to value:** time from account creation to first publication.
- **Reliability:** save, publish and accept success rates; stale-write and recovery events.
- **Retention:** studios that return to edit, republish or create another project.
- **Qualitative signal:** the repeated job users ask Seabird to handle next.

Initial alpha target: at least 80% of invited testers publish without developer help, with a
median time to first publication below 15 minutes. Treat these as learning targets, not growth claims.

## Deliberate non-goals for the alpha

- General task boards, chat, time tracking or CRM.
- Multi-user organisations and complex permissions.
- Invoicing, subscriptions or taking client payment.
- An uneditable legal contract presented as universally suitable.
- Automatic email setup before renewed approval.
- Features that make the proposal slower or denser before users prove their value.

## Product-management cadence

- Update this document whenever a feature is released or its product decision changes.
- A feature moves to **Live** only when the deployed user outcome has been verified, not merely merged.
- Review the P0/P1 backlog after each tester session rather than committing to speculative dates.
- Keep a short decision note in the relevant commit or pull request when scope is deliberately deferred.
- Review the roadmap weekly during the private alpha: evidence, blockers, next experiment and one priority.

