import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { usePractitioners, useAppointments } from '@/hooks/useData';
import { useMemo } from 'react';

export default function Practitioners() {
    const { data: practitioners, isLoading } = usePractitioners();
    const today = new Date().toISOString().split('T')[0];
    const { data: todayApts } = useAppointments(today);

    // Count today's appointments per practitioner
    const loadMap = useMemo(() => {
        const map: Record<string, number> = {};
        (todayApts || []).forEach(apt => {
            map[apt.practitioner_id] = (map[apt.practitioner_id] || 0) + 1;
        });
        return map;
    }, [todayApts]);

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
                {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="h-5 w-5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                    </div>
                ) : !practitioners?.length ? (
                    <p className="text-[13px] text-muted-foreground text-center py-8">No practitioners found</p>
                ) : (
                    <div className="grid grid-cols-3 gap-4">
                        {practitioners.map((p) => {
                            const todayCount = loadMap[p.id] || 0;
                            const maxPerDay = p.max_patients_per_day || 12;
                            return (
                                <div key={p.id} className="border border-border rounded-lg p-5 notion-row-hover">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Avatar className="h-10 w-10">
                                            <AvatarFallback className="text-[13px] bg-foreground/5">{p.first_name[0]}{p.last_name[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-[14px] font-medium">{p.first_name} {p.last_name}</p>
                                            <p className="text-notion-caption">{p.profession}</p>
                                        </div>
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
        </div>
    );
}
