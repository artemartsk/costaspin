import { Card, CardContent } from '@/components/ui/card';
import { usePatients, useAppointments, useCallLogs } from '@/hooks/useData';
import { useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';

export default function Analytics() {
    const { data: patients } = usePatients();
    const { data: appointments } = useAppointments();
    const { data: callLogs } = useCallLogs();

    const stats = useMemo(() => {
        const apts = appointments || [];
        const pts = patients || [];
        const calls = callLogs || [];

        const confirmed = apts.filter(a => a.status === 'confirmed' || a.status === 'attended').length;
        const noShows = apts.filter(a => a.status === 'no_show').length;
        const depositPaid = apts.filter(a => a.deposit_paid).length;

        // Source breakdown
        const sourceMap: Record<string, number> = {};
        pts.forEach(p => { sourceMap[p.source] = (sourceMap[p.source] || 0) + 1; });
        const totalPts = pts.length || 1;
        const channels = Object.entries(sourceMap)
            .map(([channel, count]) => ({ channel: channel.replace('_', ' '), count, pct: Math.round((count / totalPts) * 100) }))
            .sort((a, b) => b.count - a.count);

        const channelColors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-gray-400'];

        return {
            totalLeads: pts.length,
            bookingConversion: apts.length ? `${Math.round((confirmed / apts.length) * 100)}%` : '–',
            noShowRate: apts.length ? `${((noShows / apts.length) * 100).toFixed(1)}%` : '–',
            depositCompliance: apts.length ? `${Math.round((depositPaid / apts.length) * 100)}%` : '–',
            aiCalls: calls.length,
            aiBooked: calls.filter(c => c.appointment_id).length,
            channels: channels.map((ch, i) => ({ ...ch, color: channelColors[i] || 'bg-gray-300' })),
        };
    }, [patients, appointments, callLogs]);

    const metrics = [
        { label: 'Total Patients', value: String(stats.totalLeads), sub: 'All time' },
        { label: 'Booking Conversion', value: stats.bookingConversion, sub: 'Confirmed / Total' },
        { label: 'No-Show Rate', value: stats.noShowRate, sub: 'All appointments' },
        { label: 'Deposit Compliance', value: stats.depositCompliance, sub: 'Deposit paid / Total' },
        { label: 'AI Calls', value: String(stats.aiCalls), sub: 'Total logged' },
        { label: 'AI → Booked', value: String(stats.aiBooked), sub: 'Calls that created bookings' },
    ];

    return (
        <div className="min-h-screen">
            <div className="border-b border-border px-8 py-6">
                <h1 className="text-notion-h2">Analytics</h1>
                <p className="text-notion-caption mt-1">CostaSpine · Computed from live data</p>
            </div>

            <div className="px-8 py-6 space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-4">
                    {metrics.map((m) => (
                        <Card key={m.label} className="border-border/60">
                            <CardContent className="p-4">
                                <p className="text-[28px] font-semibold tracking-tight">{m.value}</p>
                                <p className="text-[13px] font-medium mt-1">{m.label}</p>
                                <p className="text-notion-caption">{m.sub}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Channel Breakdown */}
                <div className="border border-border rounded-lg p-5 max-w-lg">
                    <h3 className="text-[15px] font-medium mb-4">Patient Sources</h3>
                    <div className="space-y-3">
                        {stats.channels.length ? stats.channels.map((ch) => (
                            <div key={ch.channel}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[13px] capitalize">{ch.channel}</span>
                                    <span className="text-[12px] text-muted-foreground">{ch.count} ({ch.pct}%)</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div className={`h-full ${ch.color} rounded-full`} style={{ width: `${ch.pct}%` }} />
                                </div>
                            </div>
                        )) : (
                            <p className="text-[13px] text-muted-foreground">No data yet</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
