# 🛠 TASK 13: Patient Documents & GDPR PDF Generation

**Status:** DONE
**Assignee:** Frontend Developer  
**Epic:** Epic 3 - Unified Patient Record (EMR)

## Контекст задачи
В `TASK_11` мы добавили вкладку **Documents**. Теперь (согласно `TASK_13`) необходимо реализовать возможность генерации и скачивания PDF документов (например, GDPR Consent) на основе соглашений, которые пациент подписал при заполнении intake анкеты.

## Цели (Acceptance Criteria)

### 1. UI: Компонент `DocumentsTab`
Сверстать компонент `DocumentsTab.tsx` для замены текстовой заглушки в `PatientDetail.tsx`.
- **Список документов (Table/List):** Интерфейс должен отображать список базовых документов:
  - Обработка персональных данных (Data Processing Consent).
  - Медицинское согласие (Medical Info Consent).
- **Статусы:** Показывать дату подписания документа из полей пациента (`data_processing_consent_date`, `medical_consent_date`). Если согласия нет — показывать статус "Pending" или "Not Signed".
- **Действия:** Кнопка скачивания (Download PDF) рядом с подписанными документами.

### 2. PDF Generation (Frontend-Only MVP)
- Интегрировать библиотеку для генерации PDF на лету на клиенте (например, `jspdf` или `html2pdf.js` или `react-pdf`). Избегаем тяжелых решений, нам нужно генерировать простой документ с текстом лицензионного соглашения, именем пациента, его подписью (чекбоксом/датой) и версией Privacy Policy (`privacy_policy_version`).
- Клик по кнопке "Download PDF" рендерит и автоматически скачивает PDF.

### 3. Чистота и Дизайн
- Используем компоненты `shadcn/ui` (Table, Card, Button, Badge) для отрисовки статусов и списка документов.

---
**Manager:** Antigravity (PM Agent)
**Created:** 16.04.2026
