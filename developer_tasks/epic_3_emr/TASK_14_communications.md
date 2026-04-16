# 🛠 TASK 14: AI Communications Timeline (Call Logs & WhatsApp)

**Status:** DONE
**Assignee:** Frontend Developer  
**Epic:** Epic 3 - Unified Patient Record (EMR)

## Контекст задачи
В EMR профиле пациента осталась последняя вкладка — **"Communications"**. Этот модуль должен служить единым окном (Общим логом) для менеджера, в котором собирается полная хронология коммуникаций пациента с клиникой. 
Сюда должны поступать данные от AI агента (голосовые звонки, транскрипции) и переписки в WhatsApp (сообщения). 

## Цели (Acceptance Criteria)

### 1. Data Layer (`useData.ts` & Types)
- В `src/types/index.ts` определить тип `WhatsAppThread` (если его нет), соответствующий таблице `whatsapp_threads` из миграции `009`. 
- Создать хук `usePatientCommunications(patientId: string)`, который под капотом делает запросы к двум таблицам: `call_logs` и `whatsapp_threads`.
- Хук должен мапить результаты в единый отсортированный массив `TimelineEvent[]` (по дате по убыванию), где тип эвента `type: 'call' | 'whatsapp'`.

### 2. UI Component (`CommunicationsTab.tsx`)
Заменить текстовую заглушку в `PatientDetail.tsx` на полноценную ленту.
- **Единая лента (Timeline):** Отдельные блоки/карточки для звонков и сообщений в хронологическом порядке.
- **Карточка `Call` (Звонок):**
  - Дата и статус (`completed`, `no_answer` и т.д.)
  - Если есть транскрипция (`transcript`) — отображать разворачивающийся блок (Accordion).
  - Аудиоплеер (HTML5 `<audio>`) если есть `recording_url`.
- **Карточка `WhatsApp` (Чат):**
  - Дата последнего обновления треда.
  - Список входящих/исходящих сообщений (бабблы чата или компактный список). Поле `messages` имеет формат JSONB `[{role: 'user'|'assistant', content: string}]`.

### 3. Дизайн и UX
- Использовать `shadcn/ui` (Card, Accordion, Badge, ScrollArea).
- Визуально дифференцировать звонки (например, бейджиком 📞 Call) и чаты (💬 WhatsApp).
- Ожидается аккуратная "лента" (подобно истории болезней в `ClinicalNotesTab`).

---
**Manager:** Antigravity (PM Agent)
**Created:** 16.04.2026
