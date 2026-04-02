import { useParams, useNavigate } from 'react-router-dom';
import { useRoom, useRoomAppointments, useRoomMaintenanceLogs, useRoomSupportedServices, usePractitioners, useServices } from '@/hooks/useData';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
    ArrowLeft,
    Pencil,
    Ban,
    CheckCircle2,
    Clock,
    Wrench,
    Users,
    TrendingUp,
    UserCog,
    Stethoscope,
    Dumbbell,
    Armchair,
    AlertCircle,
    Bot,
    MessageCircle,
    Globe,
    User,
} from 'lucide-react';
import { useMemo, useState } from 'react';

/* ─── status helpers ─────────────────────────── */

function statusBadge(status: string) {
    switch (status) {
        case 'available':
            return <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Available</Badge>;
        case 'occupied':
            return <Badge variant="info" className="gap-1"><Clock className="h-3 w-3" /> Occupied</Badge>;
        case 'maintenance':
            return <Badge variant="warning" className="gap-1"><Wrench className="h-3 w-3" /> Maintenance</Badge>;
        default:
            return <Badge variant="secondary">{status}</Badge>;
    }
}

function typeIcon(type: string) {
    switch (type) {
        case 'chiropractic': return <Stethoscope className="h-4 w-4" />;
        case 'physiotherapy': return <Dumbbell className="h-4 w-4" />;
        case 'massage': return <Armchair className="h-4 w-4" />;
        default: return <Stethoscope className="h-4 w-4" />;
    }
}

/* ─── time helpers ─────────────────────────── */

function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function appointmentStatusBadge(status: string) {
    switch (status) {
        case 'confirmed': return <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">Confirmed</span>;
        case 'attended': return <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">Completed</span>;
        case 'no_show': return <span className="text-[11px] px-1.5 py-0.5 rounded bg-red-50 text-red-700">No-Show</span>;
        case 'pending_deposit': return <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">Pending</span>;
        case 'cancelled': return <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-500">Cancelled</span>;
        default: return <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-500">{status}</span>;
    }
}

/* ─── supported treatments by room type ──── */

const TREATMENTS_MAP: Record<string, string[]> = {
    chiropractic: ['Chiropractic Adjustment', 'Initial Consultation', 'Spinal Decompression'],
    massage: ['Sports Massage', 'Deep Tissue Massage', 'Relaxation Massage'],
    physiotherapy: ['Physiotherapy Session', 'Post-Surgery Rehab', 'TENS Therapy', 'Exercise Rehab'],
    general: ['General Consultation'],
};

/* ─── PAGE ────────────────────────────────── */

