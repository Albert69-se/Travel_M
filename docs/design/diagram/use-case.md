# TravelM — Use Case diagram

```mermaid
flowchart LR
    Guest[Guest visitor]
    User[Registered traveler]
    Admin[System administrator]
    subgraph TravelM[TravelM]
      UC1((FR-1 Discover places))
      UC2((FR-2 Search and filter))
      UC3((FR-3 View place information))
      UC4((FR-4 View weather))
      UC5((FR-5 Maintain trip))
      UC6((FR-6 Set budget))
      UC7((FR-7 Organize itinerary))
      UC8((FR-8 Packing checklist))
      UC9((FR-9 Manage expenses))
      UC10((FR-10 Expense summary))
      ADM((Manage content and settings))
    end
    Guest --> UC1
    Guest --> UC2
    Guest --> UC3
    Guest --> UC4
    User --> UC1
    User --> UC2
    User --> UC3
    User --> UC4
    User --> UC5
    User --> UC6
    User --> UC7
    User --> UC8
    User --> UC9
    User --> UC10
    Admin --> ADM
