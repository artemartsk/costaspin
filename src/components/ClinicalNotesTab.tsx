import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { FileText, Plus, UserCircle2, Pencil } from 'lucide-react';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

import { usePatientClinicalNotes, useCreateClinicalNote, useUpdateClinicalNote, usePractitioners } from '@/hooks/useData';

const soapSchema = z.object({
    practitioner_id: z.string().min(1, 'Practitioner is required'),
    subjective: z.string().optional(),
    objective: z.string().optional(),
    assessment: z.string().optional(),
    plan: z.string().optional(),
}).superRefine((data, ctx) => {
    // Ensure at least one field has content
    const hasContent = !!(
        data.subjective?.trim() || 
        data.objective?.trim() || 
        data.assessment?.trim() || 
        data.plan?.trim()
    );
    if (!hasContent) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'At least one SOAP section must be filled',
            path: ['subjective'] // attaching to subjective to show error
        });
    }
});

type SoapFormData = z.infer<typeof soapSchema>;

export function ClinicalNotesTab({ patientId }: { patientId: string }) {
    const { data: notes, isLoading: notesLoading } = usePatientClinicalNotes(patientId);
    const { data: practitioners, isLoading: practLoading } = usePractitioners();
    const { mutate: createNote, isPending: isCreating } = useCreateClinicalNote();
    const { mutate: updateNote, isPending: isUpdating } = useUpdateClinicalNote();
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

    const form = useForm<SoapFormData>({
        resolver: zodResolver(soapSchema),
        defaultValues: {
            practitioner_id: '',
            subjective: '',
            objective: '',
            assessment: '',
            plan: '',
        }
    });

    const handleEditNote = (note: any) => {
        setEditingNoteId(note.id);
        form.reset({
            practitioner_id: note.practitioner_id,
            subjective: note.subjective || '',
            objective: note.objective || '',
            assessment: note.assessment || '',
            plan: note.plan || '',
        });
        setIsDialogOpen(true);
    };

    const onSubmit = (data: SoapFormData) => {
        const payload = {
            practitioner_id: data.practitioner_id,
            subjective: data.subjective || null,
            objective: data.objective || null,
            assessment: data.assessment || null,
            plan: data.plan || null,
        };

        if (editingNoteId) {
            updateNote({
                id: editingNoteId,
                updates: payload
            }, {
                onSuccess: () => {
                    toast.success('Clinical note updated successfully');
                    setIsDialogOpen(false);
                    setEditingNoteId(null);
                    form.reset();
                },
                onError: (err) => {
                    toast.error('Failed to update note', { description: err.message });
                }
            });
        } else {
            createNote({
                patient_id: patientId,
                ...payload
            }, {
                onSuccess: () => {
                    toast.success('Clinical note added successfully');
                    setIsDialogOpen(false);
                    form.reset();
                },
                onError: (err) => {
                    toast.error('Failed to save note', { description: err.message });
                }
            });
        }
    };

    if (notesLoading) {
        return <div className="p-8 text-center text-sm text-muted-foreground">Loading records...</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-[14px] font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4" /> 
                        Clinical SOAP Notes
                    </h3>
                    <p className="text-[12px] text-muted-foreground mt-1">
                        Unified medical history and practitioner assessments
                    </p>
                </div>
                
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if(!open) {
                        form.reset();
                        setEditingNoteId(null);
                    }
                }}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="h-8 text-[12px]">
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            New Record
                        </Button>
                    </DialogTrigger>
                    
                    <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden flex flex-col max-h-[85vh]">
                        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
                            <DialogTitle className="text-[16px]">Create Clinical Note</DialogTitle>
                        </DialogHeader>
                        
                        <form id="soap-form" onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-4 space-y-5 overflow-y-auto">
                            <div className="space-y-2">
                                <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Author</label>
                                <Select 
                                    value={form.watch('practitioner_id')} 
                                    onValueChange={(val: any) => form.setValue('practitioner_id', val)}
                                    disabled={practLoading}
                                >
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Select practitioner..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {practitioners?.map(p => (
                                            <SelectItem key={p.id} value={p.id}>
                                                Dr. {p.first_name} {p.last_name} ({p.profession})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {form.formState.errors.practitioner_id && <p className="text-[11px] text-red-500">{form.formState.errors.practitioner_id.message}</p>}
                            </div>

                            <div className="space-y-4">
                                {form.formState.errors.subjective?.message === 'At least one SOAP section must be filled' && (
                                    <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-md text-[12px]">
                                        You must provide content in at least one SOAP section.
                                    </div>
                                )}
                                
                                <div className="space-y-2">
                                    <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider flex justify-between">
                                        <span>Subjective</span>
                                        <span className="text-[10px] normal-case opacity-60">Patient's complaints</span>
                                    </label>
                                    <Textarea 
                                        {...form.register('subjective')} 
                                        placeholder="What does the patient say?" 
                                        className="h-20 resize-none text-[13px]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider flex justify-between">
                                        <span>Objective</span>
                                        <span className="text-[10px] normal-case opacity-60">Observations & tests</span>
                                    </label>
                                    <Textarea 
                                        {...form.register('objective')} 
                                        placeholder="What are your findings?" 
                                        className="h-20 resize-none text-[13px]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider flex justify-between">
                                        <span>Assessment</span>
                                        <span className="text-[10px] normal-case opacity-60">Diagnosis / Clinical impression</span>
                                    </label>
                                    <Textarea 
                                        {...form.register('assessment')} 
                                        placeholder="Primary diagnosis or evaluation" 
                                        className="h-20 resize-none text-[13px]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider flex justify-between">
                                        <span>Plan</span>
                                        <span className="text-[10px] normal-case opacity-60">Treatment details</span>
                                    </label>
                                    <Textarea 
                                        {...form.register('plan')} 
                                        placeholder="Next steps, procedures, medications..." 
                                        className="h-20 resize-none text-[13px]"
                                    />
                                </div>
                            </div>
                        </form>
                        
                        <DialogFooter className="px-6 py-4 border-t bg-muted/10">
                            <Button variant="ghost" size="sm" onClick={() => setIsDialogOpen(false)} disabled={isCreating}>Cancel</Button>
                            <Button type="submit" form="soap-form" size="sm" disabled={isCreating}>
                                {isCreating ? 'Saving...' : 'Save Note'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Notes Feed */}
            {notes?.length === 0 ? (
                <div className="border border-dashed border-border rounded-lg p-12 text-center text-muted-foreground flex items-center justify-center h-[200px]">
                    <p className="text-[13px]">No clinical records found for this patient.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {notes?.map(note => {
                        const noteAgeMs = new Date().getTime() - new Date(note.created_at).getTime();
                        const isEditable = noteAgeMs < 24 * 60 * 60 * 1000;
                        const isEdited = note.updated_at && new Date(note.updated_at).getTime() > new Date(note.created_at).getTime();

                        return (
                        <Card key={note.id} className="shadow-none border-border">
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                            <UserCircle2 className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-semibold">
                                                Dr. {note.practitioner?.first_name} {note.practitioner?.last_name}
                                                {isEdited && <span className="text-[10px] text-muted-foreground ml-2">(Edited)</span>}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {format(new Date(note.created_at), 'PPP at p')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isEditable && (
                                            <Button 
                                                variant="outline" 
                                                size="icon" 
                                                className="h-7 w-7 text-muted-foreground hover:text-primary transition-colors duration-200 border-border bg-card shadow-sm" 
                                                onClick={() => handleEditNote(note)}
                                                title="Edit Note"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                        <Badge variant="outline" className="text-[10px] bg-muted/30">Clinical Record</Badge>
                                    </div>
                                </div>

                                <div className="text-[13px] space-y-4 pt-2">
                                    {note.subjective && (
                                        <div>
                                            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">Subjective</h4>
                                            <p className="whitespace-pre-wrap">{note.subjective}</p>
                                        </div>
                                    )}
                                    {note.objective && (
                                        <div>
                                            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">Objective</h4>
                                            <p className="whitespace-pre-wrap">{note.objective}</p>
                                        </div>
                                    )}
                                    {note.assessment && (
                                        <div>
                                            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">Assessment</h4>
                                            <p className="whitespace-pre-wrap">{note.assessment}</p>
                                        </div>
                                    )}
                                    {note.plan && (
                                        <div>
                                            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">Plan</h4>
                                            <p className="whitespace-pre-wrap">{note.plan}</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
