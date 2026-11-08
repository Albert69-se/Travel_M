# Software Requirements Specification (SRS)

**Project:** TravelM — Pal for Trip & Travel Assistant  
**Team:** Apollo  
**Course:** Introduction to Software Engineering (15031001)  
**Version:** 3.0  
**Baseline:** M2 SRS v2.0, dated 24 September 2026  
**Repository:** https://github.com/Albert69-se/Travel_M  
**SDLC:** Agile/Scrum

## 1. Introduction

### 1.1 Purpose
Travelers often manage destinations, attractions, weather information, packing lists, itineraries, and trip expenses across different apps, websites, notes, and messages. This can make trip planning difficult and increase the risk of relying on incomplete or outdated information.

TravelM is a travel assistant that brings these essential travel-planning activities into one place. It supports discovering and searching for places, viewing sourced destination information, checking weather, organizing trips and itineraries, preparing packing lists, and tracking budgets and expenses.

### 1.2 Scope
The MVP includes:
- discovering places;
- searching and filtering places;
- viewing accurate and sourced place information;
- viewing weather for destinations and trip dates;
- creating and maintaining trips;
- setting a budget for each trip;
- organizing an itinerary by trip day;
- maintaining a packing checklist;
- recording and managing expenses; and
- viewing expense summaries, budget status, and warnings.

### 1.3 Users and stakeholders

| Stakeholder | Type | Needs | Concerns |
|---|---|---|---|
| Traveler / tourist | Primary user | Discover places, plan trips, view weather, manage packing and expenses | Inaccurate information, lost data, unexpected expenses, poor usability |
| Project owner | Business stakeholder | Useful, reliable, secure, maintainable application | Project failure, low adoption, security problems, excessive complexity |
| System administrator | Operational stakeholder | Manage users, content, categories, and settings | Unauthorized access, data corruption, misuse |
| Guest visitor | Secondary user | Browse public attractions and weather information | Unnecessary collection of personal information |

## 2. Overall description

### 2.1 Product context
TravelM supports place discovery, place information, destination weather, trip planning, packing preparation, and travel expense management.

### 2.2 In scope and out of scope

| In scope — MVP | Out of scope |
|---|---|
| FR-1 Discover places | Hotel, flight, or restaurant booking |
| FR-2 Search and filter places | Payments or subscriptions |
| FR-3 View sourced place information | Public reviews, comments, or social networking |
| FR-4 View destination weather | Complex AI recommendations |
| FR-5 Create and maintain a trip | Real-time transport optimization |
| FR-6 Set a trip budget | |
| FR-7 Organize an itinerary by trip day | |
| FR-8 Maintain a packing checklist | |
| FR-9 Record and manage expenses | |
| FR-10 View expense summary and warnings | |

### 2.3 Assumptions and constraints
- Users have a mobile device or computer and internet access.
- Place information must be sourced and kept up to date where applicable.
- Calculations must be accurate.
- The system stores only the personal data needed for its planned functions, such as username, email, saved places, and trip-related records.
- External map and weather services may be unavailable; the system must handle provider failures without corrupting user-owned records.

## 3. Functional requirements

All FRs below are provisionally **MUST** for the MVP. The team must ensure that the priority labels match the approved project backlog.

### FR-1 — Discover places
**Priority:** MUST  
**User story:** As a tourist, I want to explore popular tourist attractions so that I can discover places to visit.  
**Pain point:** Popular places are scattered across social media and other platforms.

**Requirements / acceptance criteria**
1. The system shall display a list or map of popular places when the user opens the discovery experience.
2. The system shall allow users to select or mark a place on the map.
3. The system shall display available information for a selected place.

### FR-2 — Search and filter places
**Priority:** MUST  
**User story:** As a tourist, I want to search and filter places so that I can narrow the results to places relevant to me.  
**Pain point:** Users can be overwhelmed by a large number of places.

**Requirements / acceptance criteria**
1. The system shall allow users to search attractions by keyword.
2. The system shall allow users to filter attractions by location or destination.
3. The system shall allow users to filter attractions by category, such as temples, nature, museums, markets, and viewpoints.

### FR-3 — View accurate and sourced place information
**Priority:** MUST  
**User story:** As a traveler planning a trip, I want detailed and reliable information about a place so that I can make informed plans.  
**Pain point:** Place information may be incomplete, outdated, or inaccurate.

