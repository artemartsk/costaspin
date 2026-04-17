import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export type ActivityType = 'system' | 'appointment' | 'clinical_note' | 'call' | 'whatsapp';

export interface ActivityEvent {
    id: string;
    type: ActivityType;
    date: Date;
    title: string;
    description?: string;
    metadata?: Record<string, any>;
}

export function usePatientActivity(patientId: string) {
    return useQuery({
        queryKey: ['patient_activity', patientId],
        queryFn: async (): Promise<ActivityEvent[]> => {
            if (!isSupabaseConfigured) throw new Error('Supabase not configured');

            const [
                { data: patient },
                { data: appointments },
                { data: notes },
                { data: calls },
                { data: whatsapp }
            ] = await Promise.all([
                supabase!.from('patients').select('*').eq('id', patientId).single(),
                supabase!.from('appointments').select(`
                    *,
                    service:service_id (name)
                `).eq('patient_id', patientId).order('created_at', { ascending: false }).limit(50),
                supabase!.from('clinical_notes').select(`
                    *,
                    practitioner:practitioner_id (first_name, last_name)
                `).eq('patient_id', patientId).order('created_at', { ascending: false }).limit(50),
                supabase!.from('call_logs').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(50),
                supabase!.from('whatsapp_threads').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(50),
            ]);

            const events: ActivityEvent[] = [];

            // 1. Patient Creation (System)
            if (patient) {
                events.push({
                    id: `sys-${patient.id}`,
                    type: 'system',
                    date: new Date(patient.created_at),
                    title: 'Patient Profile Created',
                    description: `Source: ${patient.source || 'Manual'}`
                });
                
                if (patient.forms_completed && patient.form_token) {
                    // Approximate form completion date if not explicit. We'll just put it 5 mins after creation for demo
                    events.push({
                        id: `sys-form-${patient.id}`,
                        type: 'system',
                        date: new Date(new Date(patient.created_at).getTime() + 5 * 60000),
                        title: 'Intake Forms Completed',
                    });
                }
            }

            // 2. Appointments
            if (appointments) {
                appointments.forEach(apt => {
                    const isUpcoming = new Date(apt.start_time) > new Date();

                    events.push({
                        id: `apt-${apt.id}`,
                        type: 'appointment',
                        date: new Date(apt.start_time),
                        title: isUpcoming ? `Upcoming Visit` : `Past Visit`,
                        description: apt.service?.name || `Status: ${apt.status}`,
                        metadata: { status: apt.status, start_time: apt.start_time }
                    });
                });
            }

            // 3. Clinical Notes
            if (notes) {
                notes.forEach(note => {
                    events.push({
                        id: `note-${note.id}`,
                        type: 'clinical_note',
                        date: new Date(note.created_at),
                        title: `Clinical Note Added`,
                        description: note.practitioner ? `By Dr. ${note.practitioner.first_name || ''} ${note.practitioner.last_name || ''}` : '',
                        metadata: { assessment: note.assessment }
                    });
                });
            }

            // 4. Calls
            if (calls) {
                calls.forEach(call => {
                    events.push({
                        id: `call-${call.id}`,
                        type: 'call',
                        date: new Date(call.created_at),
                        title: `AI Phone Call (${call.direction})`,
                        description: call.status === 'completed' && call.duration_seconds 
                            ? `${Math.round(call.duration_seconds/60)} min duration`
                            : call.status,
                        metadata: { recording_url: call.recording_url, raw_data: call }
                    });
                });
            }

            // 5. WhatsApp
            if (whatsapp) {
                whatsapp.forEach(thread => {
                    events.push({
                        id: `wa-${thread.id}`,
                        type: 'whatsapp',
                        date: new Date(thread.created_at),
                        title: `WhatsApp Thread Started`,
                        description: thread.status,
                        metadata: { raw_data: thread }
                    });
                });
            }

            // Sort DESC
            return events.sort((a, b) => b.date.getTime() - a.date.getTime());
        },
        enabled: !!patientId,
    });
}
