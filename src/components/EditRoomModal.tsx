import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { X, CheckCircle2, Wrench, ShieldAlert } from 'lucide-react';
import { useUpdateRoomFull, useServices } from '@/hooks/useData';
import { cn } from '@/lib/utils';
import { Room, Service } from '@/types';

const formSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    type: z.enum(['chiropractic', 'physiotherapy', 'massage', 'general']),
    capacity: z.number().min(1, 'Capacity must be at least 1'),
    status: z.enum(['available', 'occupied', 'maintenance']),
    reason: z.string().optional(),
    equipment: z.array(z.string()),
    services: z.array(z.string()),
}).superRefine((data, ctx) => {
    if (data.status === 'maintenance' && (!data.reason || data.reason.trim() === '')) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Maintenance reason is required', path: ['reason'] });
    }
});

type FormData = z.infer<typeof formSchema>;

export function EditRoomModal({ 
    isOpen, 
    onClose, 
    room, 
    supportedServices 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    room: Room | null; 
    supportedServices: Service[] | null; 
}) {
    const { mutate: updateRoom, isPending } = useUpdateRoomFull();
    const { data: allServices } = useServices();

    const [equipmentInput, setEquipmentInput] = useState('');

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            type: 'general',
            capacity: 1,
            status: 'available',
            reason: '',
            equipment: [],
            services: [],
        }
    });

    useEffect(() => {
        if (isOpen && room) {
            form.reset({
                name: room.name || '',
                type: room.type || 'general',
                capacity: room.capacity || 1,
                status: room.status === 'occupied' ? 'available' : room.status, // We edit generic operating state usually so 'occupied' might just be auto-managed, but let's allow it in select. But default to available if it's just temporarily occupied.
                reason: '', // Reset reason
                equipment: room.equipment || [],
                services: (supportedServices || []).map(s => s.id),
            });
            setEquipmentInput('');
        }
    }, [isOpen, room, supportedServices, form]);

    const handleAddEquipment = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = equipmentInput.trim();
            if (val) {
                const currentEquip = form.getValues('equipment');
                if (!currentEquip.includes(val)) {
                    form.setValue('equipment', [...currentEquip, val]);
                    setEquipmentInput('');
                }
            }
        }
    };

    const handleRemoveEquipment = (tag: string) => {
        form.setValue('equipment', form.getValues('equipment').filter(t => t !== tag));
    };

    const handleSelectAllServices = () => {
        if (!allServices) return;
        const currentType = form.getValues('type');
        // Let's guess related categories for type based on type string.
        const related = allServices.filter(s => s.category?.toLowerCase().includes(currentType) || (currentType === 'chiropractic' && s.category === 'assessment'));
        const ids = new Set(form.getValues('services'));
        related.forEach(s => ids.add(s.id));
        form.setValue('services', Array.from(ids));
    };

    const onSubmit = (data: FormData) => {
        if (!room) return;
        updateRoom({
            id: room.id,
            room: {
                name: data.name,
                type: data.type,
                capacity: data.capacity,
                status: data.status,
                equipment: data.equipment,
            },
            serviceIds: data.services,
            maintenanceReason: data.status === 'maintenance' ? data.reason : undefined
        }, {
            onSuccess: () => {
                toast.success('Room updated successfully');
                onClose();
            },
            onError: (err) => {
                toast.error('Failed to update room', { description: err.message });
            }
        });
    };

    const watchedStatus = form.watch('status');
    const watchedServices = form.watch('services');
    const watchedType = form.watch('type');

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="sm:max-w-[500px] w-full p-0 flex flex-col border-l">
                <SheetHeader className="px-6 py-5 border-b sticky top-0 bg-background/80 backdrop-blur-md z-10">
                    <SheetTitle>Edit Room: {room?.name}</SheetTitle>
                    <p className="text-[13px] text-muted-foreground mt-1">
                        Update settings, operating status, and equipment
                    </p>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                    <form id="edit-room-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        
                        {/* Section 1: Basic Info */}
                        <div className="space-y-4">
                            <h3 className="text-[13px] font-semibold tracking-wide uppercase text-muted-foreground">Basic Information</h3>
                            
                            <div className="space-y-2">
                                <label className="text-[12px] font-medium">Room Name *</label>
                                <Input {...form.register('name')} placeholder="e.g. Massage Room 2" className="h-9" />
                                {form.formState.errors.name && <p className="text-[11px] text-red-500">{form.formState.errors.name.message}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[12px] font-medium">Room Type *</label>
                                    <Select value={watchedType} onValueChange={(val: any) => form.setValue('type', val)}>
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="chiropractic">Chiropractic</SelectItem>
                                            <SelectItem value="physiotherapy">Physiotherapy</SelectItem>
                                            <SelectItem value="massage">Massage</SelectItem>
                                            <SelectItem value="general">General</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[12px] font-medium">Capacity</label>
                                    <Input 
                                        type="number" 
                                        min={1} 
                                        {...form.register('capacity', { valueAsNumber: true })} 
                                        className="h-9" 
                                    />
                                    {form.formState.errors.capacity && <p className="text-[11px] text-red-500">{form.formState.errors.capacity.message}</p>}
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-border/50" />

                        {/* Section 2: Operational Status */}
                        <div className="space-y-4">
                            <h3 className="text-[13px] font-semibold tracking-wide uppercase text-muted-foreground flex items-center gap-1">
                                Operational Status
                                {watchedStatus === 'maintenance' && <ShieldAlert className="h-3 w-3 text-warning ml-1" />}
                            </h3>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div 
                                    onClick={() => form.setValue('status', 'available')}
                                    className={cn(
                                        "border rounded-lg p-3 cursor-pointer transition-all flex items-center gap-2",
                                        watchedStatus === 'available' ? "border-success bg-success/5 shadow-sm" : "border-border hover:bg-muted/30 opacity-70"
                                    )}
                                >
                                    <CheckCircle2 className={cn("h-4 w-4", watchedStatus === 'available' ? "text-success" : "text-muted-foreground")} />
                                    <span className="text-[14px] font-medium">Available</span>
                                </div>
                                
                                <div 
                                    onClick={() => form.setValue('status', 'maintenance')}
                                    className={cn(
                                        "border rounded-lg p-3 cursor-pointer transition-all flex items-center gap-2",
                                        watchedStatus === 'maintenance' ? "border-warning bg-warning/5 shadow-sm" : "border-border hover:bg-muted/30 opacity-70"
                                    )}
                                >
                                    <Wrench className={cn("h-4 w-4", watchedStatus === 'maintenance' ? "text-warning" : "text-muted-foreground")} />
                                    <span className="text-[14px] font-medium">Maintenance</span>
                                </div>
                            </div>

                            {/* Animated Maintenance Reason Field */}
                            <div 
                                className={cn(
                                    "overflow-hidden transition-all duration-300 ease-in-out",
                                    watchedStatus === 'maintenance' ? "max-h-[200px] opacity-100 pt-2" : "max-h-0 opacity-0"
                                )}
                            >
                                <div className="space-y-2">
                                    <label className="text-[12px] font-medium text-warning">Reason for maintenance *</label>
                                    <Textarea 
                                        {...form.register('reason')} 
                                        placeholder="Describe the issue, e.g. broken table or deep cleaning..." 
                                        className="h-20 resize-none border-warning/30 focus-visible:ring-warning/20 bg-warning/5"
                                    />
                                    {form.formState.errors.reason && <p className="text-[11px] text-red-500">{form.formState.errors.reason.message}</p>}
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-border/50" />

                        {/* Section 3: Equipment & Services */}
                        <div className="space-y-5">
                            <h3 className="text-[13px] font-semibold tracking-wide uppercase text-muted-foreground">Capabilities & Equipment</h3>
                            
                            <div className="space-y-2">
                                <label className="text-[12px] font-medium">Inventory items (Press Enter to add)</label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {form.watch('equipment').map((tag, idx) => (
                                        <Badge key={idx} variant="secondary" className="flex items-center gap-1.5 px-2 py-1 h-7">
                                            {tag}
                                            <X 
                                                className="h-3 w-3 opacity-60 hover:opacity-100 cursor-pointer" 
                                                onClick={() => handleRemoveEquipment(tag)} 
                                            />
                                        </Badge>
                                    ))}
                                </div>
                                <Input 
                                    value={equipmentInput}
                                    onChange={(e) => setEquipmentInput(e.target.value)}
                                    onKeyDown={handleAddEquipment}
                                    placeholder="Add equipment and press Enter..." 
                                    className="h-9"
                                />
                            </div>

                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[12px] font-medium">Supported Treatments</label>
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-6 text-[10px] px-2 text-primary"
                                        onClick={handleSelectAllServices}
                                    >
                                        Auto-select {watchedType}
                                    </Button>
                                </div>
                                
                                <div className="border rounded-md divide-y max-h-[220px] overflow-y-auto">
                                    {allServices?.map(service => {
                                        const isChecked = watchedServices.includes(service.id);
                                        return (
                                            <label 
                                                key={service.id} 
                                                className="flex items-center gap-3 p-3 hover:bg-muted/30 cursor-pointer transition-colors"
                                            >
                                                <Checkbox 
                                                    checked={isChecked}
                                                    onCheckedChange={(checked) => {
                                                        const current = form.getValues('services');
                                                        if (checked) {
                                                            form.setValue('services', [...current, service.id]);
                                                        } else {
                                                            form.setValue('services', current.filter(id => id !== service.id));
                                                        }
                                                    }}
                                                />
                                                <div className="flex items-center justify-between flex-1">
                                                    <span className="text-[13px]">{service.name}</span>
                                                    <span className="text-[10px] text-muted-foreground/70 uppercase select-none">{service.category}</span>
                                                </div>
                                            </label>
                                        );
                                    })}
                                    {(!allServices || allServices.length === 0) && (
                                        <div className="p-4 text-center text-[12px] text-muted-foreground">
                                            No services loaded
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </form>
                </div>

                <SheetFooter className="px-6 py-4 border-t bg-background sticky bottom-0">
                    <Button variant="ghost" onClick={onClose} disabled={isPending}>
                        Cancel
                    </Button>
                    <Button form="edit-room-form" type="submit" disabled={isPending}>
                        {isPending ? "Saving..." : "Save Room changes"}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
