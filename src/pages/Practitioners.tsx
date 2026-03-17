import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Pencil, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { usePractitioners, useAppointments, useUpdatePractitioner, useCreatePractitionerAccount } from '@/hooks/useData';
import { useMemo, useState, useEffect } from 'react';
import { toast } from 'sonner';
import type { Practitioner } from '@/types';

const PROFESSIONS = ['Chiropractor', 'Physiotherapist', 'Massage Therapist'];
const SKILL_OPTIONS = ['acute_injury', 'chronic_pain', 'sports_injury', 'post_surgery', 'relaxation', 'rehab'];

interface PractitionerForm {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    profession: string;
    sub_specialties: string;
    skill_tags: string[];
    max_patients_per_day: number;
    password?: string;
}

const emptyForm: PractitionerForm = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    profession: 'Chiropractor',
    sub_specialties: '',
    skill_tags: [],
    max_patients_per_day: 12,
    password: '',
};

export default function Practitioners() {
    const { data: practitioners, isLoading } = usePractitioners();
    const today = new Date().toISOString().split('T')[0];
    const { data: todayApts } = useAppointments(today);
    const updatePractitioner = useUpdatePractitioner();
    const createPractitioner = useCreatePractitionerAccount();

    const [editingId, setEditingId] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState<PractitionerForm>(emptyForm);
    const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [copied, setCopied] = useState(false);

    const loadMap = useMemo(() => {
        const map: Record<string, number> = {};
        (todayApts || []).forEach(apt => {
            map[apt.practitioner_id] = (map[apt.practitioner_id] || 0) + 1;
        });
        return map;
    }, [todayApts]);

    // Populate form when editing
    useEffect(() => {
        if (editingId && practitioners) {
            const p = practitioners.find(pr => pr.id === editingId);
            if (p) {
                setForm({
                    first_name: p.first_name,
                    last_name: p.last_name,
                    email: p.email || '',
                    phone: p.phone || '',
                    profession: p.profession,
                    sub_specialties: (p.sub_specialties || []).join(', '),
                    skill_tags: p.skill_tags || [],
                    max_patients_per_day: p.max_patients_per_day || 12,
                });
            }
        }
    }, [editingId, practitioners]);

    const closePanel = () => {
        setEditingId(null);
        setShowCreate(false);
        setForm(emptyForm);
        setCredentials(null);
        setShowPassword(false);
    };

    const handleSave = async () => {
        if (!form.first_name || !form.last_name || !form.profession) {
            toast.error('Name and profession are required');
            return;
        }

        try {
            if (editingId) {
                await updatePractitioner.mutateAsync({
                    id: editingId,
                    first_name: form.first_name,
                    last_name: form.last_name,
                    email: form.email || null,
                    phone: form.phone || null,
                    profession: form.profession,
                    sub_specialties: form.sub_specialties.split(',').map(s => s.trim()).filter(Boolean),
                    skill_tags: form.skill_tags,
                    max_patients_per_day: form.max_patients_per_day,
                });
                toast.success('Practitioner updated');
                closePanel();
            }
        } catch (err) {
            toast.error((err as Error).message);
        }
    };

    const handleCreate = async () => {
        if (!form.email || !form.first_name || !form.last_name || !form.profession) {
            toast.error('Email, name, and profession are required');
            return;
        }

        try {
            const result = await createPractitioner.mutateAsync({
                email: form.email,
                password: form.password || undefined,
                first_name: form.first_name,
                last_name: form.last_name,
                profession: form.profession,
                phone: form.phone || undefined,
                sub_specialties: form.sub_specialties.split(',').map(s => s.trim()).filter(Boolean),
                skill_tags: form.skill_tags,
                max_patients_per_day: form.max_patients_per_day,
            });

            setCredentials(result.credentials);
            toast.success(`${form.first_name} ${form.last_name} created successfully`);
        } catch (err) {
            toast.error((err as Error).message);
        }
    };

    const toggleSkill = (skill: string) => {
        setForm(prev => ({
            ...prev,
            skill_tags: prev.skill_tags.includes(skill)
                ? prev.skill_tags.filter(s => s !== skill)
                : [...prev.skill_tags, skill],
        }));
    };

    const copyCredentials = () => {
        if (!credentials) return;
        navigator.clipboard.writeText(`Email: ${credentials.email}\nPassword: ${credentials.password}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const isPanel = editingId || showCreate;

    return (
        <div className="min-h-screen">
            <div className="border-b border-border px-8 py-6 flex items-center justify-between">
                <div>
                    <h1 className="text-notion-h2">Practitioners</h1>
                    <p className="text-notion-caption mt-1">Manage practitioner profiles and schedules</p>
                </div>
                <Button size="sm" className="h-8 text-[12px]" onClick={() => { setShowCreate(true); setForm(emptyForm); setCredentials(null); }}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add Practitioner
                </Button>
            </div>

            <div className="flex">
                {/* Main grid */}
                <div className={`px-8 py-6 ${isPanel ? 'w-[60%]' : 'w-full'} transition-all`}>
                    {isLoading ? (
                        <div className="flex items-center justify-center h-40">
                            <div className="h-5 w-5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                        </div>
                    ) : !practitioners?.length ? (
                        <p className="text-[13px] text-muted-foreground text-center py-8">No practitioners found</p>
                    ) : (
                        <div className={`grid ${isPanel ? 'grid-cols-2' : 'grid-cols-3'} gap-4`}>
                            {practitioners.map((p) => {
                                const todayCount = loadMap[p.id] || 0;
                                const maxPerDay = p.max_patients_per_day || 12;
                                const isSelected = editingId === p.id;
                                return (
                                    <div key={p.id} className={`border rounded-lg p-5 notion-row-hover cursor-pointer ${isSelected ? 'border-foreground ring-1 ring-foreground/10' : 'border-border'}`}
                                        onClick={() => { setEditingId(p.id); setShowCreate(false); setCredentials(null); }}
                                    >
                                        <div className="flex items-center gap-3 mb-4">
                                            <Avatar className="h-10 w-10">
                                                <AvatarFallback className="text-[13px] bg-foreground/5">{p.first_name[0]}{p.last_name[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[14px] font-medium truncate">{p.first_name} {p.last_name}</p>
                                                <p className="text-notion-caption">{p.profession}</p>
                                            </div>
                                            <button className="p-1.5 rounded-md hover:bg-muted" onClick={(e) => { e.stopPropagation(); setEditingId(p.id); setShowCreate(false); }}>
                                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            {p.sub_specialties?.length > 0 && (
                                                <div>
                                                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Specialties</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {p.sub_specialties.map((s: string) => (
                                                            <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {p.skill_tags?.length > 0 && (
                                                <div>
                                                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Skill Tags</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {p.skill_tags.map((t: string) => (
                                                            <span key={t} className="text-[10px] px-1.5 py-0.5 bg-muted rounded font-mono text-muted-foreground">{t}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="pt-2 border-t border-border/50">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[12px] text-muted-foreground">Today's load</span>
                                                    <span className="text-[12px] font-medium">{todayCount}/{maxPerDay}</span>
                                                </div>
                                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                                    <div className="h-full bg-foreground/60 rounded-full" style={{ width: `${Math.min((todayCount / maxPerDay) * 100, 100)}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Side panel: Edit / Create */}
                {isPanel && (
                    <div className="w-[40%] border-l border-border bg-background min-h-[calc(100vh-73px)] p-6 overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-[15px] font-semibold">
                                {credentials ? 'Credentials' : showCreate ? 'New Practitioner' : 'Edit Practitioner'}
                            </h2>
                            <button className="p-1.5 rounded-md hover:bg-muted" onClick={closePanel}>
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {credentials ? (
                            /* Credentials view after creation */
                            <div className="space-y-4">
                                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                                    <p className="text-[13px] font-medium text-emerald-800 dark:text-emerald-300 mb-3">
                                        ✅ Account created successfully
                                    </p>
                                    <p className="text-[12px] text-emerald-700 dark:text-emerald-400 mb-4">
                                        Share these credentials securely with the practitioner. They should change their password on first login.
                                    </p>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Email</label>
                                            <p className="text-[14px] font-mono mt-0.5">{credentials.email}</p>
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Password</label>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <p className="text-[14px] font-mono">
                                                    {showPassword ? credentials.password : '••••••••••••'}
                                                </p>
                                                <button className="p-1 rounded hover:bg-muted" onClick={() => setShowPassword(!showPassword)}>
                                                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    variant="outline"
                                    className="w-full h-9 text-[12px]"
                                    onClick={copyCredentials}
                                >
                                    {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                                    {copied ? 'Copied!' : 'Copy Credentials'}
                                </Button>

                                <Button className="w-full h-9 text-[12px]" onClick={closePanel}>
                                    Done
                                </Button>
                            </div>
                        ) : (
                            /* Edit / Create form */
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">First Name *</label>
                                        <Input
                                            value={form.first_name}
                                            onChange={e => setForm({ ...form, first_name: e.target.value })}
                                            className="mt-1 h-8 text-[13px]"
                                            placeholder="James"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Last Name *</label>
                                        <Input
                                            value={form.last_name}
                                            onChange={e => setForm({ ...form, last_name: e.target.value })}
                                            className="mt-1 h-8 text-[13px]"
                                            placeholder="Wilson"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Email *</label>
                                    <Input
                                        type="email"
                                        value={form.email}
                                        onChange={e => setForm({ ...form, email: e.target.value })}
                                        className="mt-1 h-8 text-[13px]"
                                        placeholder="james@costaspine.com"
                                        disabled={!!editingId}
                                    />
                                    {editingId && (
                                        <p className="text-[10px] text-muted-foreground mt-1">Email cannot be changed (linked to auth account)</p>
                                    )}
                                </div>

                                {showCreate && (
                                    <div>
                                        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                            Password <span className="normal-case font-normal">(auto-generated if empty)</span>
                                        </label>
                                        <Input
                                            type="text"
                                            value={form.password}
                                            onChange={e => setForm({ ...form, password: e.target.value })}
                                            className="mt-1 h-8 text-[13px] font-mono"
                                            placeholder="Leave empty to auto-generate"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Phone</label>
                                    <Input
                                        value={form.phone}
                                        onChange={e => setForm({ ...form, phone: e.target.value })}
                                        className="mt-1 h-8 text-[13px]"
                                        placeholder="+34 600 000 000"
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Profession *</label>
                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                        {PROFESSIONS.map(prof => (
                                            <button
                                                key={prof}
                                                className={`px-3 py-1.5 rounded-md text-[12px] border transition-colors ${form.profession === prof
                                                    ? 'bg-foreground text-background border-foreground'
                                                    : 'border-border hover:bg-muted'
                                                    }`}
                                                onClick={() => setForm({ ...form, profession: prof })}
                                            >
                                                {prof}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Subspecialties</label>
                                    <Input
                                        value={form.sub_specialties}
                                        onChange={e => setForm({ ...form, sub_specialties: e.target.value })}
                                        className="mt-1 h-8 text-[13px]"
                                        placeholder="Sports injury, Pediatric"
                                    />
                                    <p className="text-[10px] text-muted-foreground mt-1">Comma-separated</p>
                                </div>

                                <div>
                                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Skill Tags</label>
                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                        {SKILL_OPTIONS.map(skill => (
                                            <button
                                                key={skill}
                                                className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors ${form.skill_tags.includes(skill)
                                                    ? 'bg-foreground text-background border-foreground'
                                                    : 'border-border text-muted-foreground hover:bg-muted'
                                                    }`}
                                                onClick={() => toggleSkill(skill)}
                                            >
                                                {skill}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Max Patients Per Day</label>
                                    <Input
                                        type="number"
                                        value={form.max_patients_per_day}
                                        onChange={e => setForm({ ...form, max_patients_per_day: parseInt(e.target.value) || 12 })}
                                        className="mt-1 h-8 text-[13px] w-24"
                                        min={1}
                                        max={30}
                                    />
                                </div>

                                <div className="pt-3 border-t border-border space-y-2">
                                    {showCreate ? (
                                        <Button
                                            className="w-full h-9 text-[12px]"
                                            onClick={handleCreate}
                                            disabled={createPractitioner.isPending}
                                        >
                                            {createPractitioner.isPending ? 'Creating…' : 'Create Account & Generate Credentials'}
                                        </Button>
                                    ) : (
                                        <Button
                                            className="w-full h-9 text-[12px]"
                                            onClick={handleSave}
                                            disabled={updatePractitioner.isPending}
                                        >
                                            {updatePractitioner.isPending ? 'Saving…' : 'Save Changes'}
                                        </Button>
                                    )}
                                    <Button variant="outline" className="w-full h-9 text-[12px]" onClick={closePanel}>
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
