// Data hooks — dual-mode (Supabase or mock data)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import {
    MOCK_PATIENTS,
    MOCK_PRACTITIONERS,
    MOCK_ROOMS,
    MOCK_SERVICES,
    MOCK_APPOINTMENTS,
    MOCK_CALL_LOGS,
    MOCK_LOCATION,
} from '@/lib/mock-data'
import type { Patient, Practitioner, Room, Service, Appointment, CallLog } from '@/types'

// ─── PATIENTS ────────────────────────────────────

export function usePatients() {
    return useQuery({
        queryKey: ['patients'],
        queryFn: async (): Promise<Patient[]> => {
            if (!isSupabaseConfigured) return MOCK_PATIENTS
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
            if (!isSupabaseConfigured) {
                const newPatient = { ...patient, id: `p${Date.now()}`, created_at: new Date().toISOString() } as Patient
                MOCK_PATIENTS.unshift(newPatient)
                return newPatient
            }
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
            if (!isSupabaseConfigured) return MOCK_PRACTITIONERS
            const { data, error } = await supabase!.from('practitioners').select('*').eq('is_active', true)
            if (error) throw error
            return data
        },
    })
}

// ─── ROOMS ───────────────────────────────────────

export function useRooms() {
    return useQuery({
        queryKey: ['rooms'],
        queryFn: async (): Promise<Room[]> => {
            if (!isSupabaseConfigured) return MOCK_ROOMS
            const { data, error } = await supabase!.from('rooms').select('*')
            if (error) throw error
            return data
        },
    })
}

// ─── SERVICES ────────────────────────────────────

export function useServices() {
    return useQuery({
        queryKey: ['services'],
        queryFn: async (): Promise<Service[]> => {
            if (!isSupabaseConfigured) return MOCK_SERVICES
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
            if (!isSupabaseConfigured) return MOCK_APPOINTMENTS
            let query = supabase!
                .from('appointments')
                .select('*, patient:patients(*), practitioner:practitioners(*), service:services(*), room:rooms(*)')
                .order('start_time', { ascending: true })
            if (date) {
                query = query.gte('start_time', `${date}T00:00:00`).lte('start_time', `${date}T23:59:59`)
            }
            const { data, error } = await query
            if (error) throw error
            return data
        },
    })
}

export function useCreateAppointment() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async (apt: Partial<Appointment>) => {
            if (!isSupabaseConfigured) {
                const newApt = { ...apt, id: `a${Date.now()}`, created_at: new Date().toISOString() } as Appointment
                MOCK_APPOINTMENTS.push(newApt)
                return newApt
            }
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
            if (!isSupabaseConfigured) {
                const idx = MOCK_APPOINTMENTS.findIndex((a) => a.id === id)
                if (idx >= 0) Object.assign(MOCK_APPOINTMENTS[idx], updates)
                return MOCK_APPOINTMENTS[idx]
            }
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
            if (!isSupabaseConfigured) return MOCK_CALL_LOGS
            const { data, error } = await supabase!.from('call_logs').select('*').order('created_at', { ascending: false }).limit(20)
            if (error) throw error
            return data
        },
    })
}

// ─── LOCATION ────────────────────────────────────

export function useLocation() {
    return useQuery({
        queryKey: ['location'],
        queryFn: async () => {
            if (!isSupabaseConfigured) return MOCK_LOCATION
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
            if (!isSupabaseConfigured) {
                return {
                    totalPatients: MOCK_PATIENTS.length,
                    appointmentsToday: MOCK_APPOINTMENTS.length,
                    depositRate: 89,
                    aiCallsToday: MOCK_CALL_LOGS.length,
                    bookedFromCalls: MOCK_CALL_LOGS.filter((c) => c.appointment_id).length,
                    pendingDeposits: MOCK_APPOINTMENTS.filter((a) => a.status === 'pending_deposit').length,
                }
            }

            const today = new Date().toISOString().split('T')[0]

            const [patientsRes, appointmentsRes, callsRes] = await Promise.all([
                supabase!.from('patients').select('id', { count: 'exact', head: true }),
                supabase!.from('appointments').select('*').gte('start_time', `${today}T00:00:00`).lte('start_time', `${today}T23:59:59`),
                supabase!.from('call_logs').select('*').gte('created_at', `${today}T00:00:00`),
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
