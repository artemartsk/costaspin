import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Users,
    Calendar,
    TrendingUp,
    Clock,
    UserCheck,
    UserX,
    DollarSign,
    Phone,
} from 'lucide-react';

// Mock data for the pilot dashboard
const stats = [
    { label: 'Total Patients', value: '247', icon: Users, change: '+12 this week' },
    { label: 'Appointments Today', value: '18', icon: Calendar, change: '3 pending deposit' },
    { label: 'Deposit Rate', value: '89%', icon: DollarSign, change: '+5% vs last month' },
    { label: 'AI Calls Today', value: '6', icon: Phone, change: '4 booked' },
];

const todayAppointments = [
    { time: '09:00', patient: 'Maria García', service: 'Chiropractic Adjustment', practitioner: 'Dr. James Wilson', room: 'Room 1', status: 'confirmed' },
    { time: '09:45', patient: 'John Smith', service: 'Physiotherapy', practitioner: 'Dr. Sarah Chen', room: 'Physio Suite', status: 'confirmed' },
    { time: '10:30', patient: 'Ana López', service: 'Sports Massage', practitioner: 'Mark Thompson', room: 'Room 2', status: 'pending_deposit' },
    { time: '11:15', patient: 'David Brown', service: 'Post-Surgery Rehab', practitioner: 'Dr. Sarah Chen', room: 'Physio Suite', status: 'confirmed' },
    { time: '12:00', patient: 'Elena Petrova', service: 'Chiropractic Assessment', practitioner: 'Dr. James Wilson', room: 'Room 1', status: 'attended' },
    { time: '14:00', patient: 'Carlos Rivera', service: 'Deep Tissue Massage', practitioner: 'Mark Thompson', room: 'Room 2', status: 'confirmed' },
    { time: '14:45', patient: 'Sophie Martin', service: 'Physiotherapy', practitioner: 'Dr. Sarah Chen', room: 'Physio Suite', status: 'pending_deposit' },
    { time: '15:30', patient: 'New Patient', service: 'Initial Consultation', practitioner: 'Dr. James Wilson', room: 'Room 1', status: 'pending_deposit' },
];

const recentCalls = [
    { time: '08:42', phone: '+34 612 345 678', result: 'Booked', duration: '3:24' },
    { time: '08:15', phone: '+44 7700 900123', result: 'Booked', duration: '4:11' },
    { time: '07:58', phone: '+34 655 432 100', result: 'Follow-up', duration: '2:08' },
    { time: '07:30', phone: '+34 699 111 222', result: 'No Answer', duration: '0:00' },
];

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
    return (
        <div className="min-h-screen">
            {/* Header */}
            <div className="border-b border-border px-8 py-6">
                <h1 className="text-notion-h2">Dashboard</h1>
                <p className="text-notion-caption mt-1">
                    CostaSpine Elviria · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
            </div>

            <div className="px-8 py-6 space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-4 gap-4">
                    {stats.map((stat) => (
                        <Card key={stat.label} className="border-border/60">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-notion-caption">{stat.change}</span>
                                </div>
                                <p className="text-[28px] font-semibold tracking-tight">{stat.value}</p>
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
                            <span className="text-notion-caption">{todayAppointments.length} appointments</span>
                        </div>
                        <div className="border border-border rounded-lg overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30">
                                        <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Time</th>
                                        <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Patient</th>
                                        <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Service</th>
                                        <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Practitioner</th>
                                        <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Room</th>
                                        <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {todayAppointments.map((apt, i) => (
                                        <tr key={i} className="border-b border-border/50 last:border-b-0 notion-row-hover">
                                            <td className="px-4 py-2.5 text-[13px] font-mono text-muted-foreground">{apt.time}</td>
                                            <td className="px-4 py-2.5 text-[13px] font-medium">{apt.patient}</td>
                                            <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{apt.service}</td>
                                            <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{apt.practitioner}</td>
                                            <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{apt.room}</td>
                                            <td className="px-4 py-2.5">{getStatusBadge(apt.status)}</td>
                                        </tr>
                                    ))}
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
                            {recentCalls.map((call, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 border border-border/60 rounded-lg notion-row-hover">
                                    <div className={`h-2 w-2 rounded-full shrink-0 ${call.result === 'Booked' ? 'bg-emerald-500' :
                                            call.result === 'Follow-up' ? 'bg-amber-500' : 'bg-gray-300'
                                        }`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-medium truncate">{call.phone}</p>
                                        <p className="text-notion-caption">{call.time} · {call.duration}</p>
                                    </div>
                                    <Badge variant={call.result === 'Booked' ? 'success' : call.result === 'Follow-up' ? 'warning' : 'secondary'}>
                                        {call.result}
                                    </Badge>
                                </div>
                            ))}
                        </div>

                        {/* Quick Stats */}
                        <div className="mt-6">
                            <h2 className="text-[15px] font-medium mb-3">Utilisation</h2>
                            <div className="space-y-3">
                                {[
                                    { name: 'Dr. James Wilson', pct: 85 },
                                    { name: 'Dr. Sarah Chen', pct: 72 },
                                    { name: 'Mark Thompson', pct: 60 },
                                ].map((p) => (
                                    <div key={p.name}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[12px] text-muted-foreground">{p.name}</span>
                                            <span className="text-[12px] font-medium">{p.pct}%</span>
                                        </div>
                                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-foreground/70 rounded-full transition-all"
                                                style={{ width: `${p.pct}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
