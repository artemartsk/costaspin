import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Plus, Filter } from 'lucide-react';

const mockPatients = [
    { id: '1', firstName: 'Maria', lastName: 'García', phone: '+34 612 345 678', email: 'maria@email.com', visitCount: 8, formsCompleted: true, source: 'phone', lastVisit: '2026-02-28', status: 'active' },
    { id: '2', firstName: 'John', lastName: 'Smith', phone: '+44 7700 900123', email: 'john.s@email.com', visitCount: 3, formsCompleted: true, source: 'whatsapp', lastVisit: '2026-02-27', status: 'active' },
    { id: '3', firstName: 'Ana', lastName: 'López', phone: '+34 655 432 100', email: 'ana.lopez@email.com', visitCount: 1, formsCompleted: false, source: 'ai_phone', lastVisit: '2026-03-01', status: 'new' },
    { id: '4', firstName: 'David', lastName: 'Brown', phone: '+44 7911 123456', email: 'david.b@email.com', visitCount: 12, formsCompleted: true, source: 'referral', lastVisit: '2026-02-25', status: 'active' },
    { id: '5', firstName: 'Elena', lastName: 'Petrova', phone: '+34 699 111 222', email: 'elena.p@email.com', visitCount: 5, formsCompleted: true, source: 'web', lastVisit: '2026-02-26', status: 'active' },
    { id: '6', firstName: 'Carlos', lastName: 'Rivera', phone: '+34 622 333 444', email: null, visitCount: 0, formsCompleted: false, source: 'ai_phone', lastVisit: null, status: 'new' },
    { id: '7', firstName: 'Sophie', lastName: 'Martin', phone: '+33 6 12 34 56 78', email: 'sophie.m@email.com', visitCount: 2, formsCompleted: true, source: 'phone', lastVisit: '2026-02-20', status: 'active' },
    { id: '8', firstName: 'Tom', lastName: 'Baker', phone: '+44 7700 900456', email: 'tom.baker@email.com', visitCount: 15, formsCompleted: true, source: 'referral', lastVisit: '2026-03-01', status: 'active' },
];

function getSourceBadge(source: string) {
    switch (source) {
        case 'ai_phone': return <Badge variant="info">AI Phone</Badge>;
        case 'whatsapp': return <Badge variant="success">WhatsApp</Badge>;
        case 'phone': return <Badge variant="secondary">Phone</Badge>;
        case 'web': return <Badge variant="secondary">Web</Badge>;
        case 'referral': return <Badge variant="warning">Referral</Badge>;
        default: return <Badge variant="secondary">{source}</Badge>;
    }
}

export default function Patients() {
    const [search, setSearch] = useState('');
    const filtered = mockPatients.filter(p =>
        `${p.firstName} ${p.lastName} ${p.phone} ${p.email || ''}`.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen">
            {/* Header */}
            <div className="border-b border-border px-8 py-6">
                <h1 className="text-notion-h2">Patients</h1>
                <p className="text-notion-caption mt-1">Unified patient profiles · {mockPatients.length} patients</p>
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
                    <Button size="sm" className="h-8 text-[12px]">
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Add Patient
                    </Button>
                </div>

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
                                <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2.5">Last Visit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((patient) => (
                                <tr key={patient.id} className="border-b border-border/50 last:border-b-0 notion-row-hover">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-7 w-7">
                                                <AvatarFallback className="text-[10px]">
                                                    {patient.firstName[0]}{patient.lastName[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="text-[13px] font-medium">{patient.firstName} {patient.lastName}</p>
                                                {patient.email && <p className="text-[11px] text-muted-foreground">{patient.email}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-[13px] font-mono text-muted-foreground">{patient.phone}</td>
                                    <td className="px-4 py-3 text-[13px] text-muted-foreground">{patient.visitCount}</td>
                                    <td className="px-4 py-3">
                                        {patient.formsCompleted ? (
                                            <span className="text-[12px] text-emerald-600">✓ Complete</span>
                                        ) : (
                                            <span className="text-[12px] text-amber-600">○ Pending</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">{getSourceBadge(patient.source)}</td>
                                    <td className="px-4 py-3 text-[13px] text-muted-foreground">
                                        {patient.lastVisit || '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
