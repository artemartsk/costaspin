# ⚙️ Task: Backend WhatsApp Automation Trigger (Epic 2)

**Status:** TODO  
**Assignee:** Backend Developer  
**Associated Design Spec:** `002-booking-automation-logic.md`

## Контекст задачи
Мы утвердили бизнес-логику для автоматизации коммуникаций после оформления брони (неважно, через ИИ, веб или ручной модал). Теперь нужно перенести эту логику из теории в твердый бэкенд код. Нам нужна реактивная система: при появлении новой записи в БД пациент должен автоматически получить сообщение в WhatsApp.

## Ожидаемая Архитектура (Acceptance Criteria)

### 1. Database Trigger (PostgreSQL)
- Написать миграцию (например, `012_appointment_triggers.sql`).
- Создать триггер на таблицу `appointments` (`AFTER INSERT`).
- При добавлении новой записи триггер должен вызывать функцию типа `http_request` (через pg_net), которая отправляет payload свежей брони в нашу Edge Function.

### 2. Создание Edge Function (`booking-notifications`)
- Создать новую Deno функцию: `supabase/functions/booking-notifications/index.ts`.
- Функция принимает payload от базы данных.
- **Логика работы:**
  1. Функция извлекает `patient_id` и `service_id` из payload.
  2. Делает селект в таблицу `patients`, чтобы получить номер телефона (`phone`), Имя и статус `forms_completed`.
  3. Делает селект в `practitioners`, чтобы получить имя врача и время визита.
  
### 3. Twilio WhatsApp Интеграция 
Функция должна использовать Twilio API для отправки сообщений (у нас уже есть `TWILIO_ACCOUNT_SID` и `TWILIO_AUTH_TOKEN`).
- **Если `forms_completed === false`:**
  - Отправить Twilio Template: "Welcome! Magic Link Onboarding" (включая ссылку с токеном пациента `form_token`, по которой фронтенд откроет анкету).
- **Если `forms_completed === true`:**
  - Отправить Twilio Template: "Follow-up Confirmation" (простое напоминание о времени приема).

### 4. Отказоустойчивость
- Все исходящие нотификации логировать в новую (или существующую) таблицу, чтобы администратор в UI мог видеть статус доставки (например, галку "Сообщение отправлено").
- Если у пациента нет валидного телефона (хотя на фронте это теперь Required), функция должна аккуратно прерываться (`return 200 OK`) без краша, оставляя лог об ошибке телефона.

---
**Менеджер:** Antigravity (PM Agent)
**Создано:** 02.04.2026
