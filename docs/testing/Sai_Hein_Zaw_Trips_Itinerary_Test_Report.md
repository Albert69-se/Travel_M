# Trips & Itinerary Feature — Testing Report

## Project Information

- **Project:** Travel_M
- **Tester:** Sai Hein Zaw
- **Assigned Features:** Trips & Itinerary (FR-5, FR-7)
- **Test Date:** Not recorded
- **Test Environment:** Travel_M web application (browser/device version not recorded)
- **Overall Status:** PASS — 9 of 9 test cases reported as passed

## 1. Testing Objective

The purpose of this testing is to verify that users can create and manage trips, enter trip dates, build and edit an itinerary, and retain saved trip data after refreshing the page.

## 2. Test Cases and Results

| Test ID | Test Case | Expected Result | Actual Result (reported) | Status |
| --- | --- | --- | --- | --- |
| TC-01 | Create Trip | A new trip can be created and shown in My Trips. | A new trip was created successfully. | PASS |
| TC-02 | Edit Trip | Changes to an existing trip can be saved. | The trip was edited successfully. | PASS |
| TC-03 | Invalid Date Validation | Invalid trip dates are prevented or handled appropriately. | Passed according to the tester's updated result; the precise validation response was not recorded. | PASS* |
| TC-04 | Add Activity | A new activity can be added to a trip itinerary. | An activity was added successfully on retest. | PASS |
| TC-05 | Add Saved Place | A saved place can be added to the itinerary. | A saved place was added successfully. | PASS |
| TC-06 | Reorder Activities | The activity order can be changed. | Activities were reordered successfully. | PASS |
| TC-07 | Remove Activity | An activity can be removed from the itinerary. | An activity was removed successfully. | PASS |
| TC-08 | Delete Trip | A selected test trip can be deleted. | The trip was deleted successfully. | PASS |
| TC-09 | Refresh Page / Data Persistence | Saved trip and itinerary data remain after page refresh. | Saved data remained after refreshing the page. | PASS |

**\*Validation note:** The tester initially reported no visible response for invalid dates, then updated the overall result to PASS. The exact invalid input, save behavior, and any displayed feedback should be recorded to make TC-03 reproducible.

## 3. Overall Test Summary

| Feature Area | Total Tests | Passed | Failed |
| --- | ---: | ---: | ---: |
| Trip Management & Date Handling | 4 | 4 | 0 |
| Itinerary Activities & Saved Places | 4 | 4 | 0 |
| Data Persistence | 1 | 1 | 0 |
| **Total** | **9** | **9** | **0** |

## 4. Observations and Limitations

- The tester confirmed that all nine test cases passed in the updated testing results.
- Screenshots, exact input values, browser/device details, and the application version were not supplied with these results.
- For invalid date validation, retain evidence of the input and system behavior before using the result as a fully reproducible validation test.
- No issue links were supplied.

## 5. Conclusion

Based on the tester's latest reported results, the Trips & Itinerary features (FR-5 and FR-7) passed all nine listed test cases. The tested functionality includes creating, editing and deleting trips; handling dates; adding, reordering and removing itinerary activities; adding saved places; and retaining data after a page refresh.

**Tested by:** Sai Hein Zaw  
**Reported Final Status:** PASS (9/9)
