import { useParams, useNavigate } from 'react-router-dom';
import {
    usePractitioner,
    usePractitionerAppointments,
    usePractitionerLocations,
    usePractitionerSchedules,
    usePractitionerServices,
} from '@/hooks/useData';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    ArrowLeft,
    Edit,
    Calendar,
    MapPin,
    Clock,
    Users,
    TrendingUp,
    DollarSign,
    Star,
    AlertCircle,
    Activity,
} from 'lucide-react';
import { useMemo, useState } from 'react';

/* ─── helpers ─────────────────────────────────── */

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

const DAY_NAMES = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function statusBadge(status: string) {
    const map: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' | 'info' }> = {
        confirmed: { label: 'Confirmed', variant: 'success' },
        attended: { label: 'Completed', variant: 'info' },
        pending_deposit: { label: 'Pending', variant: 'warning' },
        no_show: { label: 'No Show', variant: 'destructive' },
        cancelled: { label: 'Cancelled', variant: 'secondary' },
    };
    const s = map[status] ?? { label: status, variant: 'secondary' as const };
    return <Badge variant={s.variant}>{s.label}</Badge>;
}

const SKILL_LABELS: Record<string, string> = {
    acute_injury: 'Acute Injury',
    chronic_pain: 'Chronic Pain',
    sports_injury: 'Sports Injury',
    post_surgery: 'Post-Surgery',
    relaxation: 'Relaxation',
    rehab: 'Rehabilitation',
};

/* ─── PAGE ────────────────────────────────────── */

