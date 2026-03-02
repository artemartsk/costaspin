import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppointments } from '@/hooks/useData';

const HOURS = Array.from({ length: 10 }, (_, i) => i + 8); // 08:00 - 17:00
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PRACTITIONER_COLORS: Record<string, string> = {};
const COLOR_PALETTE = [
    'bg-blue-50 border-blue-200 text-blue-700',
    'bg-emerald-50 border-emerald-200 text-emerald-700',
    'bg-violet-50 border-violet-200 text-violet-700',
    'bg-amber-50 border-amber-200 text-amber-700',
    'bg-rose-50 border-rose-200 text-rose-700',
];
let colorIdx = 0;
function getColor(practitionerId: string) {
    if (!PRACTITIONER_COLORS[practitionerId]) {
        PRACTITIONER_COLORS[practitionerId] = COLOR_PALETTE[colorIdx % COLOR_PALETTE.length];
        colorIdx++;
    }
    return PRACTITIONER_COLORS[practitionerId];
}

export default function CalendarPage() {
    const [weekOffset, setWeekOffset] = useState(0);
    const { data: allAppointments, isLoading } = useAppointments();

    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7);

    const weekDates = DAYS.map((_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        return d;
    });

    // Map appointments onto the calendar grid
    const events = useMemo(() => {
        if (!allAppointments) return [];
        return allAppointments
            .filter((apt) => {
                const aptDate = new Date(apt.start_time);
                return aptDate >= weekDates[0] && aptDate <= new Date(weekDates[5].getTime() + 86400000);
            })
            .map((apt) => {
                const start = new Date(apt.start_time);
                const end = new Date(apt.end_time);
                const dayIdx = (start.getDay() + 6) % 7; // Mon=0
                const startHour = start.getHours();
                const startMin = start.getMinutes();
                const durationHours = (end.getTime() - start.getTime()) / 3600000;
                return {
                    ...apt,
                    dayIdx,
                    startHour,
                    startMin,
                    durationHours,
                    color: getColor(apt.practitioner_id),
                    patientName: apt.patient ? `${apt.patient.first_name} ${apt.patient.last_name}` : 'Patient',
                    serviceName: apt.service?.name || 'Appointment',
                    roomName: apt.room?.name || '',
                };
            });
    }, [allAppointments, weekDates]);

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="border-b border-border px-8 py-5 flex items-center justify-between">
                <div>
                    <h1 className="text-notion-h2">Calendar</h1>
                    <p className="text-notion-caption mt-1">CostaSpine · Week view</p>
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
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="h-5 w-5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                    </div>
                ) : (
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
                                        const cellEvents = events.filter(e => e.dayIdx === dayIdx && e.startHour === hour);
                                        return (
                                            <div key={dayIdx} className="h-16 border-l border-t border-border/40 relative">
                                                {cellEvents.map((evt) => (
                                                    <div
                                                        key={evt.id}
                                                        className={cn(
                                                            'absolute inset-x-1 rounded-md border px-2 py-1 cursor-pointer transition-shadow hover:shadow-sm z-10',
                                                            evt.color
                                                        )}
                                                        style={{
                                                            top: `${(evt.startMin / 60) * 64}px`,
                                                            height: `${Math.max(evt.durationHours * 64 - 4, 20)}px`
                                                        }}
                                                    >
                                                        <p className="text-[11px] font-medium truncate">{evt.patientName}</p>
                                                        <p className="text-[10px] opacity-70 truncate">{evt.serviceName} · {evt.roomName}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
