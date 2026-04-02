// Data hooks — Strict Supabase mode

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Patient, Practitioner, Room, RoomMaintenanceLog, Service, Appointment, CallLog, Location } from '@/types'

// ─── FAIL FAST ───────────────────────────────────

function assertSupabase() {
    if (!isSupabaseConfigured) {
        throw new Error('Supabase is not configured. Active database connection required.')
    }
}

// ─── PATIENTS ────────────────────────────────────

export function usePatients() {
    return useQuery({
        queryKey: ['patients'],
        queryFn: async (): Promise<Patient[]> => {
            assertSupabase()
            const { data, error } = await supabase!.from('patients').select('*').order('created_at', { ascending: false })
            if (error) throw error
            return data
        },
    })
}

export function useCreatePatient() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async (patient: Partial<Patient>) => {
            assertSupabase()
            const { data, error } = await supabase!.from('patients').insert(patient).select().single()
            if (error) throw error
            return data
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
    })
}

// ─── PRACTITIONERS ───────────────────────────────

export function usePractitioners() {
    return useQuery({
        queryKey: ['practitioners'],
        queryFn: async (): Promise<Practitioner[]> => {
            assertSupabase()
            const { data, error } = await supabase!.from('practitioners').select('*').eq('is_active', true)
            if (error) throw error
            return data
        },
    })
}

export function useUpdatePractitioner() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Practitioner> & { id: string }) => {
            assertSupabase()
            const { data, error } = await supabase!.from('practitioners').update(updates).eq('id', id).select().single()
            if (error) throw error
            return data
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['practitioners'] }),
    })
}

export function useCreatePractitionerAccount() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async (params: {
            email: string
            password?: string
            first_name: string
            last_name: string
            profession: string
            phone?: string
            sub_specialties?: string[]
            skill_tags?: string[]
            max_patients_per_day?: number
        }) => {
            assertSupabase()
            const { data: { session } } = await supabase!.auth.getSession()
            const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-practitioner`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${session?.access_token}`,
                    },
                    body: JSON.stringify(params),
                }
            )
            const result = await res.json()
            if (!res.ok) throw new Error(result.error || 'Failed to create practitioner')
            return result
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['practitioners'] }),
    })
}

// ─── ROOMS ───────────────────────────────────────

export function useRooms() {
    return useQuery({
        queryKey: ['rooms'],
        queryFn: async (): Promise<Room[]> => {
            assertSupabase()
            const { data, error } = await supabase!.from('rooms').select('*')
            if (error) throw error
            return data
        },
    })
}

// ─── ROOM DETAIL ─────────────────────────────────

export function useRoom(id: string | undefined) {
    const { data: rooms } = useRooms()
    return useQuery({
        queryKey: ['room', id],
        enabled: !!id,
        queryFn: async (): Promise<Room | null> => {
            assertSupabase()
            const { data, error } = await supabase!.from('rooms').select('*').eq('id', id!).single()
            if (error) return null
            return data
        },
        initialData: () => rooms?.find(r => r.id === id) ?? undefined,
    })
}

export function useRoomAppointments(roomId: string | undefined, range: 'today' | 'past' = 'today') {
    return useQuery({
        queryKey: ['room-appointments', roomId, range],
        enabled: !!roomId,
        queryFn: async (): Promise<Appointment[]> => {
            assertSupabase()
            const today = new Date().toISOString().split('T')[0]
            let query = supabase!
                .from('appointments')
                .select('*, patient:patients(*), practitioner:practitioners(*), service:services(*)')
                .eq('room_id', roomId!)
                .order('start_time', { ascending: range === 'today' })

            if (range === 'today') {
                query = query.gte('start_time', `${today}T00:00:00`).lte('start_time', `${today}T23:59:59`)
            } else {
                query = query.lt('start_time', `${today}T00:00:00`).limit(20)
            }

            const { data, error } = await query
            if (error) throw error
            return data
        },
    })
}

export function useRoomMaintenanceLogs(roomId: string | undefined) {
    return useQuery({
        queryKey: ['room-maintenance', roomId],
        enabled: !!roomId,
        queryFn: async (): Promise<RoomMaintenanceLog[]> => {
            assertSupabase()
            const { data, error } = await supabase!
                .from('room_maintenance_logs')
                .select('*')
                .eq('room_id', roomId!)
                .order('created_at', { ascending: false })
                .limit(20)
            if (error) throw error
            return data
        },
    })
}

export function useRoomSupportedServices(roomId: string | undefined) {
    return useQuery({
        queryKey: ['room-services', roomId],
        enabled: !!roomId,
        queryFn: async (): Promise<Service[]> => {
            assertSupabase()
            const { data, error } = await supabase!
                .from('room_supported_services')
                .select('service:services(*)')
                .eq('room_id', roomId!)
            if (error) throw error
            return (data || []).map((d: any) => d.service).filter(Boolean)
        },
    })
}