export default function PractitionerDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [historyTab, setHistoryTab] = useState<'history' | 'patients'>('history');

    const { data: practitioner, isLoading } = usePractitioner(id);
    const { data: todayAppointments } = usePractitionerAppointments(id, 'today');
    const { data: pastAppointments } = usePractitionerAppointments(id, 'past');
    const { data: locations } = usePractitionerLocations(id);
    const { data: schedules } = usePractitionerSchedules(id);
    const { data: services } = usePractitionerServices(id);

    // Compute analytics from past appointments
    const analytics = useMemo(() => {
        if (!pastAppointments?.length) return { revenue: 0, utilization: 0, noShowRate: 0, totalPast: 0 };
        const attended = pastAppointments.filter(a => a.status === 'attended');
        const noShows = pastAppointments.filter(a => a.status === 'no_show');
        const revenue = attended.reduce((sum, a) => {
            const price = (a as any).service?.price ?? 0;
            return sum + Number(price);
        }, 0);
        const noShowRate = pastAppointments.length > 0
            ? Math.round((noShows.length / pastAppointments.length) * 100)
            : 0;
        const maxLoad = (practitioner?.max_patients_per_day ?? 12) * 5 * 4; // month estimate
        const utilization = Math.min(Math.round((attended.length / Math.max(maxLoad, 1)) * 100), 100);
        return { revenue, utilization, noShowRate, totalPast: pastAppointments.length };
    }, [pastAppointments, practitioner]);

    // Unique patients
    const uniquePatients = useMemo(() => {
        if (!pastAppointments) return [];
        const map = new Map<string, any>();
        pastAppointments.forEach(a => {
            const p = (a as any).patient;
            if (p && !map.has(p.id)) map.set(p.id, p);
        });
        return Array.from(map.values());
    }, [pastAppointments]);

    // Today's load
    const todayLoad = todayAppointments?.length ?? 0;
    const maxLoad = practitioner?.max_patients_per_day ?? 12;
    const loadPct = Math.min(Math.round((todayLoad / maxLoad) * 100), 100);

    if (isLoading) {
        return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading…</div>;
    }
    if (!practitioner) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
                <p className="text-muted-foreground">Practitioner not found</p>
                <Button variant="outline" onClick={() => navigate('/practitioners')}>Back to Practitioners</Button>
            </div>
        );
    }

    const initials = `${practitioner.first_name[0]}${practitioner.last_name[0]}`;
    const locationName = locations?.[0]?.name ?? 'CostaSpine';

    // Filter services relevant to this practitioner's profession
    const relevantServices = services?.filter(s => {
        const profMap: Record<string, string[]> = {
            'Chiropractor': ['chiropractic', 'assessment'],
            'Physiotherapist': ['physiotherapy', 'assessment'],
            'Massage Therapist': ['massage'],
        };
        return (profMap[practitioner.profession] ?? []).includes(s.category ?? '');
    }) ?? [];

    return (
        <div className="min-h-screen">
            {/* Header */}
            <div className="border-b border-border px-8 py-4">
                <button onClick={() => navigate('/practitioners')} className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground mb-3 transition-colors">
                    <ArrowLeft className="h-3.5 w-3.5" /> Practitioners
                </button>
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-semibold shadow-md">
                        {initials}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-[22px] font-semibold">Dr. {practitioner.first_name} {practitioner.last_name}</h1>
                            <Badge variant={practitioner.is_active ? 'success' : 'secondary'}>
                                {practitioner.is_active ? '● Active' : '● Inactive'}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-[13px] text-muted-foreground mt-0.5">
                            <span>{practitioner.profession}</span>
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{locationName}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                            <Calendar className="h-3.5 w-3.5 mr-1.5" /> Manage Schedule
                        </Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                            <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit Profile
                        </Button>
                    </div>
                </div>
            </div>

            <div className="px-8 py-6">
                <div className="grid grid-cols-3 gap-6">
                    {/* ─── LEFT COLUMN ─── */}
                    <div className="col-span-2 space-y-6">

                        {/* Today's Schedule */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-[15px] font-medium flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" /> Today's Schedule
                                </h2>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 text-[12px]">
                                        <span className="text-muted-foreground">Load:</span>
                                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${loadPct > 85 ? 'bg-red-500' : loadPct > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                style={{ width: `${loadPct}%` }}
                                            />
                                        </div>
                                        <span className="font-mono font-medium">{todayLoad}/{maxLoad}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="border border-border rounded-lg overflow-hidden">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/30">
                                            <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Time</th>
                                            <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Patient</th>
                                            <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Service</th>
                                            <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Room</th>
                                            <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {!todayAppointments?.length ? (
                                            <tr><td colSpan={5} className="px-4 py-6 text-center text-[13px] text-muted-foreground">No appointments today</td></tr>
                                        ) : (
                                            todayAppointments.map(apt => (
                                                <tr key={apt.id} className="border-b border-border/50 last:border-b-0 notion-row-hover">
                                                    <td className="px-4 py-2.5 text-[13px] font-mono text-muted-foreground">
                                                        {fmtTime(apt.start_time)} – {fmtTime(apt.end_time)}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-[13px] font-medium">
                                                        {(apt as any).patient?.first_name} {(apt as any).patient?.last_name}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-[13px] text-muted-foreground">
                                                        {(apt as any).service?.name ?? '—'}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-[13px] text-muted-foreground">
                                                        {(apt as any).room?.name ?? '—'}
                                                    </td>
                                                    <td className="px-4 py-2.5">{statusBadge(apt.status)}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {todayAppointments && todayAppointments.length > 0 && (
                                <p className="text-[12px] text-muted-foreground mt-2">
                                    <span className={loadPct > 85 ? 'text-red-500' : 'text-emerald-600'}>
                                        {loadPct > 85 ? '⚠️ Near capacity' : `🟢 ${maxLoad - todayLoad} slots available`}
                                    </span>
                                    {' '}— daily limit {maxLoad} patients
                                </p>
                            )}
                        </div>

                        {/* Booking History / Patient Roster */}
                        <div>
                            <div className="flex items-center gap-4 mb-3 border-b border-border">
                                <button
                                    onClick={() => setHistoryTab('history')}
                                    className={`pb-2 text-[13px] font-medium border-b-2 transition-colors ${historyTab === 'history' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                                >
                                    Booking History
                                </button>
                                <button
                                    onClick={() => setHistoryTab('patients')}
                                    className={`pb-2 text-[13px] font-medium border-b-2 transition-colors ${historyTab === 'patients' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                                >
                                    Patient Roster ({uniquePatients.length})
                                </button>
                            </div>

                            {historyTab === 'history' ? (
                                <div className="border border-border rounded-lg overflow-hidden">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-border bg-muted/30">
                                                <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Date & Time</th>
                                                <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Patient</th>
                                                <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Service</th>
                                                <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {!pastAppointments?.length ? (
                                                <tr><td colSpan={4} className="px-4 py-6 text-center text-[13px] text-muted-foreground">No history yet</td></tr>
                                            ) : (
                                                pastAppointments.slice(0, 15).map(apt => (
                                                    <tr key={apt.id} className="border-b border-border/50 last:border-b-0 notion-row-hover">
                                                        <td className="px-4 py-2.5 text-[13px] text-muted-foreground">
                                                            {fmtDate(apt.start_time)} {fmtTime(apt.start_time)}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-[13px] font-medium">
                                                            {(apt as any).patient?.first_name} {(apt as any).patient?.last_name}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-[13px] text-muted-foreground">
                                                            {(apt as any).service?.name ?? '—'}
                                                        </td>
                                                        <td className="px-4 py-2.5">{statusBadge(apt.status)}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="border border-border rounded-lg overflow-hidden">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-border bg-muted/30">
                                                <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Patient</th>
                                                <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Email</th>
                                                <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Phone</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {uniquePatients.map((p: any) => (
                                                <tr key={p.id} className="border-b border-border/50 last:border-b-0 notion-row-hover cursor-pointer" onClick={() => navigate(`/patients/${p.id}`)}>
                                                    <td className="px-4 py-2.5 text-[13px] font-medium">{p.first_name} {p.last_name}</td>
                                                    <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{p.email ?? '—'}</td>
                                                    <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{p.phone ?? '—'}</td>
                                                </tr>
                                            ))}
                                            {!uniquePatients.length && (
                                                <tr><td colSpan={3} className="px-4 py-6 text-center text-[13px] text-muted-foreground">No patients yet</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ─── RIGHT COLUMN ─── */}
                    <div className="space-y-5">

                        {/* AI Matching Rules */}
                        <div className="border border-border rounded-lg p-4">
                            <h3 className="text-[13px] font-medium flex items-center gap-2 mb-3">
                                <Activity className="h-3.5 w-3.5 text-blue-500" /> AI Matching Rules
                            </h3>

                            <div className="space-y-3">
                                <div>
                                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Skill Tags</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {practitioner.skill_tags.map(tag => (
                                            <span key={tag} className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                                                {SKILL_LABELS[tag] ?? tag}
                                            </span>
                                        ))}
                                        {!practitioner.skill_tags.length && <span className="text-[12px] text-muted-foreground">No tags set</span>}
                                    </div>
                                </div>

                                <div>
                                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Sub-specialties</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {practitioner.sub_specialties.map(spec => (
                                            <span key={spec} className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium bg-purple-50 text-purple-700 rounded-md border border-purple-200">
                                                {spec}
                                            </span>
                                        ))}
                                        {!practitioner.sub_specialties.length && <span className="text-[12px] text-muted-foreground">None</span>}
                                    </div>
                                </div>

                                <div>
                                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Services & Pricing</p>
                                    <div className="space-y-1">
                                        {relevantServices.map(svc => (
                                            <div key={svc.id} className="flex items-center justify-between text-[12px]">
                                                <span>{svc.name}</span>
                                                <span className="font-mono text-muted-foreground">€{svc.price}</span>
                                            </div>
                                        ))}
                                        {!relevantServices.length && <span className="text-[12px] text-muted-foreground">No services linked</span>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Schedule & Capacity */}
                        <div className="border border-border rounded-lg p-4">
                            <h3 className="text-[13px] font-medium flex items-center gap-2 mb-3">
                                <Calendar className="h-3.5 w-3.5 text-emerald-500" /> Schedule & Capacity
                            </h3>

                            <div className="space-y-3">
                                <div>
                                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Working Hours</p>
                                    <div className="space-y-1">
                                        {[1, 2, 3, 4, 5, 6].map(day => {
                                            const sched = schedules?.find(s => s.day_of_week === day);
                                            return (
                                                <div key={day} className="flex items-center justify-between text-[12px]">
                                                    <span className="w-8 text-muted-foreground font-medium">{DAY_NAMES[day]}</span>
                                                    {sched ? (
                                                        <span className="font-mono">{sched.start_time?.slice(0, 5)} – {sched.end_time?.slice(0, 5)}</span>
                                                    ) : (
                                                        <span className="text-muted-foreground/50 italic">Off</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-border/60">
                                    <div className="flex items-center justify-between text-[12px]">
                                        <span className="text-muted-foreground flex items-center gap-1">
                                            <Users className="h-3 w-3" /> Max patients/day
                                        </span>
                                        <span className="font-semibold">{practitioner.max_patients_per_day}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Performance */}
                        <div className="border border-border rounded-lg p-4">
                            <h3 className="text-[13px] font-medium flex items-center gap-2 mb-3">
                                <TrendingUp className="h-3.5 w-3.5 text-amber-500" /> Performance
                            </h3>

                            <div className="space-y-3">
                                <div>
                                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Revenue Generated</p>
                                    <p className="text-[20px] font-semibold flex items-center gap-1">
                                        <DollarSign className="h-4 w-4 text-emerald-500" />€{analytics.revenue.toLocaleString()}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">This month</p>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between text-[12px] mb-1">
                                        <span className="text-muted-foreground uppercase tracking-wider text-[11px]">Utilization</span>
                                        <span className="font-mono font-medium">{analytics.utilization}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${analytics.utilization}%` }} />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-[12px]">
                                    <span className="text-muted-foreground">No-Show Rate</span>
                                    <span className={`font-mono font-medium ${analytics.noShowRate > 15 ? 'text-red-500' : 'text-emerald-600'}`}>
                                        {analytics.noShowRate}%
                                    </span>
                                </div>

                                <div className="flex items-center justify-between text-[12px]">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                        <Star className="h-3 w-3 text-amber-400" /> Review Score
                                    </span>
                                    <span className="font-mono font-medium">4.8</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
