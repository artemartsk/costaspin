// CostaSpine OS — Domain Types

export interface Location {
    id: string
    name: string
    address: string | null
    phone: string | null
    email: string | null
    google_maps_url: string | null
    google_review_url: string | null
    timezone: string
    is_active: boolean
    created_at: string
}

export interface Room {
    id: string
    location_id: string
    name: string
    type: 'chiropractic' | 'physiotherapy' | 'massage' | 'general'
    equipment: string[]
    capacity: number
    status: 'available' | 'occupied' | 'maintenance'
    created_at: string
}

export interface RoomMaintenanceLog {
    id: string
    room_id: string
    note: string
    reported_by: string
    resolved: boolean
    created_at: string
}

export interface RoomSupportedService {
    room_id: string
    service_id: string
    service?: Service
}

export interface Practitioner {
    id: string
    user_id: string | null
    first_name: string
    last_name: string
    email: string | null
    phone: string | null
    profession: string
    sub_specialties: string[]
    skill_tags: string[]
    avatar_url: string | null
    max_patients_per_day: number
    is_active: boolean
    created_at: string
}

export interface Patient {
    id: string
    first_name: string
    last_name: string
    email: string | null
    phone: string
    date_of_birth: string | null
    language: string
    marketing_consent: boolean
    medical_data_consent: boolean
    medical_consent_date: string | null
    data_processing_consent: boolean
    data_processing_consent_date: string | null
    privacy_policy_version: string | null
    consent_withdrawn_at: string | null
    anonymized_at: string | null
    source: 'phone' | 'ai_phone' | 'whatsapp' | 'web' | 'referral' | 'walk_in'
    visit_count: number
    forms_completed: boolean
    form_token?: string
    notes: string | null
    created_at: string
}

export type UserRole = 'admin' | 'practitioner' | 'receptionist'

export interface UserRoleRecord {
    user_id: string
    role: UserRole
    created_at: string
}

export interface AuditLogEntry {
    id: string
    user_id: string | null
    user_email: string | null
    action: 'view' | 'create' | 'update' | 'delete' | 'export' | 'login' | 'logout'
    table_name: string
    record_id: string | null
    old_data: Record<string, unknown> | null
    new_data: Record<string, unknown> | null
    ip_address: string | null
    created_at: string
}

export interface Service {
    id: string
    name: string
    category: string | null
    duration_minutes: number
    price: number
    deposit_amount: number
    room_type: string | null
    is_active: boolean
}

export type AppointmentStatus =
    | 'pending_deposit'
    | 'confirmed'
    | 'attended'
    | 'no_show'
    | 'cancelled'
    | 'rescheduled'

export type BookingSource = 'manual' | 'ai_phone' | 'whatsapp' | 'web' | 'walk_in'

export interface Appointment {
    id: string
    patient_id: string
    practitioner_id: string
    location_id: string
    room_id: string | null
    service_id: string
    start_time: string
    end_time: string
    status: AppointmentStatus
    booking_source: BookingSource
    deposit_paid: boolean
    stripe_session_id: string | null
    clinical_notes: string | null
    diagnosis: string | null
    treatment_plan: string | null
    triage_data: Record<string, unknown>
    recording_url?: string | null
    transcript?: string | null
    created_at: string
    // Joined relations for display
    patient?: Patient
    practitioner?: Practitioner
    service?: Service
    room?: Room
}

export interface Payment {
    id: string
    appointment_id: string | null
    patient_id: string
    amount: number
    type: 'deposit' | 'full' | 'refund'
    stripe_payment_id: string | null
    status: 'pending' | 'completed' | 'failed' | 'refunded'
    created_at: string
}

export interface CallLog {
    id: string
    vapi_call_id: string | null
    caller_phone: string | null
    patient_id: string | null
    direction: 'inbound' | 'outbound'
    duration_seconds: number | null
    triage_result: Record<string, unknown>
    matched_practitioner_id: string | null
    matched_service_id: string | null
    appointment_id: string | null
    transcript: string | null
    recording_url: string | null
    status: 'in_progress' | 'completed' | 'no_answer' | 'busy' | 'voicemail' | 'failed'
    created_at: string
}

export interface Reminder {
    id: string
    appointment_id: string
    type: '24h' | '6h' | 'post_visit' | 'review_request' | 'onboarding' | 'confirmation'
    channel: string
    message_sid: string | null
    status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
    sent_at: string | null
    created_at: string
}

export interface ClinicSettings {
    id: string
    location_id: string
    vapi_settings: Record<string, unknown>
    twilio_settings: Record<string, unknown>
    stripe_settings: Record<string, unknown>
}

// Booking engine types
export interface TimeSlot {
    start: Date
    end: Date
    practitioner_id: string
    room_id: string
}

export interface TriageResult {
    category: 'acute_injury' | 'chronic_pain' | 'sports_injury' | 'post_surgery' | 'relaxation'
    urgency: 'immediate' | 'soon' | 'routine'
    symptoms: string[]
    recommended_service_id: string | null
    matched_practitioner_id: string | null
}

export interface PractitionerScore {
    practitioner_id: string
    skill_score: number   // 0-1
    availability_score: number // 0-1
    gap_fill_score: number // 0-1
    total_score: number   // weighted
}
