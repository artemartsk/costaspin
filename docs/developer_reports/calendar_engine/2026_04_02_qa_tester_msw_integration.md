# QA & Manager Report: TDD Testability and Mock Data Purge
**Date:** April 2, 2026  
**Assignee:** Frontend Developer (Antigravity AI)  
**Task:** `TASK_02_purge_mock_data.md`

## 1. Executive Summary (For PM)
В рамках перевода платформы на строгие рельсы TDD (Test-Driven Development) и подготовки к полноценному запуску продукта, мы полностью отрезали возможность системы запускаться на внутренних "ложных" (mock) данных. Frontend теперь "глупо" и строго работает только с Supabase. Если соединения нет, или оно настроено криво, система упадет, как и должна, защищая нас от ложно-положительных QA проверок (когда все работает на локальном компьютере, но падает в бою).

## 2. Архитектурные Изменения
- Файл `src/lib/mock-data.ts` (более 400+ строк фиктивных данных) полностью **удален** из кодовой базы.
- В файле хуков доступа к данным `src/hooks/useData.ts` вырезаны все обходные пути. Ранее там присутствовал код вида `if (!isSupabaseConfigured) return MOCK_DATA`. Теперь за это отвечает единая функция-броня `assertSupabase()`.
- Все компоненты, включая `CalendarPage`, `Dashboard`, и списки врачей больше не знают о моках – они намертво привязаны к облачной базе.

## 3. Инструкция для QA & Автотестеров
Так как мы удалили встроенные статические данные, мы внедрили Enterprise подход к изоляции тестов в Frontend (Mock Service Worker).

**Что нужно знать QA-инженеру:**
1. **MSW (Mock Service Worker) Включен:** Для локальных `vitest` unit-тестов теперь не нужно писать огромные заглушки для каждого хука через `vi.mock`. Инструмент перехватывает HTTP-трафик на сетевом уровне `window.fetch`. Если компонент пытается дернуть `GET /rest/v1/appointments`, MSW `src/test/handlers.ts` ответит валидным пустым массивом 200 OK.
2. Проект уже содержит перехватчики для: `/patients`, `/practitioners`, `/rooms`, `/appointments`, `/locations`, `/practitioner_schedules`. Вы можете дописывать свои моки для конкретных E2E сценариев (внутри самих тестов `server.use()`).
3. **Data-TestId:** Для проверки логики расписания (Calendar) зашиты следующие селекторы для тестов без привязки к стилизации:
   - Иконка бота ИИ: `data-testid="badge-source-ai"`
   - Иконка WhatsApp: `data-testid="badge-source-wa"`
   - Веб-запись: `data-testid="badge-source-web"`
   - Заштрихованная клетка нерабочего времени врача (`roster-unavailable`): `data-testid="roster-unavailable-cell"`

Все текущие 7 Unit тестов в `Calendar.test.tsx` и `CalendarFeatures.test.tsx` переписаны и работают "в зеленую".
