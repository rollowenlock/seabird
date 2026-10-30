# Seabird product restraint

Seabird should contain the least software needed to help a studio agree and run a project.

Before adding anything, require all of the following:

1. It solves a problem a user has actually encountered.
2. It belongs to an existing product area: price, timeline, deliverables, terms, agreement, time passing, or stages.
3. The existing interface cannot solve it with clearer wording or a smaller change.
4. Its value is greater than the permanent complexity it adds.
5. There is a clear way to verify that it works for both mobile and desktop.

If any answer is no or unknown, do not build it. Record the idea for later instead.

Prefer removal, consolidation, and progressive disclosure over new panels, dashboards, navigation, helper text, status labels, settings, or controls. Do not add sample projects or fictional account content.

The home screen is deliberately limited to the user's display name or logo, account access, the New project action, project cards, and the Powered by Seabird footer. Do not assume the user is a company: they may be an individual, freelancer, studio, practice, or another kind of organisation. Do not add introductory copy, project counts, workspace status panels, backup controls, or promotional content without explicit user evidence.

Account identity is limited to a display name, optional logo, how the user works, and their types of work. The logo supersedes the display name in the header. Do not turn these preferences into recommendations, onboarding, or additional navigation without explicit evidence.

The selected “How you work” value is the provider label in agreement previews and PDFs (for example, Studio rather than Freelancer). Freeze the display name and provider label into each published client version so old agreements do not change when account settings change later.

Project records live in Supabase only. Do not persist projects, drafts, revisions, or sync metadata in localStorage, IndexedDB, or another browser database. Load projects after authentication and save edits to the backend automatically; do not add manual cloud save/load controls.
