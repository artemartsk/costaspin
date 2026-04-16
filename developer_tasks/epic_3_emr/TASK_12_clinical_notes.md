# 🛠 TASK 12: Clinical SOAP Notes (Backend + Frontend)

**Status:** DONE
**Assignee:** Fullstack Developer  
**Epic:** Epic 3 - Unified Patient Record (EMR)

## Контекст задачи
В `TASK_11` мы подготовили базовую структуру вкладок в профиле пациента. Теперь нам нужно оживить вторую вкладку — **Clinical Records**.
Врачи используют медицинский стандарт **SOAP** (Subjective, Objective, Assessment, Plan) для ведения истории болезни. Нам необходима новая таблица в Supabase и интерфейс для добавления/чтения этих записей в профиле пациента.

## Цели (Acceptance Criteria)

### 1. Database & Migrations (Supabase)
Создать новую миграцию (например, `013_clinical_notes.sql`) для таблицы `clinical_notes`:
- **Поля:** `id` (uuid), `patient_id` (uuid, fk), `practitioner_id` (uuid, fk), `appointment_id` (uuid, fk, nullable - привязка к конкретному визиту), `subjective` (text), `objective` (text), `assessment` (text), `plan` (text), `created_at`, `updated_at`.
- **Ограничения (RLS):** Создать политики RLS. Только авторизованные пользователи могут читать и создавать записи (пациенты не должны видеть внутренние записи врачей).

### 2. Frontend Data Layer (`src/hooks/useData.ts`)
Реализовать функции для работы с API:
- `usePatientClinicalNotes(patientId: string)` — получение всех записей пациента (сортировка по убыванию даты). Обязательно подтягивать (JOIN) связанную информацию о враче (`const { data } = await supabase.from('clinical_notes').select('*, practitioner:practitioners(first_name, last_name, profession)')`).
- `useCreateClinicalNote()` — мутация для создания новой записи.
- Не забыть про инвалидацию кэша (React Query) после успешного создания.

### 3. UI Component (`ClinicalNotesTab.tsx`)
Заменить заглушку во вкладке "Clinical Records" на полноценный функционал:
- **Лента истории (History Feed):** Список карточек (используйте `<Card>` или `<Accordion>` из shadcn) с прошлыми записями. В карточке должно быть видно: дату, имя врача и разбитые по блокам S-O-A-P тексты.
- **Интерфейс создания (Add Note):** Кнопка "New Record", открывающая `<Dialog>` (модальное окно) или `<Sheet>` (панель сбоку).
- **Форма ввода (SOAP Form):**
  - **Subjective (S):** Textarea (жалобы пациента).
  - **Objective (O):** Textarea (данные осмотра врача).
  - **Assessment (A):** Textarea (оценка/диагноз).
  - **Plan (P):** Textarea (план лечения/рекомендации).
  - У формы должна быть валидация, чтобы хотя бы одно поле не было пустым перед отправкой.

### 4. Дизайн
- Используем текущий дизайн системы и готовые компоненты `shadcn/ui` (Button, Textarea, Dialog, Card, Badge). Никакого кастомного CSS.

---
**Manager:** Antigravity (PM Agent)
**Created:** 16.04.2026
