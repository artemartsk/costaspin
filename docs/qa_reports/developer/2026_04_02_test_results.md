# 🛠 Technical QA Report & TDD Spec: Calendar Engine

**Date:** 2026-04-02  
**Author:** QA Automation Agent  
**Recipient:** Frontend Developer  

## 🏗 Infrastructure Upgrades
- Added **Vitest** and **React Testing Library** to the stack.
- Configured component environment wrapper via `src/lib/test-utils.tsx`.
- CI/CD ready: Run `npm test` for one-off runs, or `npm run test:watch` while coding.

## 🟢 Passing Tests (Base Functionality)
File: `src/pages/__tests__/Calendar.test.tsx`
Your implementations are extremely solid. The native Drag-and-Drop algorithms work smoothly. The mathematical algorithm calculating side-by-side splits (width 50%, offset) evaluates perfectly under JSDOM tests! Great job avoiding heavy dependencies.

## 🔴 Failing Tests (Test-Driven Engineering Tasks)
File: `src/pages/__tests__/CalendarFeatures.test.tsx`
To align with the Manager's `TASK_01_calendar_gaps.md`, I've authored TDD acceptance tests that are currently failing. **Your objective is to make these tests pass.**

1. **Location Strictness (`<Select>` Filter):**
   - **Expects**: Finding the text string `CostaSpine Elviria` within a rendered Select options drop-down in the header.
2. **Booking Source UI Badges:**
   - **Expects `ai_phone`**: Component must output a node containing `data-testid="badge-source-ai"`.
   - **Expects `whatsapp`**: Component must output a node containing `data-testid="badge-source-wa"`.
   - *Recommendation: Map these to tiny Lucide icons on the appointment card.*
3. **Roster Schedule Shading (Non-Working Hours):**
   - **Expects**: Empty/unavailable grid cells must block drags and render a node with `data-testid="roster-unavailable-cell"`.
   - *Recommendation: Ensure you pull array maps dynamically from `practitioner_schedules` rather than using the hardcoded `8-17` grid.*

**Run `$ npm run test:watch` while integrating to verify fixes in real time.**
