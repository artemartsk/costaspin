# 🎨 Design Spec: Edit Room Modal (Slide-over)

**Status:** ACTIVE  
**Component:** `EditRoomModal` (Slide-over Sheet)  
**Epic:** Rooms Management

## 🚨 UX Контекст (Problem Statement)
Администратору (или управляющему клиники) нужно быстро менять статус комнаты (например, сломался кушетка -> перевести в Maintenance), а также обновлять список оборудования. Попапы (Dialogs) плохо подходят для многокомпонентных настроек, поэтому мы продолжаем использовать паттерн **Slide-over Sheet**, как и в деталях записи.

---

## 📐 Текстовый прототип (Wireframe)

```text
========================================================
                                                       |
  Edit Room: Massage Room 2                            |
  [ Текст: Update settings, status, and equipment ]    |
-------------------------------------------------------|
                                                       |
  Basic Information                                    |
                                                       |
  Room Name *                                          |
  [ Massage Room 2                                   ] |
                                                       |
  Room Type *                      Capacity            |
  [ 💆🏻 Massage                 ▾ ] [ 1               ] |
                                                       |
-------------------------------------------------------|
                                                       |
  Operational Status                                   |
                                                       |
  [ 🟢 Available ]  [ 🟡 Maintenance ]                   | <-- Segmented Control (Tabs/Radio)
  
  (Если кликнули на Maintenance, плавно выезжает поле)
  Reason for maintenance *
  [ Опишите поломку, e.g. broken table...            ] |
                                                       |
-------------------------------------------------------|
                                                       |
  Capabilities & Equipment                             |
                                                       |
  Inventory & Equipment                                |
  [ TENS Unit ✕ ] [ Heating Pads ✕ ]                   | <-- Flex container с бейджами (Tags)
  [ Add equipment and press Enter...                 ] | <-- Обычный Input
                                                       |
  Supported Treatments (Services)                      |
  [ Авто-заполнение для типа 'Massage' ] <-- Опциональная кнопка-шорткат
  [x] Deep Tissue Massage                              |
  [x] Sports Massage                                   |
  [ ] Chiropractic adjustment                          |
  [ ] Physiotherapy Initial Setup                      |
                                                       |
-------------------------------------------------------|
  (Закрепленный Подвал)                                |
                                                       |
  [ Cancel ]                            [ Save Room ]  |
========================================================
```

## 🛠 Задачи для фронтенд-разработчика

Мы используем строгий **Medical SaaS (B2B / Notion-like)** стиль. Никаких кричащих цветов, фокус на типографике, приглушенных бордерах и "воздухе" между блоками. Разделяем логические блоки через `<Separator />`.

**1. Компонент Layout:**
- Используем компонент `Sheet` (выезжающая панель справа, ширина около `sm:max-w-[500px]`).

**2. Раздел 1: Базовые данные (Basic Info)**
- `Room Name`: `Input`.
- `Room Type`: `Select`. Опционально: в дропдауне можно добавить иконки к пунктам (Massage, Chiropractic и тд).
- `Capacity`: `Input type="number"`, дефолт 1.

**3. Раздел 2: Статус (Operational Status) — КРИТИЧНЫЙ UX**
- Не стоит использовать стандартный скучный `<select>`. Это самое важное поле.
- Использовать `RadioGroup` стилизованный под карточки/сегментированный контрол:
  - `Available`: При выборе рамка становится слегка зеленой (primary), иконка 🟢.
  - `Maintenance`: При выборе рамка становится желтой, иконка 🟡.
- **Главная фича:** Если выбран "Maintenance", с плавной анимацией высоты (Accordion 효과) появляется `<Textarea>` "Reason for maintenance". Если поле пустое, форму сохранять нельзя (Validation).

**4. Раздел 3: Оборудование (Equipment & Services)**
- Прямо сейчас нет готового `TagInput` в shadcn, поэтому можно собрать руками: `flex wrap` контейнер с компонентами `<Badge variant="secondary"> Текст <X className="cursor-pointer" /> </Badge>` и обычным инпутом, который слушает `onKeyDown = 'Enter'`. Ввод текста + Enter добавляет бейдж в массив.
- **Supported Treatments:** Простой скроллящийся список `<Checkbox>` элементов.
- Идея менеджера с шорткатом крутая: над списком можно поставить кнопку "Select all {Room Type} services".

**5. Подвал (Footer)**
- Кнопки зафиксированы внизу (fixed footer). `Save Room` — правая кнопка (primary).

---
**Сборка:** Для работы шторки потребуется стейт (открытие), а для инпутов желательно использовать `react-hook-form` + `zod` для валидации, так как тут есть сложная логика (Textarea Required if Maintenance).