export function useUpdateRoomStatus() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: Room['status'] }) => {
            assertSupabase()
            const { data, error } = await supabase!.from('rooms').update({ status }).eq('id', id).select().single()
            if (error) throw error
            return data
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['rooms'] })
            qc.invalidateQueries({ queryKey: ['room'] })
        },
    })
}

export function useAddMaintenanceLog() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async (log: { room_id: string; note: string; reported_by: string }) => {
            assertSupabase()
            const { data, error } = await supabase!.from('room_maintenance_logs').insert(log).select().single()
            if (error) throw error
            return data
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['room-maintenance'] }),
    })
}

// ─── SERVICES ────────────────────────────────────

export function useServices() {
    return useQuery({
        queryKey: ['services'],
        queryFn: async (): Promise<Service[]> => {
            assertSupabase()
            const { data, error } = await supabase!.from('services').select('*').eq('is_active', true)
            if (error) throw error
            return data
        },
    })
}

// ─── APPOINTMENTS ────────────────────────────────

export function useAppointments(date?: string) {
    return useQuery({
        queryKey: ['appointments', date],
        queryFn: async (): Promise<Appointment[]> => {
            assertSupabase()
            let query = supabase!
                .from('appointments')
                .select('*, patient:patients(*), practitioner:practitioners(*), service:services(*), room:rooms(*), call_logs(recording_url, transcript, triage_result)')
                .order('start_time', { ascending: true })
            if (date) {
                query = query.gte('start_time', `${date}T00:00:00`).lte('start_time', `${date}T23:59:59`)
            }
            const { data, error } = await query
            if (error) throw error
            
            return data.map((apt: any) => {
                const callLog = apt.call_logs?.[0];
                const hasTriageData = apt.triage_data && Object.keys(apt.triage_data).length > 0;
                
                return {
                    ...apt,
                    triage_data: hasTriageData ? apt.triage_data : (callLog?.triage_result || {}),
                    recording_url: callLog?.recording_url || null,
                    transcript: callLog?.transcript || null,
                };
            })
        },
    })
}

export function useCreateAppointment() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async (apt: Partial<Appointment>) => {
            assertSupabase()
            const { data, error } = await supabase!.from('appointments').insert(apt).select().single()
            if (error) throw error
            return data
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
    })
}

export function useUpdateAppointment() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Appointment> & { id: string }) => {
            assertSupabase()
            const { data, error } = await supabase!.from('appointments').update(updates).eq('id', id).select().single()
            if (error) throw error
            return data
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
    })
}

// ─── CALL LOGS ───────────────────────────────────

export function useCallLogs() {
    return useQuery({
        queryKey: ['call_logs'],
        queryFn: async (): Promise<CallLog[]> => {
            assertSupabase()
            const { data, error } = await supabase!.from('call_logs').select('*').order('created_at', { ascending: false }).limit(20)
            if (error) throw error
            return data
        },
    })
}

// ─── LOCATION ────────────────────────────────────

export function useLocations() {
    return useQuery({
        queryKey: ['locations'],
        queryFn: async (): Promise<Location[]> => {
            assertSupabase()
            const { data, error } = await supabase!.from('locations').select('*').eq('is_active', true)
            if (error) throw error
            return data
        },
    })
}

export function useLocation() {
    return useQuery({
        queryKey: ['location'],
        queryFn: async (): Promise<Location> => {
            assertSupabase()
            const { data, error } = await supabase!.from('locations').select('*').eq('is_active', true).single()
            if (error) throw error
            return data
        },
    })
}

// ─── DASHBOARD STATS ─────────────────────────────

export function useDashboardStats() {
    return useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            assertSupabase()
            const today = new Date().toISOString().split('T')[0]

            const [patientsRes, appointmentsRes, callsRes] = await Promise.all([
                supabase!.from('patients').select('id', { count: 'exact', head: true }),
                supabase!.from('appointments').select('*').gte('start_time', `${today}T00:00:00`).lte('start_time', `${today}T23:59:59`),
                supabase!.from('call_logs').select('*').gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
            ])

            const appointments = appointmentsRes.data || []
            const calls = callsRes.data || []

            return {
                totalPatients: patientsRes.count || 0,
                appointmentsToday: appointments.length,
                depositRate: appointments.length
                    ? Math.round((appointments.filter((a: Appointment) => a.deposit_paid).length / appointments.length) * 100)
                    : 0,
                aiCallsToday: calls.length,
                bookedFromCalls: calls.filter((c: CallLog) => c.appointment_id).length,
                pendingDeposits: appointments.filter((a: Appointment) => a.status === 'pending_deposit').length,
            }
        },
    })
}

// ─── PRACTITIONER SCHEDULE ───────────────────────

export interface PractScheduleEntry {
    id?: string
    practitioner_id: string
    location_id: string
    day_of_week: number
    start_time: string
    end_time: string
}

