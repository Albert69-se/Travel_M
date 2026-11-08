# TravelM — Final Project Report

**Team:** Apollo  
**Course:** Introduction to Software Engineering (15031001)  
**Project:** TravelM — Pal for Trip & Travel Assistant  
**Repository:** https://github.com/Albert69-se/Travel_M  
**Report version:** M3 draft · 9 November 2026

## 1. Executive summary
TravelM is a travel assistant intended to help travelers manage essential trip-planning activities in one place. The MVP covers discovering and filtering places, viewing sourced place information, checking destination weather, creating trips, setting budgets, organizing itineraries, maintaining packing checklists, recording expenses, and viewing expense summaries and warnings.

The project follows an Agile/Scrum approach so the team can develop iteratively, review progress, and improve the system through feedback.

## 2. Problem statement
Travelers commonly use separate apps, websites, notes, and messages to research destinations, check weather, organize activities, prepare packing lists, and calculate expenses. This fragmented process can make planning difficult and increase the risk of relying on incomplete information or outdated spending totals.

## 3. Project objectives
- Provide a central place to discover and search destinations.
- Present place information with clear source and verification status.
- Help travelers consider weather when planning.
- Keep trip details and day-by-day activities organized.
- Provide an editable packing checklist.
- Connect expenses to the correct trip and calculate budget status.

## 4. Scope
The original requirements from M1 were expanded and refined from five to ten functional requirements. The additional requirements cover itinerary organization, budget management, packing preparation, expense tracking, and expense summaries.
The MVP comprises FR-1 to FR-10 in the SRS. Hotel, flight, and restaurant bookings, payments, public reviews/social networking, complex AI recommendations, and real-time transport optimization are excluded.

## 5. Development approach
The team selected Agile/Scrum because iterative development supports incremental delivery, team feedback, and continuous improvement. Requirements are documented in `docs/SRS.md`; design artifacts are in `docs/design/`; testing records are summarized in `docs/testing/`.

## 6. Design overview
The design artifacts provide a system use-case overview for each MVP functional requirement. Each diagram is stored as a Mermaid Markdown file in `docs/design/`. The diagrams should be reviewed against the actual implemented prototype before submission.

## 7. Prototype and demonstration
The prototype demonstration should show the normal successful path for every Must FR. The page/flow names in the Golden Thread table are logical feature destinations; replace them with the exact page names or URLs used by the team's actual prototype if they differ.

**Prototype URL:** [INSERT ACTUAL PROTOTYPE URL]

## 8. Testing summary
The team has reported that FR-1 through FR-10 testing. FR-1 and FR-2 have a Discover & Search test-report history, including the team's reported passing cases. The team should attach the actual screenshots, test execution logs, or other evidence to the corresponding GitHub issues or testing files.

The report does not invent test execution dates, tester names, screenshots, or unprovided case IDs. Detailed evidence should be added by the members who executed each test.

## 9. Golden Thread — complete Must FR traceability

| Problem / user need | Requirement | Prototype page / happy path | Test / result |
|---|---|---|---|
| Popular places are scattered across platforms. | FR-1 Discover places | Discover page → select a place/marker → view place preview | Discover & Search test record; team confirms FR-1 PASS |
| Users are overwhelmed by too many places. | FR-2 Search and filter places | Discover/Search page → enter keyword → apply location/category filter | Discover & Search test record; team confirms FR-2 PASS |
| Place details may be incomplete, outdated, or inaccurate. | FR-3 View accurate and sourced place information | Place details page → inspect details, source, and last-checked status | FR-3 team test result: Needs verification and improvement ; attach executed test evidence |
| Travelers lack destination and date-specific weather information. | FR-4 View weather | Weather/destination section → select destination and trip dates → view available weather | FR-4 team test result: PASS; attach executed test evidence |
| Trip information becomes mixed in general notes. | FR-5 Create and maintain a trip | Trips page → create trip → view/edit trip | FR-5 team test result: PASS; attach executed test evidence |
| A general calculator does not connect spending to a trip. | FR-6 Set a trip budget | Trip overview/budget page → enter budget → save → view remaining amount | FR-6 team test result: Not tested yet ; Pending |
| A saved-place list does not show activities by day. | FR-7 Organize itinerary by trip day | Trip itinerary → choose day → add/reorder/remove itinerary item | FR-7 team test result: PASS; attach executed test evidence |
| Generic packing lists do not reflect trip context. | FR-8 Maintain packing checklist | Trip packing page → add/check/edit/remove item → save | FR-8 team test result: PASS; attach executed test evidence |
| Expense notes require repeated manual calculation. | FR-9 Record and manage expenses | Trip expenses → add expense → edit/delete expense | FR-9 team test result: Not tested yet ; Pending |
| Separate notes/calculators can show outdated totals and late warnings. | FR-10 View expense summary and warnings | Budget summary → view totals/category groups → trigger threshold/over-budget warning | FR-10 team test result: Not tested yet ; Pending |

## 10. Conclusion
TravelM addresses a fragmented travel-planning problem by combining destination discovery, sourced information, weather context, trip organization, packing preparation, and expense tracking. The team reports that eight out of ten functional requirements passed testing. The repository should include the supporting design, test, and AI-use documentation.

## 11. Submission checks
-  Replace the prototype placeholder with the real prototype URL.
-  Confirm that all FR priority labels match the team's agreed backlog.
-  Confirm the exact prototype page names in the Golden Thread.
-  Attach actual test evidence for FR-1 to FR-10.
-  Complete Team Charter member names and meeting arrangements.
-  Ensure every Must FR can be clicked through during the demo.
