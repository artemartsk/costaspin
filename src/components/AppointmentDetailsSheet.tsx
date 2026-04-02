import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { Bot, Globe, MessageCircle, User, MessageSquare, Phone, Mail, Sparkles, Check, X, CalendarX, Edit } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './ui/accordion';
import { cn } from '../lib/utils';
import { useUpdateAppointment } from '../hooks/useData';

interface AppointmentDetailsSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onEdit?: () => void;
    appointment: any | null;
}

export function AppointmentDetailsSheet({ isOpen, onClose, onEdit, appointment }: AppointmentDetailsSheetProps) {
    const { mutateAsync: updateAppointment } = useUpdateAppointment();

    if (!appointment) return null;

    const { patient, practitioner, service, room } = appointment;

    const sourceLabel = {
        'ai_phone': 'AI Phone',
        'whatsapp': 'WhatsApp',
        'web': 'Web Portal',
        'manual': 'Manual',
    }[appointment.booking_source as string] || 'Unknown';

    const SourceIcon = {
        'ai_phone': Bot,
        'whatsapp': MessageCircle,
        'web': Globe,
        'manual': User,
    }[appointment.booking_source as string] || User;

    const sourceColor = {
        'ai_phone': 'text-primary',
        'whatsapp': 'text-emerald-600',
        'web': 'text-blue-500',
        'manual': 'text-muted-foreground',
    }[appointment.booking_source as string] || '';

    // Status mapping
    const getStatusVariant = (status: string) => {
        if (status === 'confirmed' || status === 'attended') return 'success';
        if (status === 'no_show' || status === 'cancelled') return 'destructive';
        if (status === 'pending_deposit') return 'secondary';
        return 'default';
    };

    const startDate = new Date(appointment.start_time);
    const dateStr = startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
    const timeStr = `${startDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} - ${new Date(appointment.end_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
    const durationMins = (new Date(appointment.end_time).getTime() - startDate.getTime()) / 60000;

    const handleAction = async (status: string) => {
        try {
            await updateAppointment({ id: appointment.id, status: status as any });
            onClose();
        } catch (e) {
            console.error('Failed to update status', e);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="right" className="sm:max-w-md w-full flex flex-col h-full bg-background p-0">
                <div className="flex-1 overflow-y-auto px-6 py-6 pb-24">
                    <SheetHeader className="text-left space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                                <SourceIcon className={cn("w-3.5 h-3.5", sourceColor)} />
                                <span>{sourceLabel}</span>
                            </div>
                            <Badge variant={getStatusVariant(appointment.status) as any} className="capitalize">
                                {appointment.status.replace('_', ' ')}
                            </Badge>
                        </div>
                        <SheetTitle className="text-2xl font-semibold tracking-tight">
                            {patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient'}
                        </SheetTitle>
                        <SheetDescription className="sr-only">
                            Appointment details for {patient?.first_name}
                        </SheetDescription>
                    </SheetHeader>

                    {/* Quick Contacts */}
                    {patient && (
                        <div className="flex items-center gap-3 mt-6">
                            {patient.phone && (
                                <>
                                    <Button variant="outline" size="icon" className="rounded-full h-10 w-10 text-slate-500 border-slate-200 bg-transparent hover:border-green-200 hover:bg-green-50 hover:text-green-600 transition-colors" onClick={() => window.open(`https://wa.me/${patient.phone.replace(/[^0-9]/g, '')}`)}>
                                        <MessageSquare className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="icon" className="rounded-full h-10 w-10 text-slate-500 border-slate-200 bg-transparent hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 transition-colors" onClick={() => window.open(`tel:${patient.phone}`)}>
                                        <Phone className="h-4 w-4" />
                                    </Button>
                                </>
                            )}
                            {patient.email && (
                                <Button variant="outline" size="icon" className="rounded-full h-10 w-10 text-slate-500 border-slate-200 bg-transparent hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 transition-colors" onClick={() => window.open(`mailto:${patient.email}`)}>
                                    <Mail className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    )}

                    <Separator className="my-6" />

                    {/* Booking Details */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-foreground/80 tracking-wide uppercase">Booking Details</h3>
                        <div className="grid grid-cols-[100px_1fr] gap-y-3 text-sm">
                            <span className="text-muted-foreground font-medium">Date & Time</span>
                            <span className="text-foreground">{dateStr}, {timeStr} ({durationMins}m)</span>
                            
                            <span className="text-muted-foreground font-medium">Practitioner</span>
                            <span className="text-foreground">
                                {practitioner ? `Dr. ${practitioner.first_name} ${practitioner.last_name}` : 'Unknown'}
                            </span>
                            
                            <span className="text-muted-foreground font-medium">Service</span>
                            <span className="text-foreground">{service?.name || 'Appointment'}</span>
                            
                            <span className="text-muted-foreground font-medium">Room</span>
                            <span className="text-foreground">{room?.name || 'Default Room'}</span>
                        </div>
                    </div>

                    {/* AI Triage Summary */}
                    {/* AI Triage Summary */}
                    {appointment.triage_data && Object.keys(appointment.triage_data).length > 0 && (
                        <>
                            <Separator className="my-6" />
                            <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 space-y-3">
                                <div className="flex items-center gap-2 text-primary font-medium text-sm">
                                    <Sparkles className="h-4 w-4" />
                                    <span>AI Triage Summary</span>
                                </div>
                                <div className="text-sm space-y-2">
                                    {Object.entries(appointment.triage_data).map(([key, val]) => (
                                        <div key={key} className="flex flex-col sm:flex-row sm:gap-2">
                                            <span className="text-primary/70 font-medium capitalize min-w-[80px]">{key.replace('_', ' ')}:</span>
                                            <span className="text-foreground">{String(val)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                            
                    {/* Voice Agent Recording & Transcript */}
                    {appointment.booking_source === 'ai_phone' && appointment.recording_url && (
                        <>
                            {(!appointment.triage_data || Object.keys(appointment.triage_data).length === 0) && <Separator className="my-6" />}
                            <div className="mt-4 flex flex-col gap-2">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Call Recording</span>
                                <audio controls src={appointment.recording_url} className="h-10 w-full rounded-md" />
                            </div>
                        </>
                    )}

                    {appointment.booking_source === 'ai_phone' && appointment.transcript && (
                        <Accordion type="single" collapsible className="w-full mt-2 border border-border/50 rounded-md px-3 bg-secondary/10">
                            <AccordionItem value="transcript" className="border-b-0">
                                <AccordionTrigger className="text-sm py-3 hover:no-underline">Read Full Transcript</AccordionTrigger>
                                <AccordionContent className="text-xs text-muted-foreground bg-muted p-3 rounded-md mb-3 max-h-[300px] overflow-y-auto whitespace-pre-wrap">
                                    {appointment.transcript}
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    )}
                </div>

                {/* Sticky Footer */}
                <div className="border-t bg-background p-4 flex flex-col gap-2 shrink-0">
                    <Button 
                        size="lg" 
                        variant="outline"
                        className="w-full border-border/60 hover:bg-muted"
                        onClick={() => {
                            if(onEdit) onEdit();
                        }}
                    >
                        <Edit className="w-4 h-4 mr-2" /> Edit Booking
                    </Button>
                    <Button 
                        size="lg" 
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                        onClick={() => handleAction('attended')}
                    >
                        <Check className="w-4 h-4 mr-2" /> Mark Attended
                    </Button>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <Button 
                            variant="ghost" 
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleAction('no_show')}
                        >
                            <CalendarX className="w-4 h-4 mr-2" /> No Show
                        </Button>
                        <Button 
                            variant="ghost" 
                            className="text-muted-foreground hover:bg-muted"
                            onClick={() => handleAction('cancelled')}
                        >
                            <X className="w-4 h-4 mr-2" /> Cancel
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
