import { useParams, Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Phone, Mail, Calendar, CreditCard, FileText, Copy } from 'lucide-react';
import { usePatients, useAppointments } from '@/hooks/useData';
import { formatDate, formatTime, formatCurrency } from '@/lib/utils';
import { useState } from 'react';
import { AppointmentDetailPanel } from '@/components/AppointmentDetailPanel';
import { toast } from 'sonner';
import type { Appointment } from '@/types';

export default function PatientDetail() {
    const { id } = useParams<{ id: string }>();
    const { data: patients, isLoading: pLoading } = usePatients();
    const { data: allAppointments, isLoading: aLoading } = useAppointments();
    const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);

    const patient = patients?.find(p => p.id === id);
    const appointments = (allAppointments || []).filter(a => a.patient_id === id);
    const upcoming = appointments.filter(a => new Date(a.start_time) > new Date() && a.status !== 'cancelled');
    const past = appointments.filter(a => new Date(a.start_time) <= new Date() || a.status === 'cancelled');

    const formsUrl = patient?.form_token
        ? `${window.location.origin}/forms/${patient.form_token}`
        : null;

    const copyFormsLink = () => {
        if (formsUrl) {
            navigator.clipboard.writeText(formsUrl);
            toast.success('Forms link copied!');
        }
    };

    if (pLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="h-5 w-5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="px-8 py-8">
                <p className="text-muted-foreground">Patient not found</p>
                <Link to="/patients" className="text-[13px] text-blue-600 hover:underline mt-2 inline-block">← Back to Patients</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            {/* Header */}
            <div className="border-b border-border px-8 py-5">
                <Link to="/patients" className="text-[12px] text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3">
                    <ArrowLeft className="h-3 w-3" /> Back to Patients
                </Link>
                <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                        <AvatarFallback className="text-[16px] bg-foreground/5">
                            {patient.first_name[0]}{patient.last_name?.[0]}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-notion-h2">{patient.first_name} {patient.last_name}</h1>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-notion-caption flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {patient.phone}
                            </span>
                            {patient.email && (
                                <span className="text-notion-caption flex items-center gap-1">
                                    <Mail className="h-3 w-3" /> {patient.email}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-8 py-6">
                <div className="grid grid-cols-3 gap-6">
                    {/* Left Column: Profile */}
                    <div className="space-y-5">
                        {/* Quick Stats */}
                        <div className="border border-border rounded-lg p-4 space-y-3">
                            <h3 className="text-[13px] font-medium">Profile</h3>
                            {[
                                { label: 'Visits', value: String(patient.visit_count) },
                                { label: 'Source', value: patient.source.replace('_', ' ') },
                                { label: 'Language', value: patient.language === 'es' ? 'Spanish' : 'English' },
                                { label: 'Marketing Consent', value: patient.marketing_consent ? '✓ Yes' : '✗ No' },
                                { label: 'Forms', value: patient.forms_completed ? '✓ Complete' : '○ Pending' },
                                { label: 'Since', value: formatDate(patient.created_at) },
                            ].map(item => (
                                <div key={item.label} className="flex items-center justify-between text-[13px]">
                                    <span className="text-muted-foreground">{item.label}</span>
                                    <span className="font-medium capitalize">{item.value}</span>
                                </div>
                            ))}
                        </div>

                        {/* Forms Link */}
                        <div className="border border-border rounded-lg p-4">
                            <h3 className="text-[13px] font-medium mb-2 flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5" /> Intake Forms
                            </h3>
                            <p className="text-[12px] text-muted-foreground mb-3">
                                {patient.forms_completed
                                    ? 'All forms have been signed.'
                                    : 'Send this link to the patient to complete their intake forms.'}
                            </p>
                            {formsUrl && (
                                <Button variant="outline" size="sm" className="h-7 text-[11px] w-full" onClick={copyFormsLink}>
                                    <Copy className="h-3 w-3 mr-1.5" /> Copy Forms Link
                                </Button>
                            )}
                        </div>

                        {/* Notes */}
                        {patient.notes && (
                            <div className="border border-border rounded-lg p-4">
                                <h3 className="text-[13px] font-medium mb-2">Notes</h3>
                                <p className="text-[12px] text-muted-foreground">{patient.notes}</p>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Appointments Timeline */}
                    <div className="col-span-2 space-y-5">
                        {/* Upcoming */}
                        <div>
                            <h3 className="text-[13px] font-medium mb-3 flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" /> Upcoming ({upcoming.length})
                            </h3>
                            {aLoading ? (
                                <p className="text-[13px] text-muted-foreground">Loading...</p>
                            ) : upcoming.length === 0 ? (
                                <p className="text-[13px] text-muted-foreground border border-dashed border-border rounded-lg p-4 text-center">
                                    No upcoming appointments
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {upcoming.map(apt => (
                                        <div
                                            key={apt.id}
                                            className="border border-border rounded-lg p-3 flex items-center justify-between notion-row-hover cursor-pointer"
                                            onClick={() => setSelectedApt(apt)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="text-center min-w-[48px]">
                                                    <p className="text-[18px] font-semibold leading-none">{new Date(apt.start_time).getDate()}</p>
                                                    <p className="text-[10px] text-muted-foreground uppercase">{new Date(apt.start_time).toLocaleDateString('en', { month: 'short' })}</p>
                                                </div>
                                                <Separator orientation="vertical" className="h-8" />
                                                <div>
                                                    <p className="text-[13px] font-medium">{apt.service?.name || 'Appointment'}</p>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {formatTime(apt.start_time)} · {apt.practitioner?.first_name} {apt.practitioner?.last_name}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {apt.deposit_paid && <Badge variant="success" className="text-[10px]">Paid</Badge>}
                                                <Badge variant={apt.status === 'confirmed' ? 'success' : 'warning'} className="text-[10px]">
                                                    {apt.status.replace('_', ' ')}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Past */}
                        <div>
                            <h3 className="text-[13px] font-medium mb-3 flex items-center gap-1.5">
                                <CreditCard className="h-3.5 w-3.5" /> History ({past.length})
                            </h3>
                            {past.length === 0 ? (
                                <p className="text-[13px] text-muted-foreground border border-dashed border-border rounded-lg p-4 text-center">
                                    No visit history
                                </p>
                            ) : (
                                <div className="border border-border rounded-lg overflow-hidden">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-border bg-muted/30">
                                                <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Date</th>
                                                <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Service</th>
                                                <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Practitioner</th>
                                                <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {past.map(apt => (
                                                <tr
                                                    key={apt.id}
                                                    className="border-b border-border/50 last:border-b-0 notion-row-hover cursor-pointer"
                                                    onClick={() => setSelectedApt(apt)}
                                                >
                                                    <td className="px-4 py-2 text-[13px] text-muted-foreground">{formatDate(apt.start_time)}</td>
                                                    <td className="px-4 py-2 text-[13px]">{apt.service?.name || '—'}</td>
                                                    <td className="px-4 py-2 text-[13px] text-muted-foreground">{apt.practitioner?.first_name} {apt.practitioner?.last_name}</td>
                                                    <td className="px-4 py-2">
                                                        <Badge variant={apt.status === 'attended' ? 'info' : apt.status === 'no_show' ? 'destructive' : 'secondary'} className="text-[10px]">
                                                            {apt.status.replace('_', ' ')}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Appointment Detail Panel */}
            {selectedApt && (
                <AppointmentDetailPanel appointment={selectedApt} onClose={() => setSelectedApt(null)} />
            )}
        </div>
    );
}
