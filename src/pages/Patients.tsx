import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    const navigate = useNavigate();

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
                <div className="flex items-center justify-between mb-4">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Search patients..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-8 text-[13px] bg-muted/30 border-transparent focus:bg-background focus:border-border"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" className="h-8 text-[12px]">
                            <Filter className="h-3 w-3 mr-1.5" />
                            Filter
                        </Button>
                        <Button size="sm" className="h-8 text-[12px]" onClick={() => setShowAdd(!showAdd)}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                            Add Patient
                        </Button>
                    </div>
                </div>

                {/* Inline Add Form */}
                {showAdd && (
                    <div className="border border-border rounded-lg p-4 mb-4 bg-muted/10 animate-in slide-in-from-top-2 duration-200">
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

                {/* Table View */}
                {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="h-5 w-5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                    </div>
                ) : !filtered.length ? (
                    <div className="border border-border rounded-lg border-dashed">
                        <p className="text-[13px] text-muted-foreground text-center py-12">No patients found matches your search.</p>
                    </div>
                ) : (
                    <div className="border border-border rounded-lg overflow-hidden bg-card text-card-foreground">
                        <div className="overflow-x-auto">
                            <table className="w-full text-[13px] text-left border-collapse">
                                <thead className="bg-muted/30 text-muted-foreground">
                                    <tr className="border-b border-border">
                                        <th className="px-5 py-3 font-medium">Patient</th>
                                        <th className="px-5 py-3 font-medium">Contact</th>
                                        <th className="px-5 py-3 font-medium">Source</th>
                                        <th className="px-5 py-3 font-medium">Status</th>
                                        <th className="px-5 py-3 font-medium text-right">Visits</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((patient) => (
                                        <tr 
                                            key={patient.id} 
                                            className="border-b border-border/50 last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                                            onClick={() => navigate(`/patients/${patient.id}`)}
                                        >
                                            <td className="px-5 py-3.5 align-middle">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarFallback className="text-[11px] bg-foreground/5 text-foreground/80 font-medium tracking-wide">
                                                            {patient.first_name[0]}{patient.last_name?.[0] || ''}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium text-[13px]">{patient.first_name} {patient.last_name}</p>
                                                        {patient.email ? (
                                                            <p className="text-[11px] text-muted-foreground">{patient.email}</p>
                                                        ) : (
                                                            <p className="text-[11px] text-muted-foreground/50 italic">No email</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 align-middle">
                                                <span className="font-mono text-[12px] text-foreground/80">{patient.phone}</span>
                                            </td>
                                            <td className="px-5 py-3.5 align-middle">
                                                <div className="scale-90 origin-left">
                                                    {getSourceBadge(patient.source)}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 align-middle">
                                                <div className="flex flex-col gap-1.5 items-start">
                                                    {patient.forms_completed ? (
                                                        <Badge variant="success" className="text-[9px] px-1.5 py-0 h-4">Forms: Complete</Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 text-amber-600 bg-amber-50 dark:bg-amber-900/20">Forms: Pending</Badge>
                                                    )}
                                                    {patient.medical_data_consent ? (
                                                        <Badge variant="success" className="text-[9px] px-1.5 py-0 h-4">RGPD: Signed</Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">RGPD: Missing</Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 align-middle text-right">
                                                <span className="font-medium text-[13px] text-foreground/90">{patient.visit_count}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