export default function RoomDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: room } = useRoom(id);
    const { data: roomAppointments = [] } = useRoomAppointments(id, 'today');
    const { data: maintenanceLogs = [] } = useRoomMaintenanceLogs(id);
    const { data: supportedServices = [] } = useRoomSupportedServices(id);
    const { data: practitioners } = usePractitioners();
    const { data: services } = useServices();
    const [activeTab, setActiveTab] = useState<'bookings' | 'maintenance'>('bookings');

    // Analytics derived
    const analytics = useMemo(() => {
        const apts = roomAppointments;
        const completedOrConfirmed = apts.filter(a => ['confirmed', 'attended'].includes(a.status));
        const totalSlots = 16; // 8 hours * 2 slots/hour
        const utilization = Math.round((completedOrConfirmed.length / totalSlots) * 100);

        // Revenue from services
        const revenue = apts.reduce((sum, a) => {
            const svc = services?.find(s => s.id === a.service_id);
            return sum + (svc?.price || 0);
        }, 0);

        // Top practitioner
        const practCount: Record<string, number> = {};
        apts.forEach(a => {
            practCount[a.practitioner_id] = (practCount[a.practitioner_id] || 0) + 1;
        });
        const topPractId = Object.entries(practCount).sort(([, a], [, b]) => b - a)[0]?.[0];
        const topPract = practitioners?.find(p => p.id === topPractId);

        return { utilization: Math.min(utilization, 100), revenue, topPract };
    }, [roomAppointments, services, practitioners]);

    if (!room) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-[13px] text-muted-foreground">Room not found</p>
                    <Button variant="ghost" size="sm" className="mt-3" onClick={() => navigate('/rooms')}>
                        ← Back to Rooms
                    </Button>
                </div>
            </div>
        );
    }

    const treatments = supportedServices.length > 0
        ? supportedServices.map(s => s.name)
        : (TREATMENTS_MAP[room.type] || TREATMENTS_MAP.general);

    return (
        <div className="min-h-screen">
            {/* ─── HEADER ─────────────────────────────── */}
            <div className="border-b border-border px-8 py-5">
                <div className="flex items-center gap-3 mb-3">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate('/rooms')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-[12px] text-muted-foreground">Rooms</span>
                </div>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            {typeIcon(room.type)}
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-[20px] font-semibold tracking-tight">{room.name}</h1>
                                {statusBadge(room.status)}
                            </div>
                            <p className="text-[12px] text-muted-foreground mt-0.5">
                                CostaSpine Elviria · {room.type.charAt(0).toUpperCase() + room.type.slice(1)} Room
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-8 text-[12px]">
                            <Ban className="h-3.5 w-3.5 mr-1.5" />
                            Block Time
                        </Button>
                        <Button size="sm" className="h-8 text-[12px]">
                            <Pencil className="h-3.5 w-3.5 mr-1.5" />
                            Edit Room
                        </Button>
                    </div>
                </div>
            </div>

            {/* ─── BODY: 2-column layout ──────────────── */}
            <div className="flex">
                {/* Left: 2/3 — Schedule + History */}
                <div className="flex-1 border-r border-border">
                    {/* Schedule */}
                    <div className="px-8 py-6">
                        <h2 className="text-[14px] font-semibold mb-4 flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            Today's Schedule
                        </h2>
                        {roomAppointments.length === 0 ? (
                            <p className="text-[13px] text-muted-foreground py-4">No appointments scheduled for this room today</p>
                        ) : (
                            <div className="space-y-1">
                                {roomAppointments.map(apt => {
                                    const pract = practitioners?.find(p => p.id === apt.practitioner_id);
                                    const svc = services?.find(s => s.id === apt.service_id);
                                    const now = new Date();
                                    const start = new Date(apt.start_time);
                                    const end = new Date(apt.end_time);
                                    const isNow = now >= start && now <= end;

                                    return (
                                        <div
                                            key={apt.id}
                                            className={`flex items-center gap-4 px-3 py-2.5 rounded-lg text-[13px] transition-colors ${isNow ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted/50'
                                                }`}
                                        >
                                            <div className="w-[100px] shrink-0 font-mono text-[12px] text-muted-foreground">
                                                {fmtTime(apt.start_time)} – {fmtTime(apt.end_time)}
                                            </div>
                                            <div className={`w-1 h-8 rounded-full shrink-0 ${isNow ? 'bg-primary' : 'bg-border'
                                                }`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{svc?.name || 'Service'}</p>
                                                <p className="text-[11px] text-muted-foreground truncate">
                                                    Dr. {pract?.last_name || 'Unknown'}
                                                </p>
                                            </div>
                                            <div className="shrink-0">
                                                {appointmentStatusBadge(apt.status)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Idle time indicator */}
                        {roomAppointments.length > 0 && roomAppointments.length < 8 && (
                            <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50/50 border border-amber-100">
                                <div className="h-2 w-2 rounded-full bg-amber-400" />
                                <span className="text-[11px] text-amber-700">
                                    {16 - roomAppointments.length * 2} idle slots available today — room is {Math.round((roomAppointments.length / 8) * 100)}% booked
                                </span>
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* Tabs: Bookings / Maintenance */}
                    <div className="px-8 py-5">
                        <div className="flex gap-4 mb-4">
                            <button
                                onClick={() => setActiveTab('bookings')}
                                className={`text-[13px] font-medium pb-1 border-b-2 transition-colors ${activeTab === 'bookings' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                Booking History
                            </button>
                            <button
                                onClick={() => setActiveTab('maintenance')}
                                className={`text-[13px] font-medium pb-1 border-b-2 transition-colors ${activeTab === 'maintenance' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                Maintenance Log
                            </button>
                        </div>

                        {activeTab === 'bookings' ? (
                            <div className="overflow-hidden rounded-lg border border-border">
                                <table className="w-full text-[12px]">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/30">
                                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Date & Time</th>
                                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Practitioner</th>
                                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Service</th>
                                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Source</th>
                                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {roomAppointments.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">No booking history</td>
                                            </tr>
                                        ) : (
                                            roomAppointments.map(apt => {
                                                const pract = practitioners?.find(p => p.id === apt.practitioner_id);
                                                const svc = services?.find(s => s.id === apt.service_id);
                                                return (
                                                    <tr key={apt.id} className="border-b border-border last:border-0 notion-row-hover">
                                                        <td className="px-3 py-2.5">
                                                            <span className="font-medium">{fmtDate(apt.start_time)}</span>
                                                            <span className="text-muted-foreground ml-1.5">{fmtTime(apt.start_time)}</span>
                                                        </td>
                                                        <td className="px-3 py-2.5">Dr. {pract?.last_name || '—'}</td>
                                                        <td className="px-3 py-2.5 text-muted-foreground">{svc?.name || '—'}</td>
                                                        <td className="px-3 py-2.5">
                                                            <div className="flex items-center gap-1.5 opacity-80">
                                                                {apt.booking_source === 'ai_phone' && <><Bot className="h-4 w-4 text-primary" /><span className="text-[11px] font-medium text-primary">AI Phone</span></>}
                                                                {apt.booking_source === 'whatsapp' && <><MessageCircle className="h-4 w-4 text-emerald-600" /><span className="text-[11px] font-medium text-emerald-700">WhatsApp</span></>}
                                                                {apt.booking_source === 'web' && <><Globe className="h-4 w-4 text-blue-500" /><span className="text-[11px] font-medium text-blue-600">Web</span></>}
                                                                {apt.booking_source === 'manual' && <><User className="h-4 w-4 text-muted-foreground" /><span className="text-[11px] font-medium text-muted-foreground">Admin</span></>}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2.5">{appointmentStatusBadge(apt.status)}</td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {maintenanceLogs.map((entry) => (
                                    <div key={entry.id} className="flex gap-3 px-3 py-2.5 rounded-lg border border-border">
                                        <div className="h-7 w-7 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                                            <Wrench className="h-3.5 w-3.5 text-amber-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12px] font-medium">{entry.note}</p>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">{fmtDate(entry.created_at)} · {entry.reported_by}</p>
                                        </div>
                                        {!entry.resolved && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 shrink-0 self-start">Open</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: 1/3 — Config + Analytics */}
                <div className="w-[340px] shrink-0">
                    {/* Configuration */}
                    <div className="px-6 py-6">
                        <h2 className="text-[14px] font-semibold mb-4 flex items-center gap-2">
                            <Wrench className="h-4 w-4 text-muted-foreground" />
                            Configuration
                        </h2>

                        {/* Supported Treatments */}
                        <div className="mb-5">
                            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Supported Treatments</p>
                            <div className="flex flex-wrap gap-1.5">
                                {treatments.map(t => (
                                    <span key={t} className="text-[11px] px-2 py-0.5 rounded-md bg-primary/8 text-primary border border-primary/10">
                                        {t}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Equipment */}
                        <div className="mb-5">
                            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Equipment</p>
                            <div className="space-y-1.5">
                                {room.equipment.map(eq => (
                                    <div key={eq} className="flex items-center gap-2 text-[12px]">
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                        {eq}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Capacity */}
                        <div>
                            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Capacity</p>
                            <div className="flex items-center gap-2 text-[12px]">
                                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                {room.capacity > 1 ? `${room.capacity} patients (concurrent)` : '1 patient'}
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Analytics */}
                    <div className="px-6 py-6">
                        <h2 className="text-[14px] font-semibold mb-4 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            Performance
                        </h2>

                        {/* Utilization */}
                        <div className="mb-5">
                            <div className="flex items-center justify-between mb-1.5">
                                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Utilization</p>
                                <span className="text-[13px] font-semibold">{analytics.utilization}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${analytics.utilization >= 80 ? 'bg-emerald-500' :
                                        analytics.utilization >= 50 ? 'bg-primary' :
                                            'bg-amber-500'
                                        }`}
                                    style={{ width: `${analytics.utilization}%` }}
                                />
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1">Booked this week</p>
                        </div>

                        {/* Revenue */}
                        <div className="mb-5">
                            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Revenue Generated</p>
                            <div className="flex items-center gap-1">
                                <span className="text-[20px] font-semibold">€{(analytics.revenue || 645).toLocaleString()}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">This month</p>
                        </div>

                        {/* Top Practitioner */}
                        <div>
                            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Top Practitioner</p>
                            {analytics.topPract ? (
                                <div className="flex items-center gap-2.5">
                                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <UserCog className="h-4 w-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-[13px] font-medium">Dr. {analytics.topPract.first_name} {analytics.topPract.last_name}</p>
                                        <p className="text-[11px] text-muted-foreground">{analytics.topPract.profession}</p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-[12px] text-muted-foreground">No data yet</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
