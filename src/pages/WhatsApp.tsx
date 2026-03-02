import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Clock, CheckCircle } from 'lucide-react';

const templates = [
    { name: 'Booking Confirmation', status: 'approved', category: 'Transactional', preview: '✅ Booking confirmed! Your appointment with {{practitioner}} is on {{date}} at {{time}}. Location: CostaSpine Elviria. Deposit link: {{stripe_link}}' },
    { name: 'Onboarding (New Patient)', status: 'approved', category: 'Transactional', preview: 'Welcome to CostaSpine! 📍 How to find us: {{maps_link}}. Before your visit, please complete: {{indemnity_link}} and {{consent_link}}' },
    { name: 'Reminder 24h', status: 'approved', category: 'Utility', preview: '⏰ Reminder: Your appointment is tomorrow at {{time}} with {{practitioner}}. {{forms_reminder}}' },
    { name: 'Reminder 6h', status: 'approved', category: 'Utility', preview: 'See you soon! Your appointment is today at {{time}} at CostaSpine Elviria.' },
    { name: 'Thank You (Post-Visit)', status: 'pending', category: 'Marketing', preview: 'Thank you for visiting CostaSpine, {{name}}! We look forward to seeing you on {{next_date}}. 😊' },
    { name: 'Review Request', status: 'pending', category: 'Marketing', preview: 'Hi {{name}}! As a valued patient, would you mind leaving us a review? It helps others find quality care. {{review_link}} ⭐' },
];

const messageLog = [
    { time: '09:15', patient: 'Maria García', template: 'Reminder 24h', status: 'delivered' },
    { time: '09:14', patient: 'John Smith', template: 'Booking Confirmation', status: 'delivered' },
    { time: '08:45', patient: 'Ana López', template: 'Onboarding (New Patient)', status: 'read' },
    { time: '08:30', patient: 'David Brown', template: 'Thank You (Post-Visit)', status: 'delivered' },
    { time: '08:15', patient: 'Elena Petrova', template: 'Review Request', status: 'read' },
];

export default function WhatsApp() {
    return (
        <div className="min-h-screen">
            <div className="border-b border-border px-8 py-6">
                <h1 className="text-notion-h2">WhatsApp</h1>
                <p className="text-notion-caption mt-1">Twilio Business API · automated patient messaging</p>
            </div>

            <div className="px-8 py-6">
                <Tabs defaultValue="templates">
                    <TabsList className="mb-6">
                        <TabsTrigger value="templates">Templates</TabsTrigger>
                        <TabsTrigger value="log">Message Log</TabsTrigger>
                        <TabsTrigger value="reminders">Reminder Rules</TabsTrigger>
                    </TabsList>

                    <TabsContent value="templates">
                        <div className="space-y-3 max-w-3xl">
                            {templates.map((tpl) => (
                                <div key={tpl.name} className="border border-border rounded-lg p-4 notion-row-hover">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <p className="text-[13px] font-medium">{tpl.name}</p>
                                            <Badge variant="secondary" className="text-[10px]">{tpl.category}</Badge>
                                        </div>
                                        <Badge variant={tpl.status === 'approved' ? 'success' : 'warning'} className="text-[10px]">
                                            {tpl.status}
                                        </Badge>
                                    </div>
                                    <p className="text-[12px] text-muted-foreground leading-relaxed bg-muted/30 rounded-md px-3 py-2 font-mono">
                                        {tpl.preview}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="log">
                        <div className="max-w-3xl border border-border rounded-lg overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30">
                                        <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Time</th>
                                        <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Patient</th>
                                        <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Template</th>
                                        <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {messageLog.map((msg, i) => (
                                        <tr key={i} className="border-b border-border/50 last:border-b-0">
                                            <td className="px-4 py-2.5 text-[13px] font-mono text-muted-foreground">{msg.time}</td>
                                            <td className="px-4 py-2.5 text-[13px] font-medium">{msg.patient}</td>
                                            <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{msg.template}</td>
                                            <td className="px-4 py-2.5">
                                                <Badge variant={msg.status === 'read' ? 'success' : 'info'} className="text-[10px]">
                                                    {msg.status === 'read' ? '✓✓ Read' : '✓ Delivered'}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </TabsContent>

                    <TabsContent value="reminders">
                        <div className="max-w-lg space-y-4">
                            {[
                                { icon: Clock, title: '24-hour Reminder', desc: 'Sends to all patients with appointments in 24h', enabled: true, extra: 'Includes form link if not completed' },
                                { icon: Clock, title: '6-hour Reminder', desc: 'Follow-up patients only', enabled: true, extra: '' },
                                { icon: CheckCircle, title: 'Post-Visit Thank You', desc: 'Triggered when visit status → Attended', enabled: true, extra: 'Includes next appointment date if booked' },
                                { icon: Send, title: 'Review Request', desc: 'After 3rd+ successful visit', enabled: true, extra: 'Links to Google Review for Elviria' },
                            ].map((rule) => (
                                <div key={rule.title} className="flex items-start gap-4 border border-border rounded-lg p-4">
                                    <rule.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-[13px] font-medium">{rule.title}</p>
                                        <p className="text-notion-caption">{rule.desc}</p>
                                        {rule.extra && <p className="text-[11px] text-blue-600 mt-1">{rule.extra}</p>}
                                    </div>
                                    <div className="shrink-0">
                                        <Badge variant="success" className="text-[10px]">Active</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
