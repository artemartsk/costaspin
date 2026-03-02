import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const HOURS = Array.from({ length: 10 }, (_, i) => i + 8); // 08:00 - 17:00
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Mock appointments for the calendar
const mockEvents = [
    { day: 0, startHour: 9, duration: 1, patient: 'Maria García', service: 'Chiropractic', room: 'Room 1', practitioner: 'Dr. Wilson', color: 'bg-blue-50 border-blue-200 text-blue-700' },
    { day: 0, startHour: 10, duration: 0.75, patient: 'Ana López', service: 'Massage', room: 'Room 2', practitioner: 'M. Thompson', color: 'bg-violet-50 border-violet-200 text-violet-700' },
    { day: 0, startHour: 11, duration: 1, patient: 'David Brown', service: 'Physio', room: 'Physio Suite', practitioner: 'Dr. Chen', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
    { day: 1, startHour: 9, duration: 0.5, patient: 'John Smith', service: 'Follow-up', room: 'Room 1', practitioner: 'Dr. Wilson', color: 'bg-blue-50 border-blue-200 text-blue-700' },
    { day: 1, startHour: 10, duration: 1, patient: 'Elena Petrova', service: 'Assessment', room: 'Room 1', practitioner: 'Dr. Wilson', color: 'bg-blue-50 border-blue-200 text-blue-700' },
    { day: 1, startHour: 14, duration: 1, patient: 'Carlos Rivera', service: 'Massage', room: 'Room 2', practitioner: 'M. Thompson', color: 'bg-violet-50 border-violet-200 text-violet-700' },
    { day: 2, startHour: 9, duration: 1, patient: 'Sophie Martin', service: 'Physio', room: 'Physio Suite', practitioner: 'Dr. Chen', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
    { day: 2, startHour: 11, duration: 0.75, patient: 'Tom Baker', service: 'Chiropractic', room: 'Room 1', practitioner: 'Dr. Wilson', color: 'bg-blue-50 border-blue-200 text-blue-700' },
    { day: 3, startHour: 10, duration: 1, patient: 'Lisa Johnson', service: 'Rehab', room: 'Physio Suite', practitioner: 'Dr. Chen', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
    { day: 3, startHour: 14, duration: 0.75, patient: 'Mark Davis', service: 'Massage', room: 'Room 2', practitioner: 'M. Thompson', color: 'bg-violet-50 border-violet-200 text-violet-700' },
    { day: 4, startHour: 9, duration: 1, patient: 'New Patient', service: 'Initial Consult', room: 'Room 1', practitioner: 'Dr. Wilson', color: 'bg-amber-50 border-amber-200 text-amber-700' },
    { day: 4, startHour: 11, duration: 1, patient: 'Rosa Fernández', service: 'Physio', room: 'Physio Suite', practitioner: 'Dr. Chen', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
];

export default function CalendarPage() {
    const [weekOffset, setWeekOffset] = useState(0);

    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7);

    const weekDates = DAYS.map((_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        return d;
    });

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="border-b border-border px-8 py-5 flex items-center justify-between">
                <div>
                    <h1 className="text-notion-h2">Calendar</h1>
                    <p className="text-notion-caption mt-1">CostaSpine Elviria · Week view</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 border border-border rounded-md">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(w => w - 1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 px-3 text-[12px]" onClick={() => setWeekOffset(0)}>
                            Today
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(w => w + 1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button size="sm" className="h-8 text-[12px]">
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        New Booking
                    </Button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-auto">
                <div className="min-w-[800px]">
                    {/* Day Headers */}
                    <div className="grid grid-cols-[60px_repeat(6,1fr)] border-b border-border sticky top-0 bg-background z-10">
                        <div className="p-2" />
                        {weekDates.map((date, i) => {
                            const isToday = date.toDateString() === today.toDateString();
                            return (
                                <div key={i} className="p-2 text-center border-l border-border/50">
                                    <p className={cn('text-[11px] uppercase tracking-wider', isToday ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                                        {DAYS[i]}
                                    </p>
                                    <p className={cn(
                                        'text-[18px] font-medium mt-0.5',
                                        isToday ? 'bg-foreground text-background rounded-full w-7 h-7 flex items-center justify-center mx-auto' : 'text-foreground'
                                    )}>
                                        {date.getDate()}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Time Grid */}
                    <div className="grid grid-cols-[60px_repeat(6,1fr)]">
                        {HOURS.map((hour) => (
                            <div key={hour} className="contents">
                                <div className="h-16 flex items-start justify-end pr-2 pt-0.5">
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                        {String(hour).padStart(2, '0')}:00
                                    </span>
                                </div>
                                {DAYS.map((_, dayIdx) => {
                                    const events = mockEvents.filter(e => e.day === dayIdx && e.startHour === hour);
                                    return (
                                        <div key={dayIdx} className="h-16 border-l border-t border-border/40 relative">
                                            {events.map((evt, ei) => (
                                                <div
                                                    key={ei}
                                                    className={cn(
                                                        'absolute inset-x-1 top-0 rounded-md border px-2 py-1 cursor-pointer transition-shadow hover:shadow-sm z-10',
                                                        evt.color
                                                    )}
                                                    style={{ height: `${evt.duration * 64 - 4}px` }}
                                                >
                                                    <p className="text-[11px] font-medium truncate">{evt.patient}</p>
                                                    <p className="text-[10px] opacity-70 truncate">{evt.service} · {evt.room}</p>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
