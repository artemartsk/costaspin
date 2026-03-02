import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const practitioners = [
    {
        id: '1', firstName: 'James', lastName: 'Wilson', profession: 'Chiropractor',
        subSpecialties: ['Sports injury', 'Pediatric'], skillTags: ['acute_injury', 'chronic_pain', 'sports_injury'],
        maxPatientsPerDay: 14, todayCount: 6, locations: ['Elviria'],
    },
    {
        id: '2', firstName: 'Sarah', lastName: 'Chen', profession: 'Physiotherapist',
        subSpecialties: ['Post-surgery rehab', 'Neurological'], skillTags: ['post_surgery', 'chronic_pain', 'rehab'],
        maxPatientsPerDay: 10, todayCount: 4, locations: ['Elviria'],
    },
    {
        id: '3', firstName: 'Mark', lastName: 'Thompson', profession: 'Massage Therapist',
        subSpecialties: ['Deep tissue', 'Sports massage'], skillTags: ['relaxation', 'sports_injury', 'chronic_pain'],
        maxPatientsPerDay: 12, todayCount: 3, locations: ['Elviria'],
    },
];

export default function Practitioners() {
    return (
        <div className="min-h-screen">
            <div className="border-b border-border px-8 py-6 flex items-center justify-between">
                <div>
                    <h1 className="text-notion-h2">Practitioners</h1>
                    <p className="text-notion-caption mt-1">Manage practitioner profiles and schedules</p>
                </div>
                <Button size="sm" className="h-8 text-[12px]">
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add Practitioner
                </Button>
            </div>

            <div className="px-8 py-6">
                <div className="grid grid-cols-3 gap-4">
                    {practitioners.map((p) => (
                        <div key={p.id} className="border border-border rounded-lg p-5 notion-row-hover">
                            <div className="flex items-center gap-3 mb-4">
                                <Avatar className="h-10 w-10">
                                    <AvatarFallback className="text-[13px] bg-foreground/5">{p.firstName[0]}{p.lastName[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-[14px] font-medium">Dr. {p.firstName} {p.lastName}</p>
                                    <p className="text-notion-caption">{p.profession}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Specialties</p>
                                    <div className="flex flex-wrap gap-1">
                                        {p.subSpecialties.map((s) => (
                                            <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Skill Tags</p>
                                    <div className="flex flex-wrap gap-1">
                                        {p.skillTags.map((t) => (
                                            <span key={t} className="text-[10px] px-1.5 py-0.5 bg-muted rounded font-mono text-muted-foreground">{t}</span>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-border/50">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[12px] text-muted-foreground">Today's load</span>
                                        <span className="text-[12px] font-medium">{p.todayCount}/{p.maxPatientsPerDay}</span>
                                    </div>
                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-foreground/60 rounded-full" style={{ width: `${(p.todayCount / p.maxPatientsPerDay) * 100}%` }} />
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 pt-1">
                                    {p.locations.map((loc) => (
                                        <Badge key={loc} variant="outline" className="text-[10px]">{loc}</Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
