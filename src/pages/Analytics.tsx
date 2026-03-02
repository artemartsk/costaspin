import { Card, CardContent } from '@/components/ui/card';

const metrics = [
    { label: 'Total Leads', value: '247', sub: 'All time' },
    { label: 'Booking Conversion', value: '68%', sub: 'Leads → Confirmed' },
    { label: 'No-Show Rate', value: '4.2%', sub: 'Last 30 days' },
    { label: 'Deposit Compliance', value: '89%', sub: 'Stripe payments / total' },
    { label: 'Review Gen. Rate', value: '32%', sub: '3rd+ visit → click' },
    { label: 'Avg Revenue / Visit', value: '€85', sub: 'Last 30 days' },
];

const channelBreakdown = [
    { channel: 'AI Phone', count: 98, pct: 40, color: 'bg-blue-500' },
    { channel: 'WhatsApp', count: 64, pct: 26, color: 'bg-emerald-500' },
    { channel: 'Web', count: 42, pct: 17, color: 'bg-violet-500' },
    { channel: 'Walk-in', count: 25, pct: 10, color: 'bg-amber-500' },
    { channel: 'Referral', count: 18, pct: 7, color: 'bg-gray-400' },
];

const practitionerRevenue = [
    { name: 'Dr. James Wilson', revenue: 12450, patients: 156, utilisation: 85 },
    { name: 'Dr. Sarah Chen', revenue: 9800, patients: 112, utilisation: 72 },
    { name: 'Mark Thompson', revenue: 7200, patients: 98, utilisation: 60 },
];

export default function Analytics() {
    return (
        <div className="min-h-screen">
            <div className="border-b border-border px-8 py-6">
                <h1 className="text-notion-h2">Analytics</h1>
                <p className="text-notion-caption mt-1">Executive dashboard · CostaSpine Elviria Pilot</p>
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

                <div className="grid grid-cols-2 gap-6">
                    {/* Channel Breakdown */}
                    <div className="border border-border rounded-lg p-5">
                        <h3 className="text-[15px] font-medium mb-4">Lead Channels</h3>
                        <div className="space-y-3">
                            {channelBreakdown.map((ch) => (
                                <div key={ch.channel}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[13px]">{ch.channel}</span>
                                        <span className="text-[12px] text-muted-foreground">{ch.count} ({ch.pct}%)</span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div className={`h-full ${ch.color} rounded-full`} style={{ width: `${ch.pct}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Revenue per Practitioner */}
                    <div className="border border-border rounded-lg p-5">
                        <h3 className="text-[15px] font-medium mb-4">Revenue by Practitioner</h3>
                        <div className="space-y-4">
                            {practitionerRevenue.map((p) => (
                                <div key={p.name} className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <p className="text-[13px] font-medium">{p.name}</p>
                                        <p className="text-notion-caption">{p.patients} patients · {p.utilisation}% utilised</p>
                                    </div>
                                    <p className="text-[16px] font-semibold tabular-nums">€{p.revenue.toLocaleString()}</p>
                                </div>
                            ))}
                            <div className="pt-3 border-t border-border/50 flex items-center justify-between">
                                <p className="text-[13px] font-medium text-muted-foreground">Total</p>
                                <p className="text-[16px] font-semibold">€{practitionerRevenue.reduce((sum, p) => sum + p.revenue, 0).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
