# Team Apollo — task and contribution plan

**Project:** TravelM · **Team:** 04 Apollo

This is a proposed division of upcoming work, based on the names in the M1 charter. The team can adjust it to suit each member's availability. Every assignment starts as **Planned**: a task listed here is not a claim that someone has already completed it. Record actual work and links as it happens.

The functional requirement (FR) numbers below refer to the **M2 SRS v2.0**. M1 uses a different, shorter set of numbers.

| Member | Proposed responsibility | M2 requirements | Planned evidence | Status |
| --- | --- | --- | --- | --- |
| **Seng Ring Aung** | Discover and search: test the attraction list, map, keyword search, province/category filters and an empty result. Check a place's displayed details and source information. | FR-1, FR-2, FR-3 | A short test report with steps, actual outcomes and screenshots where useful; issue links for reproducible problems. | Planned |
| **Sai Hein Zaw** | Trips and itinerary: test creating and editing a trip, invalid dates, adding an activity or saved place, changing its order and removing it. Use a disposable test trip when checking deletion. | FR-5, FR-7 | A trip and itinerary test report, including at least one invalid case and a confirmed result after reload; issue links for problems. | Planned |
| **Lwin Myat Kyaw** | Packing and weather: test adding, checking, renaming, reordering and removing packing items, then checking persistence. Test available weather information and describe what happens for an unavailable forecast. | FR-4, FR-8 | A packing and weather test report with environment, steps, actual results and provider limitations. | Planned |
| **Thukha Nyan** | Budget and expenses: test setting a budget, adding/editing/deleting an expense, invalid amounts, category totals, remaining balance and budget warnings. | FR-6, FR-9, FR-10 | A test report with the amounts used and observed totals, including the SRS example of 1,000 budget, 235 spent and 765 remaining. | Planned |
| **Aung Kyaw Khant** | Coordinate the team and repository: review test findings and PRs, help resolve confirmed defects, maintain the requirement-to-screen/test map, and coordinate the final report and demo. Record AI assistance and human verification accurately. | FR-1–FR-10, cross-cutting | Reviewed PRs or issues, updates to the traceability map and final materials, and an honest AI-use record linked to the actual work. | Planned |

## How each member completes their task

1. Get access to the private repository and follow the [Mac and Windows setup guide](docs/TEAM_GITHUB_GUIDE.md). Select **Show FR debug mode** in the app footer to find related areas and explanations. Labels are a guide, not proof that a feature passes.
2. Run the assigned scenarios yourself. Write the date, browser or device, starting conditions, steps, expected result and **actual** result. Record failures and provider limitations as observed. Avoid including API keys, personal data or unrelated screenshots.
3. Create a short report in a separate file under `docs/`, such as `docs/testing-discover.md` or `docs/testing-packing-weather.md`. Use your own GitHub account and create a branch, commit and pull request for your work. If you find a problem, open or link an issue with reproduction steps.
4. Ask another teammate to review the report or change. After the work is done, update the evidence log below with a link to its merged PR, issue, committed file or other actual repository evidence. Each person should be able to explain their own work.

For the sample budget calculation, record results from the app rather than treating the expected 765 as an observed result. Test on a disposable trip so real records are not changed accidentally. External map, photo and weather services may be unavailable; a clear failure report is a useful contribution.

## Shared work

- **Everyone:** practice explaining all Must requirements, where they appear and at least one example or limitation. The lecturer may ask any member about any FR.
- **Everyone:** review the final report and demo slides for accuracy and practice the problem → requirement → design → feature → test story together.
- **Aung, with team input:** verify the SRS, charter, diagrams, report, slides, README and AI-use statement are available in the correct repository and that the lecturer can access it. See [the working traceability map](docs/COURSE_TRACEABILITY.md).

## Actual contribution log

Add rows only after work is performed. Link evidence that is available in the team repository. A single task may have multiple contributors when each person's role is described accurately.

| Date | Member | Work actually performed | Evidence: PR, issue or committed file | Status |
| --- | --- | --- | --- | --- |
| — | — | No completed work recorded in this log yet. | — | — |

Record assistance truthfully, including AI use where required by the course. Do not create placeholder commits, backdate work or attribute someone else's work to a teammate.
