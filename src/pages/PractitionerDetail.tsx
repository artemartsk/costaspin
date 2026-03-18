import { useParams, useNavigate } from 'react-router-dom';
import {
    usePractitioner,
    usePractitionerAppointments,
    usePractitionerLocations,
    usePractitionerSchedules,
    usePractitionerServices,
    useUpdatePractitioner,
    useUpsertSchedule,
    useDeleteSchedule,
    useServices,
} from '@/hooks/useData';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    ArrowLeft, Edit, Calendar, MapPin, Clock, Users, TrendingUp, DollarSign,
    Star, AlertCircle, Activity, Save, X,
} from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { toast } from 'sonner';

/* ─── constants ─────────────────────────────── */

const DAY_NAMES = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PROFESSIONS = ['Chiropractor', 'Physiotherapist', 'Massage Therapist'];
const SKILL_OPTIONS = ['acute_injury', 'chronic_pain', 'sports_injury', 'post_surgery', 'relaxation', 'rehab'];
const SKILL_LABELS: Record<string, string> = {
    acute_injury: 'Acute Injury', chronic_pain: 'Chronic Pain', sports_injury: 'Sports Injury',
    post_surgery: 'Post-Surgery', relaxation: 'Relaxation', rehab: 'Rehabilitation',
};
const STATUS_OPTIONS = [
    { value: 'active', label: 'Active', variant: 'success' as const },
    { value: 'on_leave', label: 'On Leave', variant: 'warning' as const },
    { value: 'sick_leave', label: 'Sick Leave', variant: 'destructive' as const },
];

/* ─── helpers ─────────────────────────────────── */

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

