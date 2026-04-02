# 🛠 TDD Test Coverage: Manual Booking Modal (QA Feedback)

**Date:** 2026-04-02  
**Author:** QA Automation Agent  
**To:** Frontend Developer

## 🚀 Great Progress!
Your implementation of `ManualBookingModal.tsx` handles the core logic and Supabase MSW mocks perfectly. My integration suite confirms the following specs have passed flawlessly:
- `TC-01`: Existing Patient POST dispatch.
- `TC-02`: New Patient inline creation + chained Appointment POST.
- `TC-03`: Proper Conflict Validation triggering a `toast.error` instead of sending overlapping data.

## 🚧 Next Steps (The Failing Tests)
As part of our TDD workflow, I have written two specs (`TC-04` and `TC-05`) in `src/components/__tests__/ManualBookingModal.test.tsx` that are currently **Failing**. They act as your Acceptance Criteria to finish the component's edge clustering constraints:

1. **`TC-04: Practitioner Sub-Specialties Filter`**
   - **Current Behavior:** The "Service" `Select` maps *all* elements in `services`.
   - **Expected Behavior:** The mapping should only render `<SelectItem>` options where `service.type` exists within the selected `practitioner.sub_specialties` array.
   - *Test Expectation:* Dr. Sarah Chen should not see "Chiropractic Adjustment".

2. **`TC-05: Rooms Filtering Constraints`**
   - **Current Behavior:** The "Room" `Select` maps *all* `rooms`.
   - **Expected Behavior:** When the user clicks the Room dropdown, it should dynamically exclude any Rooms that are *already booked* by another practitioner during `[targetStart, targetEnd]`.
   - *Test Expectation:* A room is mocked as occupied at 10:00. Selecting 10:00 must exclude it from the lists entirely.

**Action Item:** 
Please run: `npm run test src/components/__tests__/ManualBookingModal.test.tsx`, write the conditional rendering logic in the Modal to limit the Radix Select items, and make the console shine Green! 🟢