export function useCurrentPractitioner(userId: string | undefined) {
    return useQuery({
        queryKey: ['current-practitioner', userId],
        enabled: !!userId,
        queryFn: async (): Promise<Practitioner | null> => {
            assertSupabase()
            const { data, error } = await supabase!.from('practitioners').select('*').eq('user_id', userId!).single()
            if (error) return null
            return data
        },
    })
}

export function usePractitionerSchedules(practitionerId: string | undefined) {
    return useQuery({
        queryKey: ['practitioner-schedules', practitionerId],
        enabled: !!practitionerId,
        queryFn: async (): Promise<PractScheduleEntry[]> => {
            assertSupabase()
            const { data, error } = await supabase!
                .from('practitioner_schedules')
                .select('*')
                .eq('practitioner_id', practitionerId!)
                .order('day_of_week', { ascending: true })
            if (error) throw error
            return data
        },
    })
}

export function useAllPractitionerSchedules() {
    return useQuery({
        queryKey: ['practitioner-schedules', 'all'],
        queryFn: async (): Promise<PractScheduleEntry[]> => {
            assertSupabase()
            const { data, error } = await supabase!
                .from('practitioner_schedules')
                .select('*')
                .order('day_of_week', { ascending: true })
            if (error) throw error
            return data
        },
    })
}

export function useUpsertSchedule() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async (entry: PractScheduleEntry) => {
            assertSupabase()
            // Try update by practitioner + day, else insert
            const { data: existing } = await supabase!
                .from('practitioner_schedules')
                .select('id')
                .eq('practitioner_id', entry.practitioner_id)
                .eq('day_of_week', entry.day_of_week)
                .eq('location_id', entry.location_id)
                .single()
            if (existing) {
                const { data, error } = await supabase!
                    .from('practitioner_schedules')
                    .update({ start_time: entry.start_time, end_time: entry.end_time })
                    .eq('id', existing.id)
                    .select()
                    .single()
                if (error) throw error
                return data
            } else {
                const { data, error } = await supabase!
                    .from('practitioner_schedules')
                    .insert(entry)
                    .select()
                    .single()
                if (error) throw error
                return data
            }
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['practitioner-schedules'] }),
    })
}

export function useDeleteSchedule() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async ({ practitionerId, dayOfWeek, locationId }: { practitionerId: string; dayOfWeek: number; locationId: string }) => {
            assertSupabase()
            const { error } = await supabase!
                .from('practitioner_schedules')
                .delete()
                .eq('practitioner_id', practitionerId)
                .eq('day_of_week', dayOfWeek)
                .eq('location_id', locationId)
            if (error) throw error
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['practitioner-schedules'] }),
    })
}

// ─── PRACTITIONER DETAIL ──────────────────────────

export function usePractitioner(id: string | undefined) {
    return useQuery({
        queryKey: ['practitioner', id],
        enabled: !!id,
        queryFn: async (): Promise<Practitioner | null> => {
            assertSupabase()
            const { data, error } = await supabase!.from('practitioners').select('*').eq('id', id!).single()
            if (error) throw error
            return data
        },
    })
}

export function usePractitionerAppointments(practitionerId: string | undefined, range: 'today' | 'past') {
    const today = new Date().toISOString().split('T')[0]
    return useQuery({
        queryKey: ['practitioner-appointments', practitionerId, range],
        enabled: !!practitionerId,
        queryFn: async (): Promise<Appointment[]> => {
            assertSupabase()
            let query = supabase!.from('appointments')
                .select('*, patient:patients(*), service:services(*), room:rooms(*), practitioner:practitioners(*)')
                .eq('practitioner_id', practitionerId!)
            if (range === 'today') {
                query = query.gte('start_time', `${today}T00:00:00`).lte('start_time', `${today}T23:59:59`).order('start_time', { ascending: true })
            } else {
                query = query.lt('start_time', `${today}T00:00:00`).order('start_time', { ascending: false }).limit(30)
            }
            const { data, error } = await query
            if (error) throw error
            return data
        },
    })
}

interface PractitionerLocation {
    id: string
    name: string
    address: string
}

export function usePractitionerLocations(practitionerId: string | undefined) {
    return useQuery({
        queryKey: ['practitioner-locations', practitionerId],
        enabled: !!practitionerId,
        queryFn: async (): Promise<PractitionerLocation[]> => {
            assertSupabase()
            const { data, error } = await supabase!
                .from('practitioner_locations')
                .select('location:locations(id, name, address)')
                .eq('practitioner_id', practitionerId!)
            if (error) throw error
            return (data || []).map((d: any) => d.location).filter(Boolean)
        },
    })
}

export function usePractitionerServices(practitionerId: string | undefined) {
    return useQuery({
        queryKey: ['practitioner-services', practitionerId],
        enabled: !!practitionerId,
        queryFn: async (): Promise<Service[]> => {
            assertSupabase()
            const { data, error } = await supabase!.from('services').select('*')
            if (error) throw error
            return data
        },
    })
}
