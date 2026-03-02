import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { X, Check, XCircle, Clock, RotateCcw } from 'lucide-react';
import { useUpdateAppointment } from '@/hooks/useData';
import { formatDate, formatTime, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import type { Appointment } from '@/types';

interface Props {
    appointment: Appointment;
    onClose: () => void;
}

const STATUS_OPTIONS = [
    { value: 'attended', label: 'Attended', icon: Check, color: 'bg-emerald-600 hover:bg-emerald-700' },
    { value: 'no_show', label: 'No Show', icon: XCircle, color: 'bg-red-600 hover:bg-red-700' },
    { value: 'cancelled', label: 'Cancelled', icon: X, color: 'bg-gray-600 hover:bg-gray-700' },
] as const;

export function AppointmentDetailPanel({ appointment, onClose }: Props) {
    const updateApt = useUpdateAppointment();
    const [clinicalNotes, setClinicalNotes] = useState(appointment.clinical_notes || '');
    const [diagnosis, setDiagnosis] = useState(appointment.diagnosis || '');
    const [treatmentPlan, setTreatmentPlan] = useState(appointment.treatment_plan || '');
    const [saving, setSaving] = useState(false);

    const handleStatusChange = async (status: string) => {
        try {
            await updateApt.mutateAsync({
                id: appointment.id,
                status,
                updated_at: new Date().toISOString(),
            } as any);
            toast.success(`Status updated to ${status.replace('_', ' ')}`);
        } catch {
            toast.error('Failed to update status');
        }
    };

    const handleSaveNotes = async () => {
        setSaving(true);
        try {
            await updateApt.mutateAsync({
                id: appointment.id,
                clinical_notes: clinicalNotes,
                diagnosis,
                treatment_plan: treatmentPlan,
                updated_at: new Date().toISOString(),
            } as any);
            toast.success('Notes saved');
        } catch {
            toast.error('Failed to save notes');
        } finally {
            setSaving(false);
        }
    };

    const statusBadge = () => {
        switch (appointment.status) {
            case 'confirmed': return <Badge variant="success">Confirmed</Badge>;
            case 'pending_deposit': return <Badge variant="warning">Pending Deposit</Badge>;
            case 'attended': return <Badge variant="info">Attended</Badge>;
            case 'no_show': return <Badge variant="destructive">No Show</Badge>;
            case 'cancelled': return <Badge variant="secondary">Cancelled</Badge>;
            default: return <Badge variant="secondary">{appointment.status}</Badge>;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/20" onClick={onClose} />

            {/* Panel */}
            <div className="relative w-full max-w-md bg-background border-l border-border shadow-xl overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex items-center justify-between z-10">
                    <div>
                        <h2 className="text-[15px] font-medium">Appointment Details</h2>
                        <p className="text-notion-caption">{formatDate(appointment.start_time)}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="px-6 py-5 space-y-6">
                    {/* Patient + Service Info */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[14px] font-medium">
                                    {appointment.patient?.first_name} {appointment.patient?.last_name}
                                </p>
                                <p className="text-notion-caption">{appointment.patient?.phone}</p>
                            </div>
                            {statusBadge()}
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-[13px]">
                            <div>
                                <p className="text-muted-foreground text-[11px] uppercase tracking-wider mb-0.5">Time</p>
                                <p className="font-medium">{formatTime(appointment.start_time)} – {formatTime(appointment.end_time)}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-[11px] uppercase tracking-wider mb-0.5">Service</p>
                                <p className="font-medium">{appointment.service?.name || '—'}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-[11px] uppercase tracking-wider mb-0.5">Practitioner</p>
                                <p className="font-medium">{appointment.practitioner?.first_name} {appointment.practitioner?.last_name}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-[11px] uppercase tracking-wider mb-0.5">Room</p>
                                <p className="font-medium">{appointment.room?.name || '—'}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-[11px] uppercase tracking-wider mb-0.5">Deposit</p>
                                <p className="font-medium">{appointment.deposit_paid ? '✓ Paid' : '○ Pending'}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-[11px] uppercase tracking-wider mb-0.5">Source</p>
                                <p className="font-medium capitalize">{appointment.booking_source?.replace('_', ' ') || 'Manual'}</p>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Status Actions */}
                    <div>
                        <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-3">Update Status</p>
                        <div className="flex gap-2">
                            {STATUS_OPTIONS.map((opt) => (
                                <Button
                                    key={opt.value}
                                    size="sm"
                                    className={`h-8 text-[12px] text-white ${opt.color} ${appointment.status === opt.value ? 'ring-2 ring-offset-1' : ''}`}
                                    onClick={() => handleStatusChange(opt.value)}
                                    disabled={updateApt.isPending}
                                >
                                    <opt.icon className="h-3.5 w-3.5 mr-1" />
                                    {opt.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    {/* Clinical Notes */}
                    <div className="space-y-3">
                        <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Clinical Notes</p>

                        <div>
                            <label className="text-[12px] text-muted-foreground mb-1 block">Diagnosis</label>
                            <Textarea
                                value={diagnosis}
                                onChange={(e) => setDiagnosis(e.target.value)}
                                placeholder="e.g. Lumbar disc herniation L4-L5"
                                className="text-[13px] min-h-[60px] resize-none bg-muted/20 border-transparent focus:bg-background focus:border-border"
                            />
                        </div>

                        <div>
                            <label className="text-[12px] text-muted-foreground mb-1 block">Treatment Plan</label>
                            <Textarea
                                value={treatmentPlan}
                                onChange={(e) => setTreatmentPlan(e.target.value)}
                                placeholder="e.g. 6 sessions of spinal decompression, 2x/week"
                                className="text-[13px] min-h-[60px] resize-none bg-muted/20 border-transparent focus:bg-background focus:border-border"
                            />
                        </div>

                        <div>
                            <label className="text-[12px] text-muted-foreground mb-1 block">Session Notes</label>
                            <Textarea
                                value={clinicalNotes}
                                onChange={(e) => setClinicalNotes(e.target.value)}
                                placeholder="Notes from this visit..."
                                className="text-[13px] min-h-[80px] resize-none bg-muted/20 border-transparent focus:bg-background focus:border-border"
                            />
                        </div>

                        <Button size="sm" className="h-8 text-[12px] w-full" onClick={handleSaveNotes} disabled={saving}>
                            {saving ? 'Saving…' : 'Save Notes'}
                        </Button>
                    </div>

                    <Separator />

                    {/* Rebook */}
                    <div>
                        <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-3">Follow-up</p>
                        <Button variant="outline" size="sm" className="h-8 text-[12px] w-full">
                            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                            Rebook Patient
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
