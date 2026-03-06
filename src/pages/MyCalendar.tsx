import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Settings2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
    useCurrentPractitioner,
    usePractitionerSchedules,
    useUpsertSchedule,
    useDeleteSchedule,
    useAppointments,
    useLocation,
} from '@/hooks/useData';
import { AppointmentDetailPanel } from '@/components/AppointmentDetailPanel';
import { formatTime } from '@/lib/utils';
import { toast } from 'sonner';
import type { Appointment } from '@/types';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 08:00 - 18:00

const TIME_OPTIONS = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00',
];

export default function MyCalendar() {
    const { user } = useAuth();
    const { data: practitioner, isLoading: practLoading } = useCurrentPractitioner(user?.id);
    const { data: schedules, isLoading: schedLoading } = usePractitionerSchedules(practitioner?.id);
    const { data: location } = useLocation();
    const upsertSchedule = useUpsertSchedule();
    const deleteSchedule = useDeleteSchedule();

    const [tab, setTab] = useState<'calendar' | 'schedule'>('calendar');
    const [weekStart, setWeekStart] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - d.getDay() + 1); // Monday
        d.setHours(0, 0, 0, 0);
        return d;
    });
    const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);

    // Fetch appointments for the visible week
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    const { data: allAppointments } = useAppointments();

    // Filter to this practitioner's appointments for this week
    const myAppointments = useMemo(() => {
        if (!allAppointments || !practitioner) return [];
        return allAppointments.filter(a =>
            a.practitioner_id === practitioner.id &&
            a.start_time >= `${weekStartStr}T00:00:00` &&
            a.start_time <= `${weekEndStr}T23:59:59` &&
            a.status !== 'cancelled'
        );
    }, [allAppointments, practitioner, weekStartStr, weekEndStr]);

    // Build a schedule map: dayOfWeek → { start_time, end_time }
    const scheduleMap = useMemo(() => {
        const map: Record<number, { start_time: string; end_time: string }> = {};
        for (const s of (schedules || [])) {
            map[s.day_of_week] = { start_time: s.start_time, end_time: s.end_time };
        }
        return map;
    }, [schedules]);

    const navigateWeek = (dir: -1 | 1) => {
        const next = new Date(weekStart);
        next.setDate(next.getDate() + dir * 7);
        setWeekStart(next);
    };

    const weekDates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
    });

    // Schedule editing
    const handleToggleDay = async (dayOfWeek: number, enabled: boolean) => {
        if (!practitioner || !location) return;
        if (enabled) {
            try {
                await upsertSchedule.mutateAsync({
                    practitioner_id: practitioner.id,
                    location_id: (location as any).id,
                    day_of_week: dayOfWeek,
                    start_time: '09:00',
                    end_time: '17:00',
                });
                toast.success(`${DAYS[dayOfWeek]} enabled`);
            } catch { toast.error('Failed to update'); }
        } else {
            try {
                await deleteSchedule.mutateAsync({
                    practitionerId: practitioner.id,
                    dayOfWeek,
                    locationId: (location as any).id,
                });
                toast.success(`${DAYS[dayOfWeek]} disabled`);
            } catch { toast.error('Failed to update'); }
        }
    };

    const handleTimeChange = async (dayOfWeek: number, field: 'start_time' | 'end_time', value: string) => {
        if (!practitioner || !location) return;
        const existing = scheduleMap[dayOfWeek];
        if (!existing) return;
        try {
            await upsertSchedule.mutateAsync({
                practitioner_id: practitioner.id,
                location_id: (location as any).id,
                day_of_week: dayOfWeek,
                start_time: field === 'start_time' ? value : existing.start_time,
                end_time: field === 'end_time' ? value : existing.end_time,
            });
        } catch { toast.error('Failed to update'); }
    };

    if (practLoading || schedLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="h-5 w-5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
            </div>
        );
    }

    if (!practitioner) {
        return (
            <div className="px-8 py-8">
                <h1 className="text-notion-h2 mb-2">My Calendar</h1>
                <p className="text-[13px] text-muted-foreground">
                    Your account is not linked to a practitioner profile.
                    Ask an admin to set your <code className="bg-muted px-1 rounded">user_id</code> in the practitioners table.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            {/* Header */}
            <div className="border-b border-border px-8 py-4 flex items-center justify-between">
                <div>
                    <h1 className="text-notion-h2">My Calendar</h1>
                    <p className="text-notion-caption">{practitioner.first_name} {practitioner.last_name} · {practitioner.profession}</p>
                </div>
                <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
                    <Button
                        variant={tab === 'calendar' ? 'default' : 'ghost'}
                        size="sm"
                        className="h-7 text-[12px] gap-1.5"
                        onClick={() => setTab('calendar')}
                    >
                        <CalendarIcon className="h-3.5 w-3.5" /> Appointments
                    </Button>
                    <Button
                        variant={tab === 'schedule' ? 'default' : 'ghost'}
                        size="sm"
                        className="h-7 text-[12px] gap-1.5"
                        onClick={() => setTab('schedule')}
                    >
                        <Settings2 className="h-3.5 w-3.5" /> My Schedule
                    </Button>
                </div>
            </div>

            {/* ─── TAB: APPOINTMENTS ─────────────────── */}
            {tab === 'calendar' && (
                <div className="px-8 py-4">
                    {/* Week navigation */}
                    <div className="flex items-center justify-between mb-4">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateWeek(-1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <h3 className="text-[14px] font-medium">
                            {weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </h3>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateWeek(1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Weekly Grid */}
                    <div className="border border-border rounded-lg overflow-hidden">
                        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border bg-muted/30">
                            <div className="px-2 py-2 text-[10px] text-muted-foreground" />
                            {weekDates.map((d, i) => {
                                const isToday = d.toDateString() === new Date().toDateString();
                                return (
                                    <div key={i} className={`px-2 py-2 text-center border-l border-border ${isToday ? 'bg-primary/5' : ''}`}>
                                        <p className="text-[10px] text-muted-foreground uppercase">{SHORT_DAYS[d.getDay()]}</p>
                                        <p className={`text-[14px] font-medium ${isToday ? 'text-primary' : ''}`}>{d.getDate()}</p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Time rows */}
                        {HOURS.map(hour => (
                            <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/50 last:border-b-0">
                                <div className="px-2 py-3 text-[11px] text-muted-foreground font-mono text-right pr-3">
                                    {String(hour).padStart(2, '0')}:00
                                </div>
                                {weekDates.map((d, dayIdx) => {
                                    const dayStr = d.toISOString().split('T')[0];
                                    const dayOfWeek = d.getDay();
                                    const sched = scheduleMap[dayOfWeek];
                                    const isWorkingHour = sched && hour >= parseInt(sched.start_time) && hour < parseInt(sched.end_time);

                                    // Find appointments starting in this hour
                                    const hourApts = myAppointments.filter(a => {
                                        const aptDate = a.start_time.split('T')[0];
                                        const aptHour = parseInt(a.start_time.split('T')[1].split(':')[0]);
                                        return aptDate === dayStr && aptHour === hour;
                                    });

                                    return (
                                        <div
                                            key={dayIdx}
                                            className={`border-l border-border px-1 py-0.5 min-h-[50px] relative ${isWorkingHour ? 'bg-primary/[0.02]' : 'bg-muted/20'
                                                }`}
                                        >
                                            {hourApts.map(apt => {
                                                const startMin = parseInt(apt.start_time.split('T')[1].split(':')[1] || '0');
                                                const endTime = new Date(apt.end_time);
                                                const startTime = new Date(apt.start_time);
                                                const durationMin = (endTime.getTime() - startTime.getTime()) / 60000;

                                                return (
                                                    <div
                                                        key={apt.id}
                                                        className="bg-primary/15 border-l-2 border-primary rounded-r-sm px-1.5 py-0.5 text-[11px] cursor-pointer hover:bg-primary/25 transition-colors mb-0.5"
                                                        style={{ marginTop: `${(startMin / 60) * 100}%` }}
                                                        onClick={() => setSelectedApt(apt)}
                                                    >
                                                        <p className="font-medium truncate">
                                                            {apt.patient?.first_name} {apt.patient?.last_name}
                                                        </p>
                                                        <p className="text-muted-foreground text-[10px]">
                                                            {formatTime(apt.start_time)} · {apt.service?.name || ''}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {/* Today's appointments list */}
                    <div className="mt-6">
                        <h3 className="text-[13px] font-medium mb-3">Today's Appointments ({myAppointments.filter(a => {
                            const today = new Date().toISOString().split('T')[0];
                            return a.start_time.split('T')[0] === today;
                        }).length})</h3>
                        <div className="space-y-1.5">
                            {myAppointments
                                .filter(a => a.start_time.split('T')[0] === new Date().toISOString().split('T')[0])
                                .sort((a, b) => a.start_time.localeCompare(b.start_time))
                                .map(apt => (
                                    <div
                                        key={apt.id}
                                        className="flex items-center justify-between px-3 py-2 border border-border rounded-lg notion-row-hover cursor-pointer"
                                        onClick={() => setSelectedApt(apt)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-[13px] font-mono text-muted-foreground w-12">
                                                {formatTime(apt.start_time)}
                                            </span>
                                            <div>
                                                <p className="text-[13px] font-medium">
                                                    {apt.patient?.first_name} {apt.patient?.last_name}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground">{apt.service?.name}</p>
                                            </div>
                                        </div>
                                        <Badge
                                            variant={
                                                apt.status === 'confirmed' ? 'success'
                                                    : apt.status === 'attended' ? 'info'
                                                        : apt.status === 'no_show' ? 'destructive'
                                                            : 'warning'
                                            }
                                            className="text-[10px]"
                                        >
                                            {apt.status.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                ))}
                            {myAppointments.filter(a => a.start_time.split('T')[0] === new Date().toISOString().split('T')[0]).length === 0 && (
                                <p className="text-[13px] text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
                                    No appointments today
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── TAB: SCHEDULE EDITOR ──────────────── */}
            {tab === 'schedule' && (
                <div className="px-8 py-6 max-w-2xl">
                    <div className="mb-4">
                        <h3 className="text-[15px] font-medium">Working Hours</h3>
                        <p className="text-notion-caption">Set the days and hours you're available for appointments.</p>
                    </div>

                    <div className="space-y-2">
                        {DAYS.map((dayName, dayIdx) => {
                            const sched = scheduleMap[dayIdx];
                            const enabled = !!sched;

                            return (
                                <div
                                    key={dayIdx}
                                    className={`flex items-center gap-4 px-4 py-3 border rounded-lg transition-colors ${enabled ? 'border-border bg-background' : 'border-border/50 bg-muted/20'
                                        }`}
                                >
                                    <Switch
                                        checked={enabled}
                                        onCheckedChange={(val: boolean) => handleToggleDay(dayIdx, val)}
                                    />
                                    <span className={`text-[13px] font-medium w-24 ${enabled ? '' : 'text-muted-foreground'}`}>
                                        {dayName}
                                    </span>

                                    {enabled ? (
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={sched.start_time.slice(0, 5)}
                                                onChange={(e) => handleTimeChange(dayIdx, 'start_time', e.target.value)}
                                                className="text-[13px] bg-muted/30 border border-border rounded px-2 py-1"
                                            >
                                                {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                            <span className="text-[12px] text-muted-foreground">to</span>
                                            <select
                                                value={sched.end_time.slice(0, 5)}
                                                onChange={(e) => handleTimeChange(dayIdx, 'end_time', e.target.value)}
                                                className="text-[13px] bg-muted/30 border border-border rounded px-2 py-1"
                                            >
                                                {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                            <span className="text-[11px] text-muted-foreground ml-2">
                                                ({(() => {
                                                    const startMins = parseInt(sched.start_time) * 60 + parseInt(sched.start_time.split(':')[1] || '0');
                                                    const endMins = parseInt(sched.end_time) * 60 + parseInt(sched.end_time.split(':')[1] || '0');
                                                    const diff = endMins - startMins;
                                                    return `${Math.floor(diff / 60)}h ${diff % 60 ? diff % 60 + 'm' : ''}`;
                                                })()})
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-[12px] text-muted-foreground italic">Day off</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <Separator className="my-6" />

                    {/* Weekly Summary */}
                    <div className="border border-border rounded-lg p-4">
                        <h4 className="text-[13px] font-medium mb-3">Weekly Summary</h4>
                        <div className="grid grid-cols-2 gap-3 text-[13px]">
                            <div>
                                <p className="text-muted-foreground text-[11px] uppercase tracking-wider mb-0.5">Working Days</p>
                                <p className="font-medium">{Object.keys(scheduleMap).length} days / week</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-[11px] uppercase tracking-wider mb-0.5">Total Hours</p>
                                <p className="font-medium">
                                    {(() => {
                                        let total = 0;
                                        for (const s of Object.values(scheduleMap)) {
                                            const start = parseInt(s.start_time) * 60 + parseInt(s.start_time.split(':')[1] || '0');
                                            const end = parseInt(s.end_time) * 60 + parseInt(s.end_time.split(':')[1] || '0');
                                            total += end - start;
                                        }
                                        return `${Math.floor(total / 60)}h ${total % 60 ? total % 60 + 'm' : ''}`;
                                    })()}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-[11px] uppercase tracking-wider mb-0.5">Max Patients/Day</p>
                                <p className="font-medium">{practitioner.max_patients_per_day}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-[11px] uppercase tracking-wider mb-0.5">Specialties</p>
                                <p className="font-medium">{practitioner.sub_specialties?.join(', ') || '—'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Appointment Detail Panel */}
            {selectedApt && (
                <AppointmentDetailPanel appointment={selectedApt} onClose={() => setSelectedApt(null)} />
            )}
        </div>
    );
}
