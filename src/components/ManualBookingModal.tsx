import React, { useState, useEffect } from 'react';
import { CalendarDays } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
    usePatients, 
    useCreatePatient, 
    usePractitioners, 
    useServices, 
    useRooms, 
    useAppointments, 
    useCreateAppointment,
    useUpdateAppointment
} from '@/hooks/useData';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface BaseBookingSlot {
    date: Date;
    hour: number;
    startMin?: number;
}

interface ManualBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    bookingSlot: BaseBookingSlot | null;
    selectedLocationId: string;
    preselectedPractitionerId?: string;
    editingAppointment?: any | null;
}

export function ManualBookingModal({ 
    isOpen, 
    onClose, 
    bookingSlot, 
    selectedLocationId,
    preselectedPractitionerId,
    editingAppointment
}: ManualBookingModalProps) {
    
    const [isNewPatient, setIsNewPatient] = useState(false);
    
    // Form State
    const [patientId, setPatientId] = useState<string>('');
    const [newPatientFields, setNewPatientFields] = useState({ first_name: '', last_name: '', phone: '', email: '' });
    
    const [practitionerId, setPractitionerId] = useState<string>('');
    const [serviceId, setServiceId] = useState<string>('');
    const [roomId, setRoomId] = useState<string>('');
    
    const [durationMinutes, setDurationMinutes] = useState<number>(60);

    const { data: patients } = usePatients();
    const { data: practitioners } = usePractitioners();
    const { data: services } = useServices();
    const { data: rooms } = useRooms();
    const { data: allAppointments } = useAppointments(); // To check constraints
    
    const { mutateAsync: createPatient } = useCreatePatient();
    const { mutateAsync: createAppointment } = useCreateAppointment();
    const { mutateAsync: updateAppointment } = useUpdateAppointment();

    // Derived State
    const selectedPractitioner = practitioners?.find(p => p.id === practitionerId);
    
    const availableServices = (services || []).filter(s => {
        if (!selectedPractitioner) return true;
        if (!s.category) return true;
        return selectedPractitioner.sub_specialties?.includes(s.category);
    });

    const targetStart = new Date(bookingSlot?.date || new Date());
    if (bookingSlot) {
        targetStart.setHours(bookingSlot.hour, bookingSlot.startMin || 0, 0, 0);
    }
    const targetEnd = new Date(targetStart.getTime() + durationMinutes * 60000);

    const availableRooms = (rooms || []).filter(room => {
        if (!allAppointments) return true;
        return !allAppointments.some(apt => {
            if (apt.room_id !== room.id) return false;
            const existingStart = new Date(apt.start_time);
            const existingEnd = new Date(apt.end_time);
            return targetStart < existingEnd && targetEnd > existingStart;
        });
    });

    // Reset defaults on open
    useEffect(() => {
        if (isOpen) {
            setIsNewPatient(false);
            setNewPatientFields({ first_name: '', last_name: '', phone: '', email: '' });
            
            if (editingAppointment) {
                setPractitionerId(editingAppointment.practitioner_id);
                setPatientId(editingAppointment.patient_id);
                setServiceId(editingAppointment.service_id);
                setRoomId(editingAppointment.room_id || '');
                // duration will be caught by service effect, or derived
            } else {
                setPractitionerId(preselectedPractitionerId && preselectedPractitionerId !== 'all' ? preselectedPractitionerId : '');
                setPatientId('');
                setServiceId('');
                setRoomId('');
                setDurationMinutes(0);
            }
        }
    }, [isOpen, preselectedPractitionerId, editingAppointment]);

    // Update duration automatically when service changes
    useEffect(() => {
        if (serviceId && services) {
            const svc = services.find(s => s.id === serviceId);
            if (svc?.duration_minutes) {
                setDurationMinutes(svc.duration_minutes);
            }
        }
    }, [serviceId, services]);

    if (!bookingSlot) return null;

    const handleSave = async () => {
        try {
            // 1. Basic validation
            if (!isNewPatient && !patientId) return toast.error('Please select a patient');
            if (isNewPatient && (!newPatientFields.first_name || !newPatientFields.last_name || !newPatientFields.phone)) {
                return toast.error('First Name, Last Name, and Phone Number are required for new patients');
            }
            if (!practitionerId) return toast.error('Please select a practitioner');
            if (!serviceId) return toast.error('Please select a service');
            if (!roomId) return toast.error('Please select a room');

            // 2. Conflict Validation (Practitioner & Room overlapping)
            // Target Start/End is strictly derived at component scope. 

            if (allAppointments) {
                for (const apt of allAppointments) {
                    if (editingAppointment && apt.id === editingAppointment.id) continue;
                    
                    const existingStart = new Date(apt.start_time);
                    const existingEnd = new Date(apt.end_time);

                    if (targetStart < existingEnd && targetEnd > existingStart) {
                        if (apt.practitioner_id === practitionerId) {
                            return toast.error('Booking Conflict: Practitioner is already booked at this time.');
                        }
                        if (apt.room_id === roomId) {
                            return toast.error('Booking Conflict: Room is already booked at this time.');
                        }
                    }
                }
            }

            // 3. Create Patient if New
            let finalPatientId = patientId;
            if (isNewPatient) {
                const newPat = await createPatient({
                    first_name: newPatientFields.first_name,
                    last_name: newPatientFields.last_name,
                    phone: newPatientFields.phone,
                    email: newPatientFields.email,
                });
                finalPatientId = newPat.id;
            }

            // 4. Create or Update Appointment
            if (editingAppointment) {
                await updateAppointment({
                    id: editingAppointment.id,
                    patient_id: finalPatientId,
                    practitioner_id: practitionerId,
                    room_id: roomId,
                    service_id: serviceId,
                    start_time: targetStart.toISOString(),
                    end_time: targetEnd.toISOString(),
                });
                toast.success('Appointment updated successfully');
            } else {
                await createAppointment({
                    patient_id: finalPatientId,
                    practitioner_id: practitionerId,
                    room_id: roomId,
                    service_id: serviceId,
                    location_id: selectedLocationId === 'all' ? undefined : selectedLocationId,
                    start_time: targetStart.toISOString(),
                    end_time: targetEnd.toISOString(),
                    booking_source: 'manual',
                    status: 'confirmed'
                });
                toast.success('Appointment created successfully');
            }

            onClose();
            
        } catch (error: any) {
            toast.error(error.message || 'Failed to create appointment');
        }
    };

    const isFormValid = isNewPatient 
        ? (newPatientFields.first_name && newPatientFields.last_name && newPatientFields.phone && practitionerId && serviceId && roomId)
        : (patientId && practitionerId && serviceId && roomId);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{editingAppointment ? 'Edit Booking' : 'New Manual Booking'}</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4 py-2">
                    <div className="flex items-center gap-2 text-sm mb-4 text-muted-foreground">
                        <CalendarDays className="h-4 w-4" />
                        <span className="font-medium text-foreground">
                            {bookingSlot.date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </span>{' '}
                        at <span className="font-medium text-foreground">
                            {bookingSlot.hour}:{String(bookingSlot.startMin || 0).padStart(2, '0')}
                        </span>
                    </div>

                    {/* Patient Context */}
                    <div className="space-y-3">
                        <Tabs value={isNewPatient ? 'new' : 'existing'} onValueChange={(val) => setIsNewPatient(val === 'new')} className="w-full">
                            <TabsList className="w-full flex">
                                <TabsTrigger value="existing" className="flex-1">Existing Patient</TabsTrigger>
                                {!editingAppointment && <TabsTrigger value="new" className="flex-1">Create New Patient</TabsTrigger>}
                            </TabsList>
                            <TabsContent value="existing" className="pt-2">
                                <Select value={patientId} onValueChange={setPatientId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Search or select existing patient..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {patients?.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </TabsContent>
                            <TabsContent value="new" className="pt-2">
                                <div className="grid grid-cols-2 gap-2 bg-muted/20 border border-border/50 rounded-md p-3">
                                    <input 
                                        placeholder="First Name *" 
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground"
                                        value={newPatientFields.first_name}
                                        onChange={(e) => setNewPatientFields(prev => ({...prev, first_name: e.target.value}))}
                                    />
                                    <input 
                                        placeholder="Last Name *" 
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground"
                                        value={newPatientFields.last_name}
                                        onChange={(e) => setNewPatientFields(prev => ({...prev, last_name: e.target.value}))}
                                    />
                                    <input 
                                        placeholder="Phone Number *" 
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground"
                                        value={newPatientFields.phone}
                                        onChange={(e) => setNewPatientFields(prev => ({...prev, phone: e.target.value}))}
                                    />
                                    <input 
                                        placeholder="Email (Optional)" 
                                        type="email"
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground"
                                        value={newPatientFields.email}
                                        onChange={(e) => setNewPatientFields(prev => ({...prev, email: e.target.value}))}
                                    />
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    <div className="h-[1px] bg-border my-4" />

                    {/* Booking Context */}
                    <div className="space-y-3 mt-6">
                        <label className="font-semibold text-sm">Appointment Details</label>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground">Practitioner *</label>
                                <Select value={practitionerId} onValueChange={setPractitionerId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {practitioners?.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground">Service *</label>
                                <Select value={serviceId} onValueChange={setServiceId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableServices.map(s => (
                                            <SelectItem key={s.id} value={s.id}>{s.name} ({s.duration_minutes}m)</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground">Duration (Minutes)</label>
                                <input 
                                    type="number"
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    value={durationMinutes || ''}
                                    onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                                    min={5}
                                    step={5}
                                    placeholder="e.g. 60"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs text-muted-foreground">Room *</label>
                                <Select value={roomId} onValueChange={setRoomId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableRooms.map(r => (
                                            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-border">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={!isFormValid}>
                        {editingAppointment ? 'Save Changes' : 'Save Booking'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
