# 📈 PM Dashboard (CostaSpine Elviria Pilot)

**Последнее обновление:** 02.04.2026

Это единое менеджерское пространство (Kanban/Tracking Dashboard) для контроля исполнения задач между Backend, Frontend и QA командами.

## 📌 Status Legend
- 🟢 **DONE** (Реализовано, протестировано и принято)
- 🟡 **IN PROGRESS / BLOCKED** (В работе / На багфиксе)
- ⚪️ **TODO** (В беклоге, ожидает начала)

---

## 🛠️ Board & Sprint Backlog

| Task ID | Component / Epic | Assignee | Status | QA Report / Notes |
|---------|------------------|----------|--------|-------------------|
| **[TASK_01](./TASK_01_calendar_gaps.md)** | Calendar Gaps (Location Filter, Badges, DB Roster) | Frontend Dev | 🟢 **DONE** | Успешно принят (`2026_04_02_qa_signoff.md`) |
| **[TASK_02](./TASK_02_purge_mock_data.md)** | MSW Integration & Mock Data Purge | QA / Frontend | 🟢 **DONE** | TDD внедрен (`2026_04_02_qa_tester_msw_integration.md`) |
| **[TASK_03](./TASK_03_manual_booking_modal.md)** | Manual Booking Modal (Patient creation, Form Logic) | Frontend Dev | 🟢 **DONE** | Успешно принят, баги устранены (`2026_04_02_manual_booking_delivery.md`) |
| **[TASK_QA_04](./TASK_QA_04_manual_booking.md)**| QA Tests: Validation & Conflicts for Booking Modal | QA Engineer | 🟢 **DONE** | Тесты написаны, выявили провалы в TASK_03 |
| **[TASK_05](./TASK_05_backend_whatsapp_trigger.md)** | Database Trigger & Twilio Webhook (Onboarding Logic) | Backend Dev | 🟢 **DONE** | Успешно реализован и залит на прод (Deno + pg_net) |
| **[TASK_06](../docs/design-specs/003-appointment-details-modal.md)** | Appointment Details Panel (Slide-over Sheet & AI Triage) | Frontend Dev | ⚪️ **TODO** | ТЗ и Wireframe утверждены, ждет имплементации (shadcn Sheet) |
| **[TASK_07](./TASK_07_room_dashboard_ui.md)** | Room Details Dashboard (Resource Management & UI) | Frontend Dev | 🟢 **DONE** | UI свёрстан (внешний вид одобрен) |
| **[TASK_08](../docs/design-specs/004-ai-booking-card-highlight.md)** | AI Aura Gradient (Calendar UX Enhancement) | Frontend Dev | 🟢 **DONE** | Дизайн-концепт внедрен, градиенты работают |
| **[TASK_09](./TASK_09_appointment_details_fixes.md)** | Appointment Details: Сall Playback & Edit Button | Frontend Dev | 🟢 **DONE** | Успешный релиз плеера и фикс багов (QA Sign-Off) |
| **[TASK_QA_05](./TASK_QA_05_appointment_details.md)** | QA Tests: Appointment Details Panel & Playback | QA Engineer | 🟢 **DONE** | Ошибок нет, добавили фикс `editingAppointment` |
| **[TASK_10](./TASK_10_calendar_datepicker.md)** | Calendar Navigation (DatePicker Popover) | Frontend Dev | 🟢 **DONE** | DatePicker внедрен, стейт `currentDate` работает |
| **[TASK_QA_06](./TASK_QA_06_room_dashboard.md)** | QA Tests: Room Dashboard Analytics & Logic | QA Engineer | ⚪️ **TODO** | Требуется покрытие логики `analytics` в MSW |
| **[TASK_11](./epic_3_emr/TASK_11_patient_profile_tabs.md)** | Patient Profile Tabbed Navigation (UI Refactor) | Frontend Dev | 🟢 **DONE** | UI свёрстан (вкладки на месте) |
| **[TASK_12](./epic_3_emr/TASK_12_clinical_notes.md)** | Clinical SOAP Notes (Backend + Frontend) | Fullstack Dev | 🟢 **DONE** | БД миграция создана, UI работает, ждет деплоя менеджером |
| **[TASK_13](./epic_3_emr/TASK_13_documents.md)** | Patient Documents & GDPR PDF Generation | Frontend Dev | 🟢 **DONE** | Master Consent Record PDF генерация готова |
| **[TASK_14](./epic_3_emr/TASK_14_communications.md)** | AI Communications Timeline | Frontend Dev | 🟢 **DONE** | Единая лента (Звонки + WhatsApp) сверстана по дизайну |

---

## 📊 Next Action Items
1. **Epic 3:** Все задачи по EMR пациента в рамках Эпика успешно завершены.
2. **Manager (Artem):** Выполнить Manual Deployment миграции БД `013_clinical_notes.sql` на продакшен-инстанс Supabase. Устроить QA тестирование всего профиля.