function aptStatusBadge(status: string) {
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

/* ─── edit form type ────────────────────────── */

interface EditForm {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    profession: string;
    sub_specialties: string;
    skill_tags: string[];
    max_patients_per_day: number;
    status: string;
    selected_services: string[];
    schedule: Record<number, { enabled: boolean; start: string; end: string }>;
}

/* ─── PAGE ────────────────────────────────────── */

export default function PractitionerDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [historyTab, setHistoryTab] = useState<'history' | 'patients'>('history');
    const [isEditing, setIsEditing] = useState(false);
    const [sheetVisible, setSheetVisible] = useState(false);
    const [form, setForm] = useState<EditForm | null>(null);

    const { data: practitioner, isLoading } = usePractitioner(id);
    const { data: todayAppointments } = usePractitionerAppointments(id, 'today');
    const { data: pastAppointments } = usePractitionerAppointments(id, 'past');
    const { data: locations } = usePractitionerLocations(id);
    const { data: schedules } = usePractitionerSchedules(id);
    const { data: practitionerServices } = usePractitionerServices(id);
    const { data: allServices } = useServices();

    const updatePractitioner = useUpdatePractitioner();
    const upsertSchedule = useUpsertSchedule();
    const deleteSchedule = useDeleteSchedule();

    /* ── open / close bottom sheet ── */
    const openEdit = () => {
        if (!practitioner) return;
        const schedMap: Record<number, { enabled: boolean; start: string; end: string }> = {};
        for (let d = 1; d <= 6; d++) {
            const s = schedules?.find(sc => sc.day_of_week === d);
            schedMap[d] = s
                ? { enabled: true, start: s.start_time?.slice(0, 5) ?? '09:00', end: s.end_time?.slice(0, 5) ?? '17:00' }
                : { enabled: false, start: '09:00', end: '17:00' };
        }
        setForm({
            first_name: practitioner.first_name,
            last_name: practitioner.last_name,
            email: practitioner.email ?? '',
            phone: practitioner.phone ?? '',
            profession: practitioner.profession,
            sub_specialties: (practitioner.sub_specialties || []).join(', '),
            skill_tags: practitioner.skill_tags || [],
            max_patients_per_day: practitioner.max_patients_per_day || 12,
            status: practitioner.is_active ? 'active' : 'on_leave',
            selected_services: practitionerServices?.map(s => s.id) ?? [],
            schedule: schedMap,
        });
        setIsEditing(true);
        // Trigger animation after mount
        requestAnimationFrame(() => setSheetVisible(true));
    };

    const closeEdit = () => {
        setSheetVisible(false);
        setTimeout(() => { setIsEditing(false); setForm(null); }, 300);
    };

    /* ── save ── */
    const handleSave = async () => {
        if (!form || !practitioner) return;
        try {
            await updatePractitioner.mutateAsync({
                id: practitioner.id,
                first_name: form.first_name,
                last_name: form.last_name,
                phone: form.phone || null,
                profession: form.profession,
                sub_specialties: form.sub_specialties.split(',').map(s => s.trim()).filter(Boolean),
                skill_tags: form.skill_tags,
                max_patients_per_day: form.max_patients_per_day,
                is_active: form.status === 'active',
            });

            const locationId = locations?.[0]?.id ?? '00000000-0000-0000-0000-000000000001';
            for (let day = 1; day <= 6; day++) {
                const entry = form.schedule[day];
                if (entry.enabled) {
                    await upsertSchedule.mutateAsync({
                        practitioner_id: practitioner.id,
                        location_id: locationId,
                        day_of_week: day,
                        start_time: entry.start,
                        end_time: entry.end,
                    });
                } else {
                    await deleteSchedule.mutateAsync({
                        practitionerId: practitioner.id,
                        dayOfWeek: day,
                        locationId,
                    });
                }
            }

            toast.success('Profile updated');
            closeEdit();
        } catch (err) {
            toast.error((err as Error).message);
        }
    };

    /* ── form helpers ── */
    const toggleSkill = (skill: string) => {
        if (!form) return;
        setForm({ ...form, skill_tags: form.skill_tags.includes(skill) ? form.skill_tags.filter(s => s !== skill) : [...form.skill_tags, skill] });
    };
    const toggleService = (serviceId: string) => {
        if (!form) return;
        setForm({ ...form, selected_services: form.selected_services.includes(serviceId) ? form.selected_services.filter(s => s !== serviceId) : [...form.selected_services, serviceId] });
    };
    const updateDay = (day: number, updates: Partial<{ enabled: boolean; start: string; end: string }>) => {
        if (!form) return;
        setForm({ ...form, schedule: { ...form.schedule, [day]: { ...form.schedule[day], ...updates } } });
    };

    /* ── analytics ── */
    const analytics = useMemo(() => {
        if (!pastAppointments?.length) return { revenue: 0, utilization: 0, noShowRate: 0 };
        const attended = pastAppointments.filter(a => a.status === 'attended');
        const noShows = pastAppointments.filter(a => a.status === 'no_show');
        const revenue = attended.reduce((sum, a) => sum + Number((a as any).service?.price ?? 0), 0);
        const noShowRate = Math.round((noShows.length / pastAppointments.length) * 100);
        const maxL = (practitioner?.max_patients_per_day ?? 12) * 5 * 4;
        return { revenue, utilization: Math.min(Math.round((attended.length / Math.max(maxL, 1)) * 100), 100), noShowRate };
    }, [pastAppointments, practitioner]);

    const uniquePatients = useMemo(() => {
        if (!pastAppointments) return [];
        const map = new Map<string, any>();
        pastAppointments.forEach(a => { const p = (a as any).patient; if (p && !map.has(p.id)) map.set(p.id, p); });
        return Array.from(map.values());
    }, [pastAppointments]);

    const todayLoad = todayAppointments?.length ?? 0;
    const maxLoad = practitioner?.max_patients_per_day ?? 12;
    const loadPct = Math.min(Math.round((todayLoad / maxLoad) * 100), 100);

    if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading…</div>;
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
    const locationName = locations?.[0]?.name ?? 'CostaSpine Elviria';
    const currentStatus = practitioner.is_active ? 'active' : 'on_leave';
    const statusInfo = STATUS_OPTIONS.find(s => s.value === currentStatus) ?? STATUS_OPTIONS[0];

    const relevantServices = practitionerServices?.filter(s => {
        const pm: Record<string, string[]> = { 'Chiropractor': ['chiropractic', 'assessment'], 'Physiotherapist': ['physiotherapy', 'assessment'], 'Massage Therapist': ['massage'] };
        return (pm[practitioner.profession] ?? []).includes(s.category ?? '');
    }) ?? [];

    return (
        <div className="min-h-screen">
            {/* ─── HEADER ─── */}
            <div className="border-b border-border px-8 py-4">
                <button onClick={() => navigate('/practitioners')} className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground mb-3 transition-colors">
                    <ArrowLeft className="h-3.5 w-3.5" /> Practitioners
                </button>
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-semibold shadow-md">{initials}</div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-[22px] font-semibold">Dr. {practitioner.first_name} {practitioner.last_name}</h1>
                            <Badge variant={statusInfo.variant}>● {statusInfo.label}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-[13px] text-muted-foreground mt-0.5">
                            <span>{practitioner.profession}</span>
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{locationName}</span>
                            {practitioner.email && <span>{practitioner.email}</span>}
                        </div>
                    </div>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={openEdit}>
                        <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit Profile
                    </Button>
                </div>
            </div>

            <div className="px-8 py-6">
                <div className="grid grid-cols-3 gap-6">
                    {/* ═══ LEFT COLUMN ═══ */}
                    <div className="col-span-2 space-y-6">
                        {/* Today's Schedule */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-[15px] font-medium flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /> Today's Schedule</h2>
                                <div className="flex items-center gap-2 text-[12px]">
                                    <span className="text-muted-foreground">Load:</span>
                                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all ${loadPct > 85 ? 'bg-red-500' : loadPct > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${loadPct}%` }} />
                                    </div>
                                    <span className="font-mono font-medium">{todayLoad}/{maxLoad}</span>
                                </div>
                            </div>
                            <div className="border border-border rounded-lg overflow-hidden">
                                <table className="w-full">
                                    <thead><tr className="border-b border-border bg-muted/30">
                                        {['Time', 'Patient', 'Service', 'Room', 'Status'].map(h => <th key={h} className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">{h}</th>)}
                                    </tr></thead>
                                    <tbody>
                                        {!todayAppointments?.length ? (
                                            <tr><td colSpan={5} className="px-4 py-6 text-center text-[13px] text-muted-foreground">No appointments today</td></tr>
                                        ) : todayAppointments.map(apt => (
                                            <tr key={apt.id} className="border-b border-border/50 last:border-b-0 notion-row-hover">
                                                <td className="px-4 py-2.5 text-[13px] font-mono text-muted-foreground">{fmtTime(apt.start_time)} – {fmtTime(apt.end_time)}</td>
                                                <td className="px-4 py-2.5 text-[13px] font-medium">{(apt as any).patient?.first_name} {(apt as any).patient?.last_name}</td>
                                                <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{(apt as any).service?.name ?? '—'}</td>
                                                <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{(apt as any).room?.name ?? '—'}</td>
                                                <td className="px-4 py-2.5">{aptStatusBadge(apt.status)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* History / Roster */}
                        <div>
                            <div className="flex items-center gap-4 mb-3 border-b border-border">
                                {(['history', 'patients'] as const).map(tab => (
                                    <button key={tab} onClick={() => setHistoryTab(tab)}
                                        className={`pb-2 text-[13px] font-medium border-b-2 transition-colors ${historyTab === tab ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                                        {tab === 'history' ? 'Booking History' : `Patient Roster (${uniquePatients.length})`}
                                    </button>
                                ))}
                            </div>
                            <div className="border border-border rounded-lg overflow-hidden">
                                {historyTab === 'history' ? (
                                    <table className="w-full">
                                        <thead><tr className="border-b border-border bg-muted/30">
                                            {['Date & Time', 'Patient', 'Service', 'Status'].map(h => <th key={h} className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">{h}</th>)}
                                        </tr></thead>
                                        <tbody>
                                            {!pastAppointments?.length ? (
                                                <tr><td colSpan={4} className="px-4 py-6 text-center text-[13px] text-muted-foreground">No history yet</td></tr>
                                            ) : pastAppointments.slice(0, 15).map(apt => (
                                                <tr key={apt.id} className="border-b border-border/50 last:border-b-0 notion-row-hover">
                                                    <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{fmtDate(apt.start_time)} {fmtTime(apt.start_time)}</td>
                                                    <td className="px-4 py-2.5 text-[13px] font-medium">{(apt as any).patient?.first_name} {(apt as any).patient?.last_name}</td>
                                                    <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{(apt as any).service?.name ?? '—'}</td>
                                                    <td className="px-4 py-2.5">{aptStatusBadge(apt.status)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <table className="w-full">
                                        <thead><tr className="border-b border-border bg-muted/30">
                                            {['Patient', 'Email', 'Phone'].map(h => <th key={h} className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">{h}</th>)}
                                        </tr></thead>
                                        <tbody>
                                            {uniquePatients.map((p: any) => (
                                                <tr key={p.id} className="border-b border-border/50 last:border-b-0 notion-row-hover cursor-pointer" onClick={() => navigate(`/patients/${p.id}`)}>
                                                    <td className="px-4 py-2.5 text-[13px] font-medium">{p.first_name} {p.last_name}</td>
                                                    <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{p.email ?? '—'}</td>
                                                    <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{p.phone ?? '—'}</td>
                                                </tr>
                                            ))}
                                            {!uniquePatients.length && <tr><td colSpan={3} className="px-4 py-6 text-center text-[13px] text-muted-foreground">No patients yet</td></tr>}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ═══ RIGHT COLUMN (read-only) ═══ */}
                    <div className="space-y-5">
                        {/* AI Matching Rules */}
                        <div className="border border-border rounded-lg p-4">
                            <h3 className="text-[13px] font-medium flex items-center gap-2 mb-3"><Activity className="h-3.5 w-3.5 text-blue-500" /> AI Matching Rules</h3>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Skill Tags</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {practitioner.skill_tags.map(tag => <span key={tag} className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-700 rounded-md border border-blue-200">{SKILL_LABELS[tag] ?? tag}</span>)}
                                        {!practitioner.skill_tags.length && <span className="text-[12px] text-muted-foreground">No tags set</span>}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Sub-specialties</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {practitioner.sub_specialties.map(spec => <span key={spec} className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium bg-purple-50 text-purple-700 rounded-md border border-purple-200">{spec}</span>)}
                                        {!practitioner.sub_specialties.length && <span className="text-[12px] text-muted-foreground">None</span>}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Services & Pricing</p>
                                    <div className="space-y-1">
                                        {relevantServices.map(svc => <div key={svc.id} className="flex items-center justify-between text-[12px]"><span>{svc.name}</span><span className="font-mono text-muted-foreground">€{svc.price}</span></div>)}
                                        {!relevantServices.length && <span className="text-[12px] text-muted-foreground">No services linked</span>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Schedule & Capacity */}
                        <div className="border border-border rounded-lg p-4">
                            <h3 className="text-[13px] font-medium flex items-center gap-2 mb-3"><Calendar className="h-3.5 w-3.5 text-emerald-500" /> Schedule & Capacity</h3>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Working Hours</p>
                                    <div className="space-y-1">
                                        {[1, 2, 3, 4, 5, 6].map(day => {
                                            const sched = schedules?.find(s => s.day_of_week === day);
                                            return <div key={day} className="flex items-center justify-between text-[12px]">
                                                <span className="w-8 text-muted-foreground font-medium">{DAY_NAMES[day]}</span>
                                                {sched ? <span className="font-mono">{sched.start_time?.slice(0, 5)} – {sched.end_time?.slice(0, 5)}</span> : <span className="text-muted-foreground/50 italic">Off</span>}
                                            </div>;
                                        })}
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-border/60">
                                    <div className="flex items-center justify-between text-[12px]">
                                        <span className="text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Max patients/day</span>
                                        <span className="font-semibold">{practitioner.max_patients_per_day}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Performance */}
                        <div className="border border-border rounded-lg p-4">
                            <h3 className="text-[13px] font-medium flex items-center gap-2 mb-3"><TrendingUp className="h-3.5 w-3.5 text-amber-500" /> Performance</h3>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Revenue Generated</p>
                                    <p className="text-[20px] font-semibold flex items-center gap-1"><DollarSign className="h-4 w-4 text-emerald-500" />€{analytics.revenue.toLocaleString()}</p>
                                    <p className="text-[11px] text-muted-foreground">This month</p>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between text-[12px] mb-1">
                                        <span className="text-muted-foreground uppercase tracking-wider text-[11px]">Utilization</span>
                                        <span className="font-mono font-medium">{analytics.utilization}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${analytics.utilization}%` }} /></div>
                                </div>
                                <div className="flex items-center justify-between text-[12px]">
                                    <span className="text-muted-foreground">No-Show Rate</span>
                                    <span className={`font-mono font-medium ${analytics.noShowRate > 15 ? 'text-red-500' : 'text-emerald-600'}`}>{analytics.noShowRate}%</span>
                                </div>
                                <div className="flex items-center justify-between text-[12px]">
                                    <span className="text-muted-foreground flex items-center gap-1"><Star className="h-3 w-3 text-amber-400" /> Review Score</span>
                                    <span className="font-mono font-medium">4.8</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════ */}
            {/* ═══ BOTTOM SHEET EDIT POPUP ═══════════════════════ */}
            {/* ═══════════════════════════════════════════════════ */}
            {isEditing && form && (
                <>
                    {/* Backdrop */}
                    <div
                        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${sheetVisible ? 'opacity-100' : 'opacity-0'}`}
                        onClick={closeEdit}
                    />

                    {/* Sheet */}
                    <div
                        className={`fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out ${sheetVisible ? 'translate-y-0' : 'translate-y-full'}`}
                        style={{ height: '90vh' }}
                    >
                        {/* Drag handle */}
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
                        </div>

                        {/* Sheet Header */}
                        <div className="flex items-center justify-between px-8 py-3 border-b border-border">
                            <h2 className="text-[17px] font-semibold">Edit Profile — Dr. {practitioner.first_name} {practitioner.last_name}</h2>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={closeEdit}>
                                    <X className="h-3.5 w-3.5 mr-1.5" /> Cancel
                                </Button>
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSave} disabled={updatePractitioner.isPending}>
                                    <Save className="h-3.5 w-3.5 mr-1.5" /> {updatePractitioner.isPending ? 'Saving…' : 'Save Changes'}
                                </Button>
                            </div>
                        </div>

                        {/* Sheet Body — scrollable two-column layout */}
                        <div className="overflow-y-auto px-8 py-6" style={{ height: 'calc(90vh - 90px)' }}>
                            <div className="grid grid-cols-2 gap-8 max-w-5xl mx-auto">

                                {/* ── Left: Profile & Status ── */}
                                <div className="space-y-5">
                                    <h3 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">Profile & Identity</h3>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">First Name *</label>
                                            <Input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} className="mt-1 h-9 text-[13px]" />
                                        </div>
                                        <div>
                                            <label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Last Name *</label>
                                            <Input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} className="mt-1 h-9 text-[13px]" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Email</label>
                                        <Input value={form.email} disabled className="mt-1 h-9 text-[13px] bg-muted/50" />
                                        <p className="text-[10px] text-muted-foreground mt-0.5">Linked to auth — cannot be changed</p>
                                    </div>

                                    <div>
                                        <label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Phone</label>
                                        <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="mt-1 h-9 text-[13px]" placeholder="+34 600 000 000" />
                                    </div>

                                    <div>
                                        <label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Profession *</label>
                                        <div className="flex flex-wrap gap-2 mt-1.5">
                                            {PROFESSIONS.map(prof => (
                                                <button key={prof} onClick={() => setForm({ ...form, profession: prof })}
                                                    className={`px-3 py-1.5 rounded-lg text-[12px] border transition-colors ${form.profession === prof ? 'bg-foreground text-background border-foreground' : 'border-border hover:bg-muted'}`}>
                                                    {prof}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Status</label>
                                        <div className="flex flex-wrap gap-2 mt-1.5">
                                            {STATUS_OPTIONS.map(opt => (
                                                <button key={opt.value} onClick={() => setForm({ ...form, status: opt.value })}
                                                    className={`px-3 py-1.5 rounded-lg text-[12px] border transition-colors ${form.status === opt.value
                                                        ? opt.value === 'active' ? 'bg-emerald-600 text-white border-emerald-600'
                                                            : opt.value === 'on_leave' ? 'bg-amber-500 text-white border-amber-500'
                                                                : 'bg-red-500 text-white border-red-500'
                                                        : 'border-border hover:bg-muted'}`}>
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Location</label>
                                        <div className="mt-1.5 flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg border border-border text-[13px]">
                                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span className="font-medium">{locationName}</span>
                                            <span className="text-[10px] text-muted-foreground ml-1">(pilot)</span>
                                        </div>
                                    </div>

                                    {/* AI Matching */}
                                    <div className="pt-4 border-t border-border">
                                        <h3 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground mb-4">AI Matching Rules</h3>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Skill Tags</label>
                                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                    {SKILL_OPTIONS.map(skill => (
                                                        <button key={skill} onClick={() => toggleSkill(skill)}
                                                            className={`px-2.5 py-1 rounded-md text-[11px] border transition-colors ${form.skill_tags.includes(skill) ? 'bg-blue-600 text-white border-blue-600' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                                                            {SKILL_LABELS[skill] ?? skill}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Sub-specialties</label>
                                                <Input value={form.sub_specialties} onChange={e => setForm({ ...form, sub_specialties: e.target.value })}
                                                    className="mt-1 h-9 text-[13px]" placeholder="Sports injury, Pediatric (comma-separated)" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Right: Schedule & Services ── */}
                                <div className="space-y-5">
                                    <h3 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">Schedule & Services</h3>

                                    {/* Working Hours */}
                                    <div>
                                        <label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Working Hours</label>
                                        <div className="space-y-2 mt-2">
                                            {[1, 2, 3, 4, 5, 6].map(day => {
                                                const entry = form.schedule[day];
                                                return (
                                                    <div key={day} className="flex items-center gap-3">
                                                        <span className={`w-10 text-[13px] font-medium ${entry.enabled ? 'text-foreground' : 'text-muted-foreground/40'}`}>{DAY_NAMES[day]}</span>
                                                        <button onClick={() => updateDay(day, { enabled: !entry.enabled })}
                                                            className={`h-6 w-11 rounded-full transition-colors relative shrink-0 ${entry.enabled ? 'bg-emerald-500' : 'bg-muted'}`}>
                                                            <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${entry.enabled ? 'left-[22px]' : 'left-0.5'}`} />
                                                        </button>
                                                        {entry.enabled ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <input type="time" value={entry.start} onChange={e => updateDay(day, { start: e.target.value })}
                                                                    className="h-8 w-[100px] rounded-md border border-border bg-background px-2 text-[13px] font-mono" />
                                                                <span className="text-muted-foreground text-[13px]">–</span>
                                                                <input type="time" value={entry.end} onChange={e => updateDay(day, { end: e.target.value })}
                                                                    className="h-8 w-[100px] rounded-md border border-border bg-background px-2 text-[13px] font-mono" />
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground/40 italic text-[12px]">Day off</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Max Patients */}
                                    <div>
                                        <label className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Max Patients per Day</label>
                                        <Input type="number" value={form.max_patients_per_day}
                                            onChange={e => setForm({ ...form, max_patients_per_day: parseInt(e.target.value) || 12 })}
                                            className="mt-1 h-9 text-[13px] w-24" min={1} max={30} />
                                    </div>

                                    {/* Services */}
                                    <div className="pt-4 border-t border-border">
                                        <h3 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground mb-4">Supported Services</h3>
                                        <div className="space-y-1 max-h-[280px] overflow-y-auto border border-border rounded-lg p-3">
                                            {(allServices ?? []).map(svc => (
                                                <label key={svc.id} className="flex items-center gap-3 text-[13px] cursor-pointer hover:bg-muted/50 rounded-md px-2 py-1.5 transition-colors">
                                                    <input type="checkbox" checked={form.selected_services.includes(svc.id)}
                                                        onChange={() => toggleService(svc.id)}
                                                        className="rounded border-border h-4 w-4" />
                                                    <span className="flex-1">{svc.name}</span>
                                                    <span className="font-mono text-muted-foreground text-[12px]">€{svc.price}</span>
                                                </label>
                                            ))}
                                            {!allServices?.length && <p className="text-[13px] text-muted-foreground text-center py-4">No services available</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
