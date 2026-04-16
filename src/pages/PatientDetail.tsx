import { useParams, Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Phone, Mail, Calendar, CreditCard, FileText, Copy, Clock } from 'lucide-react';
import { usePatients, useAppointments } from '@/hooks/useData';
import { formatDate, formatTime, formatCurrency } from '@/lib/utils';
import { useState } from 'react';
import { AppointmentDetailPanel } from '@/components/AppointmentDetailPanel';
import { ClinicalNotesTab } from '@/components/ClinicalNotesTab';
import { DocumentsTab } from '@/components/DocumentsTab';
import { CommunicationsTab } from '@/components/CommunicationsTab';
import { PatientActivitySidebar } from '@/components/PatientActivitySidebar';
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

            <div className="px-8 py-6 flex flex-col lg:flex-row gap-8 items-start min-h-[calc(100vh-140px)] pb-12">
                <div className="flex-1 min-w-0 w-full">
                    <Tabs defaultValue="overview">
                        <TabsList className="mb-6">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="clinical_records">Clinical Records</TabsTrigger>
                        <TabsTrigger value="documents">Documents</TabsTrigger>
                        <TabsTrigger value="communications">Communications</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview">
                        <PatientOverviewTab 
                            patient={patient}
                            upcoming={upcoming}
                            past={past}
                            formsUrl={formsUrl}
                            copyFormsLink={copyFormsLink}
                            aLoading={aLoading}
                            setSelectedApt={setSelectedApt}
                        />
                    </TabsContent>

                    <TabsContent value="clinical_records">
                        <ClinicalNotesTab patientId={patient.id} />
                    </TabsContent>

                    <TabsContent value="documents">
                        <DocumentsTab patient={patient} />
                    </TabsContent>

                    <TabsContent value="communications">
                        <CommunicationsTab patientId={patient.id} />
                    </TabsContent>
                </Tabs>
                </div>

                {/* Right Sidebar - Global Timeline */}
                <div className="hidden lg:block w-[320px] shrink-0 sticky top-6 h-[calc(100vh-140px)]">
                    <div className="h-full border border-border rounded-xl bg-slate-50/50 dark:bg-slate-900/20 p-5">
                        <PatientActivitySidebar patientId={patient.id} />
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

function PatientOverviewTab({ 
    patient, 
    upcoming, 
    past, 
    formsUrl, 
    copyFormsLink, 
    aLoading, 
    setSelectedApt 
}: { 
    patient: any, 
    upcoming: Appointment[], 
    past: Appointment[], 
    formsUrl: string | null, 
    copyFormsLink: () => void, 
    aLoading: boolean, 
    setSelectedApt: (apt: Appointment) => void 
}) {
    return (
        <div className="grid grid-cols-3 gap-6 animate-in fade-in duration-300">
            {/* Left Column: Profile */}
            <div className="space-y-5">
                {/* Quick Stats */}
                <div className="border border-border bg-card rounded-lg p-5 shadow-sm space-y-4">
                    <h3 className="text-[14px] font-semibold tracking-tight text-foreground/90 uppercase mb-2">Profile Details</h3>
                    {[
                        { label: 'Visits', value: String(patient.visit_count) },
                        { label: 'Source', value: patient.source.replace('_', ' ') },
                        { label: 'Language', value: patient.language === 'es' ? 'Spanish' : 'English' },
                        { label: 'Marketing', value: patient.marketing_consent ? '✓ Yes' : '✗ No' },
                        { label: 'Forms', value: patient.forms_completed ? '✓ Complete' : '○ Pending' },
                        { label: 'Since', value: formatDate(patient.created_at) },
                    ].map(item => (
                        <div key={item.label} className="flex items-center justify-between text-[13px] border-b border-border/50 pb-2 last:border-0 last:pb-0">
                            <span className="text-muted-foreground">{item.label}</span>
                            <span className="font-medium capitalize text-foreground/90">{item.value}</span>
                        </div>
                    ))}
                </div>

                {/* Forms Link */}
                <div className="border border-border bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg p-5 shadow-sm">
                    <h3 className="text-[14px] font-semibold text-emerald-800 dark:text-emerald-400 mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Intake Forms
                    </h3>
                    <p className="text-[12px] text-muted-foreground mb-4 leading-relaxed">
                        {patient.forms_completed
                            ? 'All required intake forms have been digitally signed by the patient.'
                            : 'Send this secure link to the patient to complete their intake forms prior to their visit.'}
                    </p>
                    {formsUrl && (
                        <Button variant="outline" size="sm" className="h-8 text-[12px] w-full font-medium shadow-sm hover:bg-emerald-100 hover:text-emerald-900 border-emerald-200 dark:border-emerald-800" onClick={copyFormsLink}>
                            <Copy className="h-3.5 w-3.5 mr-2" /> Copy Secure Link
                        </Button>
                    )}
                </div>

                {/* Notes */}
                {patient.notes && (
                    <div className="border border-border bg-amber-50/50 dark:bg-amber-950/20 rounded-lg p-5 shadow-sm">
                        <h3 className="text-[14px] font-semibold text-amber-800 dark:text-amber-400 mb-2">Clinical Notes</h3>
                        <p className="text-[13px] text-amber-900/80 dark:text-amber-200/80 leading-relaxed italic">{patient.notes}</p>
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
                        <div className="space-y-3">
                            {upcoming.map(apt => (
                                <div
                                    key={apt.id}
                                    className="border border-border bg-card rounded-lg p-4 flex items-center justify-between shadow-sm notion-row-hover cursor-pointer transition-shadow hover:shadow-md"
                                    onClick={() => setSelectedApt(apt)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="text-center min-w-[56px] bg-muted/40 rounded-md p-2">
                                            <p className="text-[20px] font-semibold leading-none text-foreground">{new Date(apt.start_time).getDate()}</p>
                                            <p className="text-[10px] uppercase font-medium tracking-wider text-muted-foreground mt-1">{new Date(apt.start_time).toLocaleDateString('en', { month: 'short' })}</p>
                                        </div>
                                        <Separator orientation="vertical" className="h-10 border-slate-200 dark:border-slate-800" />
                                        <div className="flex flex-col gap-1">
                                            <p className="text-[14px] font-semibold text-foreground/90">{apt.service?.name || 'Appointment'}</p>
                                            <p className="text-[12px] text-muted-foreground font-medium flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5" />
                                                {formatTime(apt.start_time)} · {apt.practitioner?.first_name} {apt.practitioner?.last_name}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {apt.deposit_paid && <Badge variant="success" className="text-[11px] px-2 py-0.5">Paid</Badge>}
                                        <Badge variant={apt.status === 'confirmed' ? 'success' : 'warning'} className="text-[11px] px-2 py-0.5 uppercase tracking-wide">
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
    );
}
