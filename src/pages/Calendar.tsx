import { useState, useMemo, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Phone, MessageCircle, Globe, ChevronDown, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addWeeks, subWeeks, startOfWeek, isSameWeek, format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useAppointments, usePractitioners, useRooms, useUpdateAppointment, useLocations, useAllPractitionerSchedules } from '@/hooks/useData';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ManualBookingModal } from '@/components/ManualBookingModal';
import { AppointmentDetailsSheet } from '@/components/AppointmentDetailsSheet';

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
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
    const [selectedPractitionerId, setSelectedPractitionerId] = useState<string>('all');
    const [selectedRoomId, setSelectedRoomId] = useState<string>('all');
    const [bookingSlot, setBookingSlot] = useState<{ date: Date; hour: number; startMin?: number } | null>(null);

    const [draggingEventId, setDraggingEventId] = useState<string | null>(null);
    const [dropTarget, setDropTarget] = useState<{ dayIdx: number; hour: number } | null>(null);
    const [resizingEventId, setResizingEventId] = useState<string | null>(null);
    
    const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
    const [editingAppointment, setEditingAppointment] = useState<any | null>(null);
    const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false);

    const [tempDuration, setTempDuration] = useState<Record<string, number>>({});
    const resizeAnchor = useRef<{ startY: number, startDuration: number, id: string, startTime: string } | null>(null);

    const { data: locations } = useLocations();
    const { data: globalSchedules } = useAllPractitionerSchedules();
    const { data: allAppointments, isLoading } = useAppointments();
    const { data: practitioners } = usePractitioners();
    const { data: rooms } = useRooms();
    const { mutate: updateAppointment } = useUpdateAppointment();

    useEffect(() => {
        if (locations && locations.length > 0 && selectedLocationId === 'all') {
            setSelectedLocationId(locations[0].id);
        }
    }, [locations, selectedLocationId]);

    useEffect(() => {
        if (!resizingEventId) return;
        
        const handleMouseMove = (e: MouseEvent) => {
            if (!resizeAnchor.current) return;
            const deltaY = e.clientY - resizeAnchor.current.startY;
            // 64px = 1 hour
            const addedHours = deltaY / 64;
            let newDuration = Math.max(0.25, resizeAnchor.current.startDuration + addedHours);
            // snap to 15 mins (0.25 hours)
            newDuration = Math.round(newDuration * 4) / 4;
            
            setTempDuration(prev => ({ ...prev, [resizeAnchor.current!.id]: newDuration }));
        };

        const handleMouseUp = () => {
            if (!resizeAnchor.current) return;
            const id = resizeAnchor.current.id;
            const finalDur = tempDuration[id];
            if (finalDur && finalDur !== resizeAnchor.current.startDuration) {
                const start = new Date(resizeAnchor.current.startTime);
                const end = new Date(start.getTime() + finalDur * 3600000);
                
                const evt = allAppointments?.find(a => a.id === id);
                let conflict: string | null = null;
                if (evt && allAppointments) {
                    for (const apt of allAppointments) {
                        if (apt.id === id) continue;
                        const aptStart = new Date(apt.start_time);
                        const aptEnd = new Date(apt.end_time);
                        if (start < aptEnd && end > aptStart) {
                            if (apt.room_id === evt.room_id) conflict = 'Room is already booked for this time slot.';
                            else if (apt.practitioner_id === evt.practitioner_id) conflict = 'Practitioner is already booked for this time slot.';
                            if (conflict) break;
                        }
                    }
                }

                if (conflict) {
                    toast.error('Booking Conflict', { description: conflict });
                } else {
                    updateAppointment({ id, end_time: end.toISOString() });
                }
            }
            setResizingEventId(null);
            setTempDuration(prev => { const n = {...prev}; delete n[id]; return n; });
            resizeAnchor.current = null;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
    }, [resizingEventId, tempDuration, updateAppointment]);

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggingEventId(id);
        e.dataTransfer.effectAllowed = 'move';
        // Hide the default drag ghost slightly if needed
    };

    const handleDrop = (e: React.DragEvent, date: Date, hour: number) => {
        setDropTarget(null);
        if (!draggingEventId || !events || !allAppointments) return;
        const evt = events.find(x => x.id === draggingEventId);
        if (!evt) return;

        const newStart = new Date(date);
        newStart.setHours(hour, evt.startMin, 0, 0);
        const newEnd = new Date(newStart.getTime() + evt.durationHours * 3600000);

        let conflict: string | null = null;
        for (const apt of allAppointments) {
            if (apt.id === evt.id) continue;
            const aptStart = new Date(apt.start_time);
            const aptEnd = new Date(apt.end_time);
            if (newStart < aptEnd && newEnd > aptStart) {
                if (apt.room_id === evt.room_id) conflict = 'Room is already booked.';
                else if (apt.practitioner_id === evt.practitioner_id) conflict = 'Practitioner is already booked.';
                if (conflict) break;
            }
        }
        
        if (conflict) {
            toast.error('Booking Conflict', { description: conflict });
            setDraggingEventId(null);
            return;
        }

        updateAppointment({ id: evt.id, start_time: newStart.toISOString(), end_time: newEnd.toISOString() });
        setDraggingEventId(null);
    };

    const handleDragEnd = () => {
        setDraggingEventId(null);
        setDropTarget(null);
    };

    const handleResizeStart = (e: React.MouseEvent, id: string, startTime: string, duration: number) => {
        e.stopPropagation();
        e.preventDefault();
        resizeAnchor.current = { startY: e.clientY, startDuration: duration, id, startTime };
        setResizingEventId(id);
    };

    const today = new Date();
    const startOfWeekDate = startOfWeek(currentDate, { weekStartsOn: 1 });

    const weekDates = DAYS.map((_, i) => {
        const d = new Date(startOfWeekDate);
        d.setDate(startOfWeekDate.getDate() + i);
        return d;
    });

    // Map appointments onto the calendar grid
    const events = useMemo(() => {
        if (!allAppointments) return [];
        const mappedEvents = allAppointments
            .filter((apt) => {
                const aptDate = new Date(apt.start_time);
                if (aptDate < weekDates[0] || aptDate > new Date(weekDates[5].getTime() + 86400000)) return false;
                if (selectedLocationId !== 'all' && apt.location_id !== selectedLocationId) return false;
                if (selectedPractitionerId !== 'all' && apt.practitioner_id !== selectedPractitionerId) return false;
                if (selectedRoomId !== 'all' && apt.room_id !== selectedRoomId) return false;
                return true;
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
                    lane: 0,
                    totalLanes: 1,
                };
            });

        // Calculate overlapping lanes
        const eventsByDay: Record<number, typeof mappedEvents> = {};
        mappedEvents.forEach(evt => {
            if (!eventsByDay[evt.dayIdx]) eventsByDay[evt.dayIdx] = [];
            eventsByDay[evt.dayIdx].push(evt);
        });

        Object.values(eventsByDay).forEach(dayEvents => {
            dayEvents.sort((a,b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

            const clusters: (typeof mappedEvents)[] = [];
            let currentCluster: typeof mappedEvents = [];
            let clusterEnd = 0;

            dayEvents.forEach(evt => {
                const start = new Date(evt.start_time).getTime();
                const end = new Date(evt.end_time).getTime();
                if (currentCluster.length === 0) {
                    currentCluster.push(evt);
                    clusterEnd = end;
                } else {
                    if (start < clusterEnd) {
                        currentCluster.push(evt);
                        clusterEnd = Math.max(clusterEnd, end);
                    } else {
                        clusters.push(currentCluster);
                        currentCluster = [evt];
                        clusterEnd = end;
                    }
                }
            });
            if (currentCluster.length > 0) clusters.push(currentCluster);

            clusters.forEach(cluster => {
                const lanes: (typeof mappedEvents)[] = [];
                cluster.forEach(evt => {
                    const start = new Date(evt.start_time).getTime();
                    let placed = false;
                    for (let i = 0; i < lanes.length; i++) {
                        const laneLastEventEnd = new Date(lanes[i][lanes[i].length - 1].end_time).getTime();
                        if (laneLastEventEnd <= start) {
                            lanes[i].push(evt);
                            evt.lane = i;
                            placed = true;
                            break;
                        }
                    }
                    if (!placed) {
                        lanes.push([evt]);
                        evt.lane = lanes.length - 1;
                    }
                });
                cluster.forEach(evt => {
                    evt.totalLanes = lanes.length;
                });
            });
        });

        return mappedEvents;
    }, [allAppointments, weekDates, selectedPractitionerId, selectedRoomId, selectedLocationId]);

    const isWorkingHour = (dayIdx: number, hour: number) => {
        if (selectedPractitionerId === 'all') return true; 
        if (!globalSchedules || globalSchedules.length === 0) return true;

        const dateDay = weekDates[dayIdx].getDay();
        const standardDay = dateDay === 0 ? 7 : dateDay;
        
        const schedules = globalSchedules.filter(s => s.practitioner_id === selectedPractitionerId && s.day_of_week === standardDay);
        if (schedules.length === 0) return false;
        
        for (const shift of schedules) {
            const shiftStartHour = parseInt(shift.start_time.split(':')[0], 10);
            const shiftEndHour = parseInt(shift.end_time.split(':')[0], 10);
            if (hour >= shiftStartHour && hour < shiftEndHour) return true;
        }
        return false;
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="border-b border-border px-8 py-5 flex items-center justify-between">
                <div>
                    <h1 className="text-notion-h2">Calendar</h1>
                    <p className="text-notion-caption mt-1">CostaSpine · Week view</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 px-3 text-[12px]"
                        disabled={isSameWeek(currentDate, today, { weekStartsOn: 1 })}
                        onClick={() => setCurrentDate(new Date())}
                    >
                        Today
                    </Button>
                    <div className="flex items-center border border-border rounded-md">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none border-r border-border" onClick={() => setCurrentDate(subWeeks(currentDate, 1))}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => setCurrentDate(addWeeks(currentDate, 1))}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 px-3 text-[12px] font-medium min-w-[200px] justify-between">
                                <span>{format(weekDates[0], 'MMM d')} – {format(weekDates[5], 'MMM d, yyyy')}</span>
                                <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={currentDate}
                                onSelect={(date) => {
                                    if (date) {
                                        setCurrentDate(date);
                                        setIsCalendarOpen(false);
                                    }
                                }}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                    
                    {/* Filters */}
                    <div className="flex gap-2 ml-4">
                        <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                            <SelectTrigger className="w-[180px] h-8 text-[12px]">
                                <SelectValue placeholder="All Locations" />
                            </SelectTrigger>
                            <SelectContent>
                                {locations?.map(loc => (
                                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={selectedPractitionerId} onValueChange={setSelectedPractitionerId}>
                            <SelectTrigger className="w-[160px] h-8 text-[12px]">
                                <SelectValue placeholder="All Practitioners" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Practitioners</SelectItem>
                                {practitioners?.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                            <SelectTrigger className="w-[140px] h-8 text-[12px]">
                                <SelectValue placeholder="All Rooms" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Rooms</SelectItem>
                                {rooms?.map(r => (
                                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button size="sm" className="h-8 text-[12px]" onClick={() => setBookingSlot({ date: new Date(), hour: 9 })}>
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
                                        const sortedEvents = [...cellEvents].sort((a,b) => a.startMin - b.startMin);
                                        
                                        // Calculate free gaps
                                        const gaps: { startMin: number, durationMin: number }[] = [];
                                        let currentMin = 0;
                                        sortedEvents.forEach(evt => {
                                            if (evt.startMin > currentMin) {
                                                gaps.push({ startMin: currentMin, durationMin: evt.startMin - currentMin });
                                            }
                                            currentMin = Math.max(currentMin, evt.startMin + evt.durationHours * 60);
                                        });
                                        if (currentMin < 60) {
                                            gaps.push({ startMin: currentMin, durationMin: 60 - currentMin });
                                        }

                                        const isDropTarget = dropTarget?.dayIdx === dayIdx && dropTarget?.hour === hour;
                                        const working = isWorkingHour(dayIdx, hour);

                                        return (
                                            <div 
                                                key={dayIdx} 
                                                className={cn(
                                                    "h-16 border-l border-t border-border/40 relative transition-colors duration-200", 
                                                    draggingEventId && !isDropTarget && working && "bg-muted/10",
                                                    isDropTarget && working && "bg-primary/10 border-primary/30 outline-dashed outline-1 outline-primary/40 z-20",
                                                    !working && "bg-[repeating-linear-gradient(-45deg,_transparent,_transparent_4px,_rgba(0,0,0,0.03)_4px,_rgba(0,0,0,0.03)_8px)] bg-muted/20"
                                                )}
                                                data-testid={!working ? "roster-unavailable-cell" : undefined}
                                                onDragOver={(e) => { 
                                                    e.preventDefault(); 
                                                    if (!working) {
                                                        e.dataTransfer.dropEffect = 'none';
                                                        return;
                                                    }
                                                    e.dataTransfer.dropEffect = 'move';
                                                    if (dropTarget?.dayIdx !== dayIdx || dropTarget?.hour !== hour) {
                                                        setDropTarget({dayIdx, hour});
                                                    }
                                                }}
                                                onDragLeave={() => {
                                                    if (isDropTarget) setDropTarget(null);
                                                }}
                                                onDrop={(e) => handleDrop(e, weekDates[dayIdx], hour)}
                                            >
                                                {/* Hover empty slot (Gaps) */}
                                                {!draggingEventId && gaps.map((gap, i) => (
                                                    <div 
                                                        key={`gap-${i}`}
                                                        className="absolute inset-x-1 outline-dashed outline-2 outline-border/60 bg-muted/30 rounded-md opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer z-0"
                                                        style={{ 
                                                            top: `${(gap.startMin / 60) * 64}px`, 
                                                            height: `${Math.max((gap.durationMin / 60) * 64 - 2, 8)}px` 
                                                        }}
                                                        onClick={() => setBookingSlot({ date: weekDates[dayIdx], hour, startMin: gap.startMin })}
                                                    >
                                                        {gap.durationMin >= 15 && <Plus className="h-4 w-4 text-muted-foreground/60" />}
                                                    </div>
                                                ))}

                                                {/* Actual events */}
                                                {cellEvents.map((evt) => {
                                                    const isDragging = draggingEventId === evt.id;
                                                    const isResizing = resizingEventId === evt.id;
                                                    const currentDuration = tempDuration[evt.id] ?? evt.durationHours;

                                                    const isAiGenerated = evt.booking_source !== 'manual' || Object.keys(evt.triage_data || {}).length > 0;

                                                    return (
                                                        <div
                                                            key={evt.id}
                                                            draggable={!isResizing}
                                                            onClick={(e) => {
                                                                if (!isDragging && !isResizing) {
                                                                    setSelectedAppointmentId(evt.id);
                                                                    setIsDetailsSheetOpen(true);
                                                                }
                                                            }}
                                                            onDragStart={(e) => handleDragStart(e, evt.id)}
                                                            onDragEnd={handleDragEnd}
                                                            className={cn(
                                                                'absolute rounded-md border px-2 py-1 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-sm z-10 overflow-hidden flex flex-col',
                                                                evt.color,
                                                                isAiGenerated && 'before:absolute before:inset-x-0 before:top-0 before:h-[2.5px] before:bg-gradient-to-r before:from-primary/70 before:to-purple-500/70',
                                                                isDragging && 'opacity-50 ring-2 ring-primary ring-opacity-50 scale-[0.98]',
                                                                isResizing && 'z-20 shadow-md ring-2 ring-primary ring-opacity-50 !cursor-ns-resize'
                                                            )}
                                                            style={{
                                                                top: `${(evt.startMin / 60) * 64}px`,
                                                                height: `${Math.max(currentDuration * 64 - 4, 16)}px`,
                                                                left: `calc(${(evt.lane / evt.totalLanes) * 100}% + 4px)`,
                                                                width: `calc(${(1 / evt.totalLanes) * 100}% - 8px)`
                                                            }}
                                                        >
                                                            <p className="text-[11px] font-medium truncate pointer-events-none pr-4">{evt.patientName}</p>
                                                            <p className="text-[10px] opacity-70 truncate pointer-events-none">{evt.serviceName} · {evt.roomName}</p>
                                                            
                                                            <div className="absolute top-1.5 right-1.5 opacity-80 pointer-events-none flex gap-1">
                                                                {evt.booking_source === 'ai_phone' && <Phone data-testid="badge-source-ai" className="h-3 w-3 text-muted-foreground/80" />}
                                                                {evt.booking_source === 'whatsapp' && <MessageCircle data-testid="badge-source-wa" className="h-3 w-3 text-muted-foreground/80" />}
                                                                {evt.booking_source === 'web' && <Globe data-testid="badge-source-web" className="h-3 w-3 text-muted-foreground/80" />}
                                                            </div>
                                                            
                                                            {/* Resize Anchor Handle */}
                                                            <div 
                                                                className="absolute bottom-0 left-0 right-0 h-2 bg-black/0 hover:bg-black/10 cursor-ns-resize flex items-end justify-center pb-[2px]"
                                                                onMouseDown={(e) => handleResizeStart(e, evt.id, evt.start_time, currentDuration)}
                                                                draggable={false}
                                                            >
                                                                <div className="w-4 h-[2px] bg-foreground/20 rounded-full" />
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* New/Edit Booking Modal */}
            <ManualBookingModal 
                isOpen={bookingSlot !== null}
                onClose={() => {
                    setBookingSlot(null);
                    setEditingAppointment(null);
                }}
                bookingSlot={bookingSlot}
                selectedLocationId={selectedLocationId}
                preselectedPractitionerId={selectedPractitionerId !== 'all' ? selectedPractitionerId : undefined}
                editingAppointment={editingAppointment}
            />

            {/* Appointment Details Sheet (Slide-over) */}
            <AppointmentDetailsSheet 
                isOpen={isDetailsSheetOpen} 
                onClose={() => {
                    setIsDetailsSheetOpen(false);
                    setTimeout(() => setSelectedAppointmentId(null), 300); // clear state after transition
                }} 
                appointment={allAppointments?.find(a => a.id === selectedAppointmentId) || null} 
                onEdit={() => {
                    const apt = allAppointments?.find(a => a.id === selectedAppointmentId);
                    if (apt) {
                        const start = new Date(apt.start_time);
                        setEditingAppointment(apt);
                        setBookingSlot({
                            date: start,
                            hour: start.getHours(),
                            startMin: start.getMinutes()
                        });
                        setIsDetailsSheetOpen(false);
                    }
                }}
            />
        </div>
    );
}