**Requirements / acceptance criteria**
1. The system shall display detailed information for a selected attraction when available.
2. The system shall display the attraction's location using map data.
3. The system shall display historical or cultural information when available.
4. The system shall display useful details such as opening hours, entrance fees, and travel tips when available.
5. The system shall identify the source of curated place information and record a last-checked date where applicable.
6. Information that cannot be verified or may be outdated shall not be presented as verified or current.

### FR-4 — View weather for destination and trip dates
**Priority:** MUST  
**User story:** As a traveler, I want to view weather information for my destination and travel dates so that I can prepare appropriately.  
**Pain point:** Travelers may not have enough weather information to choose suitable clothing and useful items.

**Requirements / acceptance criteria**
1. The system shall allow users to view current weather and temperature for selected destinations.
2. The system shall provide a forecast for the travel dates when the weather provider supports that date range.
3. The system shall display relevant information such as temperature, rainfall, and weather conditions.
4. The system shall associate weather information with planned destinations and activities when applicable.

### FR-5 — Create and maintain a trip
**Priority:** MUST  
**User story:** As a traveler, I want to create, edit, and delete a trip so that each journey has a clear planning space.  
**Pain point:** Trip details become mixed when stored in general notes.

**Requirements / acceptance criteria**
1. Given a trip name, valid date range, and at least one destination, when the traveler saves the trip, the system shall create a trip with those values.
2. Given an existing trip, when the traveler edits it, the system shall update that trip.
3. When deletion is confirmed, the system shall apply the team's approved rule for dependent trip records and communicate the outcome to the user.

### FR-6 — Set a budget for each trip
**Priority:** MUST  
**User story:** As a traveler, I want to set an estimated budget for a trip so that I can evaluate spending against the correct amount.  
**Pain point:** A general calculator does not reliably connect a budget and expenses to a specific trip.

**Requirements / acceptance criteria**
1. Given a non-negative amount, when the traveler saves the budget, the system shall store it as the trip's expected budget.
2. When a new expense is added, the expected budget shall remain unchanged and the remaining budget shall be recalculated.

### FR-7 — Organize an itinerary by trip day
**Priority:** MUST  
**User story:** As a traveler, I want to add, remove, and order places or activities by trip day so that my itinerary is understandable before departure.  
**Pain point:** A saved-place list does not show what should happen on each day.

**Requirements / acceptance criteria**
1. Given an itinerary item and a valid trip day, when the traveler adds it, the system shall display it under that day in a stable order.
2. When the traveler moves or removes an itinerary item, the affected day lists shall update without deleting the underlying place record.

### FR-8 — Prepare and maintain a packing checklist
**Priority:** MUST  
**User story:** As a traveler, I want an editable packing checklist informed by trip context so that I can prepare without relying on a separate note.  
**Pain point:** Generic packing lists may not reflect destination, weather, or planned activities.

**Requirements / acceptance criteria**
1. Given a trip, the system may suggest packing items based on trip dates, destinations, activities, and available weather information; every suggestion shall remain editable or removable.
2. The system shall preserve the user's saved checklist changes, including checked, added, renamed, reordered, or removed items.

### FR-9 — Record and manage expenses
**Priority:** MUST  
**User story:** As a traveler, I want to add, edit, delete, and categorize expenses so that trip spending remains complete and correct.  
**Pain point:** Expenses in notes require manual addition and are easy to omit or mistype.

**Requirements / acceptance criteria**
1. Given a valid positive amount, trip, allowed category, and date, when the traveler saves an expense, the system shall link it only to the selected trip. A description may be optional.
2. When an existing expense is edited or deletion is confirmed, the system shall update or remove that record without leaving a duplicate.

### FR-10 — View expense summary, status, and warning
**Priority:** MUST  
**User story:** As a traveler, I want to see totals, category groups, remaining budget, and warnings so that I can understand and control trip spending.  
**Pain point:** Separate notes and calculators can leave travelers relying on old totals or noticing overspending too late.

**Requirements / acceptance criteria**
1. Given an expected budget of 1,000 and expenses totaling 235, the summary shall show budget 1,000, expenses 235, and remaining budget 765.
2. The summary shall group spending by the approved expense categories.
3. When spending reaches 80% or more of the expected budget, the system shall show a nearing-budget warning.
4. When spending exceeds the expected budget, the system shall show an over-budget warning and a negative remaining balance.

## 4. Non-functional requirements

