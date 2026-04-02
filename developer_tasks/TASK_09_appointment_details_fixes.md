# 🛠 Task: Appointment Details Panel - Bugfixes & AI Voice Integration

**Status:** TODO  
**Assignee:** Frontend Developer  
**Epic:** UI/UX & AI Core Logging  

## Контекст задачи
В ходе ревью компонента боковой панели `AppointmentDetailPanel` (Slide-over Sheet) были выявлены критические упущения по ТЗ, а также принято продуктовое решение добавить функционал прослушивания звонков ИИ. 

Данный тикет описывает требования ко второй итерации этого компонента.

---

## 🛑 1. Bugfixes (Что было сделано не так)

### 1.1 Отсутствует кнопка "Edit Booking"
- В футере компонента (где находятся кнопки Mark Attended, No Show, Cancel) **должна быть кнопка** `[ Edit Booking ]`.
- **UX:** Кнопка обведена контуром (`variant="outline"`). При клике она должна открывать существующую модалку ручного бронирования (`ManualBookingModal`), передавая в нее данные текущей записи для редактирования (изменение времени или услуги), после чего боковая панель Details закрывается.

### 1.2 Пустой блок AI Triage Summary
- Визуальный блок "AI Triage Summary" рендерится, но он **абсолютно пустой**.
- **Логика:** Необходимо парсить поле `triage_data` (тип JSONB). Выводить данные списком (например: `Category: ...`, `Symptoms: ...`, `Urgency: ...`). Если объект пуст, не рендерить блок вообще.

---

## ✨ 2. New Features (AI Voice Integration)

Если запись создана голосовым агентом (условие `appointment.booking_source === 'ai_phone'`), нам необходимо предоставить врачу доступ к исходникам диалога. База данных содержит `recording_url` и `transcript`.

### 2.1 Встроенный Аудиоплеер
- Сразу под блоком "AI Triage Summary" выведите нативный аудиоплеер, если в записи есть ссылка `recording_url`.
- **UI паттерн:**
  ```tsx
  <div className="mt-4 flex flex-col gap-2">
    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Call Recording</span>
    <audio controls src={appointment.recording_url} className="h-10 w-full rounded-md" />
  </div>
  ```

### 2.2 Полная транскрипция разговора (Accordion)
- Врачи хотят иногда читать диалог целиком, а не только выжимку.
- Использовать компонент `Accordion` (shadcn/ui), чтобы по умолчанию текст был скрыт.
- **UI паттерн:**
  ```tsx
  <Accordion type="single" collapsible className="w-full mt-2">
    <AccordionItem value="transcript">
      <AccordionTrigger className="text-sm">Read Full Transcript</AccordionTrigger>
      <AccordionContent className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md">
        {appointment.transcript}
      </AccordionContent>
    </AccordionItem>
  </Accordion>
  ```
- *Примечание:* Если `transcript` отсутствует (null), аккордеон рендерить не нужно.

---
**Менеджер:** Antigravity (PM Agent)  
**Контроль:** Убедитесь, что дизайн плеера и аккордеона не нарушает строгий "Medical SaaS" стиль (без ярких ядовитых цветов).
