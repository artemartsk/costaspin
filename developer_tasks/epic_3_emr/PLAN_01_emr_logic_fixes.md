# 📋 PLAN: EMR Logic Holes & Tech Debt Fixes

**Status:** APPROVED  
**Epic:** Epic 3 - Unified Patient Record (EMR)  
**Target:** Backend & Frontend Teams

Платформа EMR функционирует, но требует устранения четырех архитектурных дыр, чтобы система была производительной и юридически защищенной (согласно GDPR Испании). Задачи квалифицируются как технический долг, следующий сразу за релизом Эпика 3.

---

## 1. Legal Consents & Signature Proofs (GDPR)
**Проблема:** Имя в поле подписи не имеет силы, если мы не докажем, когда и с какого устройства пациент его ввел. И нельзя динамически генерировать PDF "на лету", так как данные пациента (например, согласие на маркетинг) могут измениться в будущем.

- **Frontend (`src/pages/PatientForms.tsx`):**
  При нажатии "Submit" фронтенд будет дополнительно собирать объект `signature_metadata`:
  - `navigator.userAgent` (строка девайса).
  - Вызов эндпоинта (например, `/api/get-ip` Edge Функции) для фиксации публичного IP-адреса мобильного устройства пациента.
  - Точный UTC Timestamp (до секунд).
  *Записываем это в `patient_forms.signature_data`.*

- **Backend (`supabase/functions/patient-pdf-freezer/`):**
  - **Edge-генерация:** Создать Edge-функцию, которая срабатывает серверно ровно 1 раз при заполнении форм. 
  - **Штамп:** В подвал генерируемого `Master Consent Record.pdf` "вшивается" неудаляемый текст: *Digitally signed by [Name] on [Date] UTC. Action logged from IP: [IP_Address] (User Agent: Safari iOS...)*.
  - **Хранилище:** PDF сохраняется в неизменяемый S3 Bucket (`patient_documents`) в Supabase.

- **UI (`DocumentsTab.tsx`):**
  - Удалить клиентские библиотеки генерации PDF (jsPDF и т.д.). Вкладка просто стягивает список URL-ссылок из Supabase Storage и показывает файлы для скачивания «замороженных» PDF документов.

---

## 2. Communications & Pagination
**Проблема:** Отсутствие пагинации при загрузке 500+ логов чатов и дублирование экранов связи.

- **Сайдбар и Вкладка:**
  - Сайдбар (Timeline) остается **единственной** глобальной лентой всех событий.
  - Вкладку `CommunicationsTab` переделываем в **Chat Reader** (Детальный просмотр). Врач кликает на сообщение WhatsApp в таймлайне (справа), и вкладка `CommunicationsTab` (слева) раскрывается как интерфейс WhatsApp Web для чтения именно этой переписки.

- **Backend (`src/hooks/useData.ts`):**
  - Добавление `Supabase Pagination`. В запросах `usePatientCommunications` и `usePatientActivity` добавить `.limit(50)`. 
  - Реализовать метод подгрузки предыдущих сообщений (Load More / Infinite Scroll) через `.range()`.

---

## 3. Clinical Notes Editability (SOAP)
**Проблема:** Врачи не могут исправить свои опечатки в медицинских карточках после нажатия "Сохранить", что противоречит легальным медицинским процессам.

- **Backend (`supabase/migrations/017_notes_rls_update.sql`):**
  - В таблицу добавляется авто-апдейт поля `updated_at`.
  - **RLS Policy:** Врач (`practitioner_id`) имеет право на `UPDATE` своей клинической записи исключительно при условии `now() < created_at + interval '24 hours'`. (Окно в 24 часа на исправление).

- **Frontend (`src/hooks/useData.ts` & `src/components/ClinicalNotesTab.tsx`):**
  - Добавляем мутацию `useUpdateClinicalNote`.
  - В UI у недавно созданных записей (младше 24 часов) появляется кнопка `[ Edit ]`.
  - Если запись редактировали, рядом с ней навсегда остается штамп `(Edited)`.

---
**Created:** 16.04.2026 / *Antigravity PM Agent*
