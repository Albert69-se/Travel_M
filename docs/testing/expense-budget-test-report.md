Expenses & Budget Feature — Testing Report
Project Information
Project: Travel_M
Tester: Thukha Nyan
Assigned Features: Expenses & Budget (FR-6, FR-9, FR-10)
Test Date: 8 November 2026
Test Environment: Travel_M web application (browser/device version not recorded)
Overall Status: PASS — 14 of 14 test cases passed.
1. Testing Objective
The purpose of this testing is to verify that users can set a trip budget, record and manage trip expenses, categorize expenses, review spending summaries, calculate the remaining budget, and receive warnings when spending reaches 80% or exceeds the planned budget.
2. Test Cases and Results
Test ID	Test Case	Expected Result	Actual Result (reported)	Status
TC-01	Set Trip Budget	A non-negative expected budget can be entered and saved.	The planned budget was set successfully.	PASS
TC-02	Budget Remains Unchanged	Adding expenses does not change the expected budget.	The planned budget remained unchanged after recording expenses.	PASS
TC-03	Add Expense	A new expense can be recorded under the selected trip.	Expenses were added successfully.	PASS
TC-04	Categorize Expense	Expenses can be assigned to appropriate categories.	Expenses were categorized successfully.	PASS
TC-05	Review Total Spending	The system calculates and displays total expenses correctly.	Total spending was displayed correctly.	PASS
TC-06	Review Remaining Budget	The system calculates the remaining budget correctly.	The remaining budget was calculated correctly.	PASS
TC-07	Review Category Totals	The system displays spending totals for each category.	Category totals and percentages were displayed correctly.	PASS
TC-08	80% Budget Warning	A warning appears when spending reaches at least 80% of the planned budget.	The nearing-budget warning appeared correctly.	PASS
TC-09	Edit Expense	Existing expense information can be modified and saved.	Expense information was edited successfully.	PASS
TC-10	Delete Expense	A selected expense can be deleted.	The selected expense was deleted successfully.	PASS
TC-11	Invalid Expense Amount	Zero or negative expense amounts are rejected.	Invalid expense amounts were rejected successfully.	PASS
TC-12	Invalid Budget Validation	Negative budget values are rejected.	Negative budget values were rejected successfully.	PASS
TC-13	Zero Budget Validation	A budget of zero is accepted as a non-negative value.	A zero budget was accepted successfully.	PASS
TC-14	Over-Budget Warning	A warning appears when total spending exceeds the planned budget.	The over-budget warning appeared correctly.	PASS
3. Overall Test Summary
Feature Area	Total Tests	Passed	Failed
FR-6: Set a Trip Budget	4	4	0
FR-9: Record and Manage Expenses	4	4	0
FR-10: Review Spending and Warnings	6	6	0
Total	14	14	0
4. Observations and Limitations
•	The system successfully handles trip budget creation and budget calculations.
•	Expense records can be added, edited, categorized, and deleted.
•	Invalid expense amounts and negative budget values are handled correctly.
•	The system correctly calculates total spending, remaining budget, and category summaries.
•	Both the 80% nearing-budget warning and over-budget warning function as expected.
•	All 14 test cases passed with no reported failures.
5. Conclusion
Based on the completed testing, all 14 test cases for the Expenses & Budget features (FR-6, FR-9, and FR-10) passed successfully. The system correctly supports budget management, expense recording and modification, expense categorization, 
