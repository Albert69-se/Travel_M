# Discover & Search Feature – Test Report

## Project Information

- Project: Travel_M
- Feature: Discover and Search
- Related Requirements: FR-1, FR-2, FR-3
- Status: Planned
- Tester: SENG RING AUNG
- Test Date: 8NOV2026

## 1. Objective

The purpose of this test is to verify that users can discover
tourist attractions in Thailand, search for places using keywords,
filter attractions by province and category, view places on a map,
and check place details and source information.

## 2. Test Cases

| Test ID | Test Description | Expected Result | Actual Result | Status |
|---|---|---|---|---|
| TC-01 | Open attraction list | Attraction list is displayed | The attraction list was displayed successfully with matching attractions in grid view.| Pass |
| TC-02 | Open map view | Map displays attraction locations | The map was displayed successfully with visible location pins. | Pass |
| TC-03 | Search using keywords | Relevant places are displayed | Search results appeared after entering the keyword "temple". Relevance still needs verification. | Need verification |
| TC-04 | Filter by province | Places from selected province are displayed | Places were filtered successfully by the selected province. | Pass |
| TC-05 | Filter by category | Places from selected category are displayed | Places were filtered successfully by the selected category. | Pass|
| TC-06 | Search unavailable keyword | Empty result message is displayed | The empty result message was displayed successfully. | Pass |
| TC-07 | Open place details | Correct place details are displayed | Places display the message "Detailed visitor information has not been independently verified". | Needs improvement |
| TC-08 | Check source information | Source information is available | Source information was displayed successfully. | Pass |

## 3. Issues Found

### Issue 01: Some Place Images Are Unavailable

- Description: Some attraction cards display place information,
  but their images are missing or unavailable.
- Expected Result: Each attraction should display its corresponding image.
- Actual Result: Place names and information are displayed,
  but some images are unavailable.
- Status: Open
- Severity: Medium

### Issue 02: Visitor Information Not Independently Verified

- Description: Place details display a notice stating that detailed visitor information has not been independently verified.
- Expected Result: Place details should provide accurate and verified visitor information.
- Actual Result: Places display an unverified information notice.
- Status: Open

## 4. Screenshots

### Issue 01: Some Attraction Images Are Unavailable

![Unavailable attraction images]

### Issue 02: Visitor Information Not Independently Verified

![Unverified visitor information]

## 5. Conclusion

The initial testing showed that the attraction list, map view, and keyword search are functioning as expected. However, some attraction images are unavailable, and some place details display a notice stating that the visitor information has not been independently verified.

Province filtering, category filtering, empty search results, and source information still require further testing.

Overall, the Discover & Search feature is partially working, but further testing and improvements are required before it can be considered fully verified.
