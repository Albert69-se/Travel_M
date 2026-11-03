# Course readiness plan

## Objective and success criteria

Trace TravelM's course requirements to screens, implementation and meaningful checks; make the demo and team handoff understandable without claiming unverified coverage.

## Current state and constraints

The React app has existing routes and tests. A local Team04 SRS and Classroom rubric are available, but the exact submitted SRS and team repository still need confirmation. Preserve the application architecture, credentials and deployment; do not invent interviews, contributions, test results or AI history.

## Steps

1. Inspect Classroom submission details and the available SRS, routes, controls and tests.
2. Produce a requirement trace and identify demonstrable gaps, with explicit verification status.
3. Make focused corrections supported by the audit; prepare a beginner team workflow and demo guidance.
4. Run relevant tests, lint/build as appropriate, review the diff and record limitations.

## Validation and risks

Use existing automated tests and targeted browser checks where feasible. External providers and local-only storage affect repeatability and security claims. Classroom requirements and submitted artifacts may differ from local copies; verify before representing this as the final course submission.

## Progress

- 2026-11-03: Started course readiness audit; no production changes or submissions.
- 2026-11-03: Added a working FR trace, demo checklist and beginner GitHub guide. Confirmed trip editing already exists in the trip screen; added protection against date changes that would leave activities outside the trip and clear stale destination references. Added manual packing reordering.
- Browser verification: packing order persisted after reload. A trip name edit persisted; automated date-field interaction did not establish the date-guard browser path. Unit tests cover the guard. The submitted SRS/repository identity, full FR demonstrations, offline prototype and course artifacts remain open.
- 2026-11-03: User supplied M1 charter and M2 SRS v2.0. Add an opt-in, route-aware FR explanation panel using M2 numbering, keeping it off on initial load and honest about partial coverage. Validate route mapping, normal and enabled states, navigation, reload and responsive behavior.
- Debug guide added in the shared shell, with M2 v2.0 mapping and limitations. Browser checked initial off state, enabling, navigation to packing, and reset on reload. Responsive visual testing remains open.
