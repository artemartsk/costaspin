import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Users,
    Calendar,
    DollarSign,
    Phone,
} from 'lucide-react';
import { useDashboardStats, useAppointments, useCallLogs } from '@/hooks/useData';
import { formatTime } from '@/lib/utils';

function getStatusBadge(status: string) {
    switch (status) {
        case 'confirmed':
            return <Badge variant="success">Confirmed</Badge>;
        case 'pending_deposit':
            return <Badge variant="warning">Pending Deposit</Badge>;
        case 'attended':
            return <Badge variant="info">Attended</Badge>;
        case 'no_show':
            return <Badge variant="destructive">No Show</Badge>;
        case 'cancelled':
            return <Badge variant="secondary">Cancelled</Badge>;
        default:
            return <Badge variant="secondary">{status}</Badge>;
    }
}

export default function Dashboard() {
    const today = new Date().toISOString().split('T')[0];
    const { data: stats, isLoading: statsLoading } = useDashboardStats();
    const { data: appointments, isLoading: aptsLoading } = useAppointments(today);
    const { data: callLogs, isLoading: callsLoading } = useCallLogs();

    const statCards = [
        { label: 'Total Patients', value: stats?.totalPatients ?? '–', icon: Users, change: `${stats?.pendingDeposits ?? 0} pending deposit` },
        { label: 'Appointments Today', value: stats?.appointmentsToday ?? '–', icon: Calendar, change: `${stats?.pendingDeposits ?? 0} awaiting deposit` },
        { label: 'Deposit Rate', value: stats?.depositRate != null ? `${stats.depositRate}%` : '–', icon: DollarSign, change: 'of today\'s bookings' },
        { label: 'AI Calls Today', value: stats?.aiCallsToday ?? '–', icon: Phone, change: `${stats?.bookedFromCalls ?? 0} booked` },
    ];

    return (
        <div className="min-h-screen">
            {/* Header */}
            <div className="border-b border-border px-8 py-6">
                <h1 className="text-notion-h2">Dashboard</h1>
                <p className="text-notion-caption mt-1">
                    CostaSpine · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
            </div>

            <div className="px-8 py-6 space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-4 gap-4">
                    {statCards.map((stat) => (
                        <Card key={stat.label} className="border-border/60">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-notion-caption">{stat.change}</span>
                                </div>
                                <p className="text-[28px] font-semibold tracking-tight">
                                    {statsLoading ? '…' : stat.value}
                                </p>
                                <p className="text-notion-caption mt-0.5">{stat.label}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid grid-cols-3 gap-6">
                    {/* Today's Schedule */}
                    <div className="col-span-2">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-[15px] font-medium">Today's Schedule</h2>
                            <span className="text-notion-caption">{appointments?.length ?? 0} appointments</span>
                        </div>
                        <div className="border border-border rounded-lg overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30">
                                        <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Time</th>
                                        <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Patient</th>
                                        <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Service</th>
                                        <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Practitioner</th>
                                        <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {aptsLoading ? (
                                        <tr><td colSpan={5} className="px-4 py-6 text-center text-[13px] text-muted-foreground">Loading…</td></tr>
                                    ) : !appointments?.length ? (
                                        <tr><td colSpan={5} className="px-4 py-6 text-center text-[13px] text-muted-foreground">No appointments today</td></tr>
                                    ) : (
                                        appointments.map((apt) => (
                                            <tr key={apt.id} className="border-b border-border/50 last:border-b-0 notion-row-hover">
                                                <td className="px-4 py-2.5 text-[13px] font-mono text-muted-foreground">
                                                    {formatTime(apt.start_time)}
                                                </td>
                                                <td className="px-4 py-2.5 text-[13px] font-medium">
                                                    {apt.patient?.first_name} {apt.patient?.last_name}
                                                </td>
                                                <td className="px-4 py-2.5 text-[13px] text-muted-foreground">
                                                    {apt.service?.name ?? '—'}
                                                </td>
                                                <td className="px-4 py-2.5 text-[13px] text-muted-foreground">
                                                    {apt.practitioner?.first_name} {apt.practitioner?.last_name}
                                                </td>
                                                <td className="px-4 py-2.5">{getStatusBadge(apt.status)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* AI Call Log */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-[15px] font-medium">Recent AI Calls</h2>
                            <span className="text-notion-caption">Today</span>
                        </div>
                        <div className="space-y-2">
                            {callsLoading ? (
                                <p className="text-[13px] text-muted-foreground text-center py-4">Loading…</p>
                            ) : !callLogs?.length ? (
                                <p className="text-[13px] text-muted-foreground text-center py-4">No calls yet</p>
                            ) : (
                                callLogs.slice(0, 5).map((call) => (
                                    <div key={call.id} className="flex items-center gap-3 p-3 border border-border/60 rounded-lg notion-row-hover">
                                        <div className={`h-2 w-2 rounded-full shrink-0 ${call.appointment_id ? 'bg-emerald-500' :
                                                call.status === 'completed' ? 'bg-amber-500' : 'bg-gray-300'
                                            }`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-medium truncate">{call.caller_phone || 'Unknown'}</p>
                                            <p className="text-notion-caption">
                                                {call.duration_seconds ? `${Math.floor(call.duration_seconds / 60)}:${String(call.duration_seconds % 60).padStart(2, '0')}` : '—'}
                                            </p>
                                        </div>
                                        <Badge variant={call.appointment_id ? 'success' : call.status === 'completed' ? 'warning' : 'secondary'}>
                                            {call.appointment_id ? 'Booked' : call.status === 'completed' ? 'Follow-up' : call.status}
                                        </Badge>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