| ID | Kind | Testable statement | Verification |
|---|---|---|---|
| NFR-1 | Performance | Place details, keyword search and combined filters, weather information, and budget totals/warnings should update within approximately 3–5 seconds under the agreed test conditions. | Run three trials per operation and record the slowest result. |
| NFR-2 | Usability | Representative first-time users should complete core tasks (explore, create a trip, add a place/itinerary item, add a packing item, set a budget, record an expense) within five minutes without help and with no more than three navigation actions from the relevant home/trip overview. | Timed task with at least three representative users. |
| NFR-3 | Compatibility | Required content shall remain readable on mobile, tablet, and laptop layouts in supported current versions of Chrome, Safari, Firefox, and Edge. | Execute and record the agreed responsive/browser matrix. |
| NFR-4 | Security and privacy | An authenticated user shall not read or modify another user's trips, packing items, expenses, or saved places by changing an identifier. Guests shall be limited to public place and weather viewing. | Attempt cross-user reads and writes for each owned entity. |
| NFR-5 | Input integrity | The system shall reject invalid date ranges, unsupported currency codes, non-positive expenses, out-of-range coordinates, and invalid itinerary days. | Submit one invalid example for each validation rule and confirm no invalid record is stored. |
| NFR-6 | Reliability | Successfully saved trips, itinerary items, packing items, budgets, expenses, and saved-place links shall remain after application restart and a new authenticated session. | Save each record type, restart, sign in again, and compare. |
| NFR-7 | External-service resilience | If a map/place or weather provider is unavailable, the system shall show a source-specific message and shall not corrupt or delete TravelM-owned or user-owned records. | Simulate provider failures and inspect messages and local records. |
| NFR-8 | Calculation accuracy | Remaining budget shall equal total budget minus total expenses. | Compare fixed-decimal, overspent, add, edit, and delete scenarios with an independent calculation. |
| NFR-9 | Information accuracy | Curated place information shall have an identifiable source and last-checked date where applicable. Unverified or outdated information shall not be presented as verified/current. | Review a sample of place records against their cited sources. |
| NFR-10 | Maintainability and provenance | Place, trip, weather, packing, and budget concerns shall be separated into maintainable modules. Map/weather providers shall be replaceable through adapters. Curated records shall retain source, last-checked date, and status. | Review module boundaries, replace a provider with a test adapter, run contract tests, and update a curated record. |
| NFR-11 | Scalability | In a representative test deployment, 50 concurrent users should complete the core read/write scenario with less than 1% request errors and a 95th-percentile owned-data response time of approximately 3–5 seconds or less, excluding external-provider latency. | Run a scripted 50-user load test and retain the report. |
| NFR-12 | Availability | Once a production environment and monitoring method exist, owned functions should achieve at least 99% monthly availability, excluding announced maintenance and separately reporting external-provider outages. | Calculate monthly availability from independent uptime checks and incident records. |

## 5. Use cases

| ID | Use case | Actor | Related FR | Success outcome |
|---|---|---|---|---|
| UC-01 | Discover places | Registered user, guest | FR-1 | User views relevant places on a list or map. |
| UC-02 | Search and filter places | Registered user, guest | FR-2 | User narrows place results using keywords, location, and category. |
| UC-03 | View place details | Registered user, guest | FR-3 | User views place details and source/provenance information. |
| UC-04 | View destination weather | Registered user | FR-4 | Available weather information is shown with its time/context. |
| UC-05 | Create and maintain a trip | Registered user | FR-5 | A trip is created, updated, or deleted according to the defined rules. |
| UC-06 | Set trip budget | Registered user | FR-6 | Expected budget is stored for the selected trip. |
| UC-07 | Organize itinerary | Registered user | FR-7 | Places/activities are ordered by valid trip day. |
| UC-08 | Maintain packing checklist | Registered user | FR-8 | Editable packing items are retained. |
| UC-09 | Record and manage expenses | Registered user | FR-9 | Categorized expenses are added, updated, or removed. |
| UC-10 | View expense summary and warnings | Registered user | FR-10 | Totals, remaining budget, category groups, and warnings are displayed. |

## 6. Out of scope
1. Hotel, flight, or restaurant booking.
2. Payments or subscriptions.
3. Public reviews, comments, or social networking.
4. Complex AI recommendations.
5. Real-time transport optimization.

## 7. Traceability
The complete M3 Golden Thread is provided in `docs/Final-Report.md`. It links each Must FR to its user problem, design artifact, prototype page/flow, and test record.

## 8. AI use
The team's M2 AI usage log is retained as historical disclosure. The M3-specific statement, including where AI assisted, limitations, and verification methods, is in `docs/ai-use-statement.md`.
