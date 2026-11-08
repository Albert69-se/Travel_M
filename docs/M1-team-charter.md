# M1 – Team Charter [04-Apollo]

## Project Information

**Project Name:** Travel-M

**Team Members:**
- Aung Kyaw Khant (6931503121)
- Sai Hein Zaw (6931503015)
- Lwin Myat Kyaw (6931503010)
- Thukha Nyan (6931503097)
- Seng Ring Aung (6931503095)

## The Problem

Travelers often manage destination information, trip plans, packing preparation, weather information, and expenses across multiple apps, websites, notes, and messages. This makes information harder to organize and can lead to missed details or outdated information during trip planning.

Travel-M aims to bring the core planning and expense-tracking tasks into one trip workspace while clearly indicating the source and availability of external information.

## Who Exactly Has the Problem?

- University students who travel
- Independent travelers
- Young adults
- Budget-conscious travelers who plan and manage their own trips

## Why It Matters / What It Costs Them Today

Travelers spend time switching between different sources and manually connecting information about destinations, weather, preparation, and spending. This can make trip information harder to keep organized and can cause users to rely on incomplete or outdated information.

Travel-M reduces this fragmentation by keeping the planning workflow and user-owned trip data together, while treating external information as source-dependent rather than guaranteeing its accuracy or availability.

## GATE 1 — REACHABLE USERS

**At least 3 users interviewed before Week 4**

| User | Category | Interview Method | Date |
|---|---|---|---|
| Dora | Student | In person | 2 Sep 2026 |
| Avery | Student | In person | 2 Sep 2026 |
| Yolo | Student | Facebook Messenger | 3 Sep 2026 |

## GATE 2 — MVP SHAPE

### Initial Functional Requirements

- **FR-1 — Discover Places:** Users can discover and view available tourist places and attractions.

- **FR-2 — Search and Filter Places:** Users can search for places by keywords and narrow results using destination/location and category filters.

- **FR-3 — View Accurate and Verified Place Information:** Users can view detailed information about attractions, including location, historical/cultural information, opening hours, entrance fees, and travel tips. Place information must come from an identifiable source and be kept accurate and up to date where applicable.

- **FR-4 — View Weather for Destination and Trip Dates:** Users can view available current/forecast weather information for selected destinations and planned travel dates.

- **FR-5 — Create and Maintain a Trip:** Users can create, edit, and delete trips with destinations and dates so that planning information is kept in a structured trip.

### FR Which Carries a Real Rule or Decision (Not Plain CRUD)

**FR-5 — Trip Validation and Budget/Expense Rules**

- Trip validation requires a valid date range and at least one destination.
- Budget and expense management calculates:

  `Remaining Budget = Total Budget − Total Expenses`

- The system triggers budget warnings when defined thresholds are reached or exceeded.

### Data Persistence

The system stores and maintains the following data:

- Trips
- Destinations and itinerary items
- Packing lists
- Budgets
- Expenses
- Saved places

Additional data-handling requirements:

- Curated destination information retains its source, last-checked date, and verification/status.
- External map and weather data remain provider-dependent.

## GATE 3 — ACCESS

### Dependencies

- Internet access
- Map/place services such as Google Maps
- A weather API

Services will be used according to their access, licensing terms, and API limits.

### Information Verification

- Verified destination information must use an appropriate identifiable source.
- The system must record the last-checked date.
- Historical and cultural facts should come from credible sources rather than being assumed verified by map providers.
- External information may become unavailable or outdated.

### Failure Handling

Provider failures should display an appropriate message while preserving Travel-M-owned data without corruption or deletion.

## PROCESS & TEAM

### Chosen SDLC: Agile/Scrum

The team uses Agile/Scrum, which involves short and rapid development iterations, continuous testing, and feedback from users throughout the development process.
