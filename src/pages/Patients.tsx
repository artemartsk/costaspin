import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Plus, Filter } from 'lucide-react';
import { usePatients, useCreatePatient } from '@/hooks/useData';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

function getSourceBadge(source: string) {
    switch (source) {
        case 'ai_phone': return <Badge variant="info">AI Phone</Badge>;
        case 'whatsapp': return <Badge variant="success">WhatsApp</Badge>;
        case 'phone': return <Badge variant="secondary">Phone</Badge>;
        case 'web': return <Badge variant="secondary">Web</Badge>;
        case 'referral': return <Badge variant="warning">Referral</Badge>;
        case 'walk_in': return <Badge variant="secondary">Walk-in</Badge>;
        default: return <Badge variant="secondary">{source}</Badge>;
    }
}

export default function Patients() {
    const [search, setSearch] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [newFirst, setNewFirst] = useState('');
    const [newLast, setNewLast] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newEmail, setNewEmail] = useState('');

    const { data: patients, isLoading } = usePatients();
    const createPatient = useCreatePatient();

    const filtered = (patients || []).filter(p =>
        `${p.first_name} ${p.last_name} ${p.phone} ${p.email || ''}`.toLowerCase().includes(search.toLowerCase())
    );

    const handleAddPatient = async () => {
        if (!newFirst || !newPhone) {
            toast.error('First name and phone are required');
            return;
        }
        try {
            await createPatient.mutateAsync({
                first_name: newFirst,
                last_name: newLast || '',
                phone: newPhone,
                email: newEmail || undefined,
                source: 'manual' as 'phone',
            });
            toast.success('Patient added');
            setShowAdd(false);
            setNewFirst(''); setNewLast(''); setNewPhone(''); setNewEmail('');
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to add patient');
        }
    };

    return (
        <div className="min-h-screen">
            {/* Header */}
            <div className="border-b border-border px-8 py-6">
                <h1 className="text-notion-h2">Patients</h1>
                <p className="text-notion-caption mt-1">Unified patient profiles · {patients?.length ?? 0} patients</p>
            </div>

            <div className="px-8 py-5">
                {/* Toolbar */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Search patients..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-8 text-[13px] bg-muted/30 border-transparent focus:bg-background focus:border-border"
                        />
                    </div>
                    <Button variant="outline" size="sm" className="h-8 text-[12px]">
                        <Filter className="h-3 w-3 mr-1.5" />
                        Filter
                    </Button>
                    <Button size="sm" className="h-8 text-[12px]" onClick={() => setShowAdd(!showAdd)}>
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Add Patient
                    </Button>
                </div>

                {/* Inline Add Form */}
                {showAdd && (
                    <div className="border border-border rounded-lg p-4 mb-4 bg-muted/10">
                        <p className="text-[13px] font-medium mb-3">New Patient</p>
                        <div className="grid grid-cols-4 gap-3 mb-3">
                            <Input placeholder="First name *" value={newFirst} onChange={(e) => setNewFirst(e.target.value)} className="h-8 text-[13px]" />
                            <Input placeholder="Last name" value={newLast} onChange={(e) => setNewLast(e.target.value)} className="h-8 text-[13px]" />
                            <Input placeholder="Phone *" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="h-8 text-[13px]" />
                            <Input placeholder="Email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="h-8 text-[13px]" />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" className="h-7 text-[12px]" onClick={() => setShowAdd(false)}>Cancel</Button>
                            <Button size="sm" className="h-7 text-[12px]" onClick={handleAddPatient} disabled={createPatient.isPending}>
                                {createPatient.isPending ? 'Saving…' : 'Save'}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border bg-muted/30">
                                <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5">Patient</th>
                                <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5">Phone</th>
                                <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5">Visits</th>
                                <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5">Forms</th>
                                <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5">Source</th>
                                <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5">Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={6} className="px-4 py-8 text-center text-[13px] text-muted-foreground">Loading…</td></tr>
                            ) : !filtered.length ? (
                                <tr><td colSpan={6} className="px-4 py-8 text-center text-[13px] text-muted-foreground">No patients found</td></tr>
                            ) : (
                                filtered.map((patient) => (
                                    <tr key={patient.id} className="border-b border-border/50 last:border-b-0 notion-row-hover">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-7 w-7">
                                                    <AvatarFallback className="text-[10px]">
                                                        {patient.first_name[0]}{patient.last_name?.[0] || ''}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="text-[13px] font-medium">{patient.first_name} {patient.last_name}</p>
                                                    {patient.email && <p className="text-[11px] text-muted-foreground">{patient.email}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-[13px] font-mono text-muted-foreground">{patient.phone}</td>
                                        <td className="px-4 py-3 text-[13px] text-muted-foreground">{patient.visit_count}</td>
                                        <td className="px-4 py-3">
                                            {patient.forms_completed ? (
                                                <span className="text-[12px] text-emerald-600">✓ Complete</span>
                                            ) : (
                                                <span className="text-[12px] text-amber-600">○ Pending</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">{getSourceBadge(patient.source)}</td>
                                        <td className="px-4 py-3 text-[13px] text-muted-foreground">
                                            {patient.created_at ? formatDate(patient.created_at) : '—'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
