## 1. Where AI helped
Based on the team's recorded M2 AI usage log and the M3 documentation workflow, AI assistance included:

- **Architecture and maintainability:** brainstorming modular application organization and separation of concerns.
- **Scope decisions:** considering integrations with external booking platforms and evaluating whether that complexity was appropriate for the MVP.
- **External data integration:** discussing map and weather data integration approaches.
- **Deployment research:** exploring possible hosting approaches.
- **Requirements and documentation:** helping organize and clarify requirement statements, acceptance criteria, traceability, and report structure.
- **Design and testing preparation:** helping structure design flows and test documentation for the requirements.

## 2. What worked
- AI suggestions helped the team consider modularity and maintainability.
- AI helped the team explore possible ways to use map and weather data.
- AI helped organize long requirements into clearer sections and traceability relationships.
- AI provided a starting point for documentation and test-planning language.

## 3. What did not work / limitations
- Some advanced integration suggestions, including broad booking-platform integrations, were too complex for the agreed MVP and were not adopted.
- AI-generated suggestions could be generic or inconsistent with the actual implementation.
- AI cannot independently prove that the prototype works, that a test passed, or that external place information is current.
- Suggested architecture, API, hosting, or implementation details may require changes based on the team's actual technical environment.

## 4. How the team checked AI-assisted work
- The team compared proposed content with the agreed project scope and M2 SRS.
- The team reviewed and edited requirement statements to keep them aligned with the MVP.
- The team checked design documentation against the actual prototype before treating it as final.
- The team tested implemented features and used the team's own test results rather than treating AI output as test evidence.
- Place information should be checked against its cited source and last-checked date.
- Team members remain responsible for explaining the requirements, diagrams, code, and test results during the demonstration or oral assessment.

## 5. Historical AI usage log

| Tool | What the team asked | AI output / suggestion | Team response / verification |
|---|---|---|---|
| Claude | Maintenance of the app | Suggested modular organization to support maintenance and scaling. | The team moved from a single combined structure toward separate modules such as location/weather data, budget, and user accounts. |
| Gemini | Advanced features and connections to TripAdvisor, Booking.com, and ticketing/booking platforms | Proposed an architecture using multiple adapters. | The team rejected the expanded scope as too complex and potentially harmful to user experience. |
| ChatGPT | Integrating Google Maps and weather data | Suggested retrieving map and weather data through APIs. | The team considered fetching updated external data rather than storing all provider data locally. Actual implementation must be checked against the prototype. |
| ChatGPT | Deployment and hosting | Suggested AWS hosting and use of available credits. | This was an explored suggestion, not proof that AWS was selected or deployed. The team must report the actual hosting choice. |

## 6. Responsibility statement
The team is responsible for all submitted work. AI-generated material was reviewed and adapted; the team should not submit or defend content it does not understand. Any additional AI use should be added to this statement honestly, including the tool, purpose, output, changes, and verification.
