// Mock data registry — used when Supabase is not configured
// Provides realistic demo data matching the seed SQL

import type {
    Location, Room, Practitioner, Patient, Service,
    Appointment, CallLog, Payment, Reminder
} from '@/types'

export const MOCK_LOCATION: Location = {
    id: '10000000-0000-0000-0000-000000000001',
    name: 'CostaSpine Elviria',
    address: 'Urb. Elviria, Marbella 29604, Spain',
    phone: '+34 952 123 456',
    email: 'elviria@costaspine.com',
    google_maps_url: 'https://maps.google.com/?q=CostaSpine+Elviria',
    google_review_url: 'https://g.page/costaspine-elviria',
    timezone: 'Europe/Madrid',
    is_active: true,
    created_at: new Date().toISOString(),
}

export const MOCK_ROOMS: Room[] = [
    { id: '20000000-0000-0000-0000-000000000001', location_id: MOCK_LOCATION.id, name: 'Room 1', type: 'chiropractic', equipment: ['Adjustment table', 'Decompression unit'], status: 'available', created_at: new Date().toISOString() },
    { id: '20000000-0000-0000-0000-000000000002', location_id: MOCK_LOCATION.id, name: 'Room 2', type: 'massage', equipment: ['Massage table', 'Hot stones kit', 'Aromatherapy'], status: 'occupied', created_at: new Date().toISOString() },
    { id: '20000000-0000-0000-0000-000000000003', location_id: MOCK_LOCATION.id, name: 'Physio Suite', type: 'physiotherapy', equipment: ['Ultrasound', 'TENS', 'Exercise area', 'Resistance bands'], status: 'occupied', created_at: new Date().toISOString() },
]

export const MOCK_PRACTITIONERS: Practitioner[] = [
    { id: '30000000-0000-0000-0000-000000000001', user_id: null, first_name: 'James', last_name: 'Wilson', email: 'james.wilson@costaspine.com', phone: null, profession: 'Chiropractor', sub_specialties: ['Sports injury', 'Pediatric'], skill_tags: ['acute_injury', 'chronic_pain', 'sports_injury'], avatar_url: null, max_patients_per_day: 14, is_active: true, created_at: new Date().toISOString() },
    { id: '30000000-0000-0000-0000-000000000002', user_id: null, first_name: 'Sarah', last_name: 'Chen', email: 'sarah.chen@costaspine.com', phone: null, profession: 'Physiotherapist', sub_specialties: ['Post-surgery rehab', 'Neurological'], skill_tags: ['post_surgery', 'chronic_pain', 'rehab'], avatar_url: null, max_patients_per_day: 10, is_active: true, created_at: new Date().toISOString() },
    { id: '30000000-0000-0000-0000-000000000003', user_id: null, first_name: 'Mark', last_name: 'Thompson', email: 'mark.thompson@costaspine.com', phone: null, profession: 'Massage Therapist', sub_specialties: ['Deep tissue', 'Sports massage'], skill_tags: ['relaxation', 'sports_injury', 'chronic_pain'], avatar_url: null, max_patients_per_day: 12, is_active: true, created_at: new Date().toISOString() },
]

export const MOCK_SERVICES: Service[] = [
    { id: '40000000-0000-0000-0000-000000000001', name: 'Initial Consultation', category: 'assessment', duration_minutes: 60, price: 120, deposit_amount: 30, room_type: 'chiropractic', is_active: true },
    { id: '40000000-0000-0000-0000-000000000002', name: 'Chiropractic Adjustment', category: 'chiropractic', duration_minutes: 30, price: 75, deposit_amount: 20, room_type: 'chiropractic', is_active: true },
    { id: '40000000-0000-0000-0000-000000000003', name: 'Physiotherapy Session', category: 'physiotherapy', duration_minutes: 45, price: 85, deposit_amount: 20, room_type: 'physiotherapy', is_active: true },
    { id: '40000000-0000-0000-0000-000000000004', name: 'Sports Massage', category: 'massage', duration_minutes: 60, price: 70, deposit_amount: 15, room_type: 'massage', is_active: true },
    { id: '40000000-0000-0000-0000-000000000005', name: 'Deep Tissue Massage', category: 'massage', duration_minutes: 45, price: 65, deposit_amount: 15, room_type: 'massage', is_active: true },
    { id: '40000000-0000-0000-0000-000000000006', name: 'Post-Surgery Rehab', category: 'physiotherapy', duration_minutes: 60, price: 95, deposit_amount: 25, room_type: 'physiotherapy', is_active: true },
]

export const MOCK_PATIENTS: Patient[] = [
    { id: 'p1', first_name: 'Maria', last_name: 'García', phone: '+34 612 345 678', email: 'maria@email.com', date_of_birth: '1985-03-15', language: 'es', marketing_consent: true, source: 'phone', visit_count: 8, forms_completed: true, notes: null, created_at: '2025-11-01T10:00:00Z' },
    { id: 'p2', first_name: 'John', last_name: 'Smith', phone: '+44 7700 900123', email: 'john.s@email.com', date_of_birth: '1978-07-22', language: 'en', marketing_consent: true, source: 'whatsapp', visit_count: 3, forms_completed: true, notes: null, created_at: '2026-01-15T09:00:00Z' },
    { id: 'p3', first_name: 'Ana', last_name: 'López', phone: '+34 655 432 100', email: 'ana.lopez@email.com', date_of_birth: '1990-11-08', language: 'es', marketing_consent: false, source: 'ai_phone', visit_count: 1, forms_completed: false, notes: 'Acute lower back pain, referred by AI call', created_at: '2026-03-01T08:42:00Z' },
    { id: 'p4', first_name: 'David', last_name: 'Brown', phone: '+44 7911 123456', email: 'david.b@email.com', date_of_birth: '1965-02-28', language: 'en', marketing_consent: true, source: 'referral', visit_count: 12, forms_completed: true, notes: 'Chronic shoulder pain, regular patient', created_at: '2025-09-10T14:00:00Z' },
    { id: 'p5', first_name: 'Elena', last_name: 'Petrova', phone: '+34 699 111 222', email: 'elena.p@email.com', date_of_birth: '1982-09-14', language: 'en', marketing_consent: true, source: 'web', visit_count: 5, forms_completed: true, notes: null, created_at: '2025-12-20T11:00:00Z' },
    { id: 'p6', first_name: 'Carlos', last_name: 'Rivera', phone: '+34 622 333 444', email: null, date_of_birth: null, language: 'es', marketing_consent: false, source: 'ai_phone', visit_count: 0, forms_completed: false, notes: 'New lead from AI call — sports injury', created_at: '2026-03-02T07:30:00Z' },
    { id: 'p7', first_name: 'Sophie', last_name: 'Martin', phone: '+33 6 12 34 56 78', email: 'sophie.m@email.com', date_of_birth: '1995-06-20', language: 'en', marketing_consent: true, source: 'phone', visit_count: 2, forms_completed: true, notes: null, created_at: '2026-02-10T16:00:00Z' },
    { id: 'p8', first_name: 'Tom', last_name: 'Baker', phone: '+44 7700 900456', email: 'tom.baker@email.com', date_of_birth: '1972-12-03', language: 'en', marketing_consent: true, source: 'referral', visit_count: 15, forms_completed: true, notes: 'Long-term rehab patient, post knee surgery', created_at: '2025-06-01T10:00:00Z' },
]

// Generate today's appointments
function todayAt(hour: number, minute = 0): string {
    const d = new Date()
    d.setHours(hour, minute, 0, 0)
    return d.toISOString()
}

function todayAtEnd(hour: number, durationMin: number): string {
    const d = new Date()
    d.setHours(hour, durationMin, 0, 0)
    return d.toISOString()
}

export const MOCK_APPOINTMENTS: Appointment[] = [
    { id: 'a1', patient_id: 'p1', practitioner_id: '30000000-0000-0000-0000-000000000001', location_id: MOCK_LOCATION.id, room_id: '20000000-0000-0000-0000-000000000001', service_id: '40000000-0000-0000-0000-000000000002', start_time: todayAt(9), end_time: todayAtEnd(9, 30), status: 'confirmed', booking_source: 'phone', deposit_paid: true, stripe_session_id: null, clinical_notes: null, triage_data: {}, created_at: '2026-02-28T10:00:00Z' },
    { id: 'a2', patient_id: 'p2', practitioner_id: '30000000-0000-0000-0000-000000000002', location_id: MOCK_LOCATION.id, room_id: '20000000-0000-0000-0000-000000000003', service_id: '40000000-0000-0000-0000-000000000003', start_time: todayAt(9, 45), end_time: todayAtEnd(10, 30), status: 'confirmed', booking_source: 'whatsapp', deposit_paid: true, stripe_session_id: null, clinical_notes: null, triage_data: {}, created_at: '2026-02-27T14:00:00Z' },
    { id: 'a3', patient_id: 'p3', practitioner_id: '30000000-0000-0000-0000-000000000003', location_id: MOCK_LOCATION.id, room_id: '20000000-0000-0000-0000-000000000002', service_id: '40000000-0000-0000-0000-000000000004', start_time: todayAt(10, 30), end_time: todayAtEnd(11, 30), status: 'pending_deposit', booking_source: 'ai_phone', deposit_paid: false, stripe_session_id: null, clinical_notes: null, triage_data: { symptoms: ['lower back pain'], urgency: 'soon' }, created_at: '2026-03-01T08:45:00Z' },
    { id: 'a4', patient_id: 'p4', practitioner_id: '30000000-0000-0000-0000-000000000002', location_id: MOCK_LOCATION.id, room_id: '20000000-0000-0000-0000-000000000003', service_id: '40000000-0000-0000-0000-000000000006', start_time: todayAt(11, 15), end_time: todayAtEnd(12, 15), status: 'confirmed', booking_source: 'phone', deposit_paid: true, stripe_session_id: null, clinical_notes: null, triage_data: {}, created_at: '2026-02-25T09:00:00Z' },
    { id: 'a5', patient_id: 'p5', practitioner_id: '30000000-0000-0000-0000-000000000001', location_id: MOCK_LOCATION.id, room_id: '20000000-0000-0000-0000-000000000001', service_id: '40000000-0000-0000-0000-000000000001', start_time: todayAt(12), end_time: todayAtEnd(13, 0), status: 'attended', booking_source: 'web', deposit_paid: true, stripe_session_id: null, clinical_notes: 'Cervical adjustment performed', triage_data: {}, created_at: '2026-02-20T11:00:00Z' },
    { id: 'a6', patient_id: 'p7', practitioner_id: '30000000-0000-0000-0000-000000000003', location_id: MOCK_LOCATION.id, room_id: '20000000-0000-0000-0000-000000000002', service_id: '40000000-0000-0000-0000-000000000005', start_time: todayAt(14), end_time: todayAtEnd(14, 45), status: 'confirmed', booking_source: 'phone', deposit_paid: true, stripe_session_id: null, clinical_notes: null, triage_data: {}, created_at: '2026-02-28T16:00:00Z' },
    { id: 'a7', patient_id: 'p8', practitioner_id: '30000000-0000-0000-0000-000000000002', location_id: MOCK_LOCATION.id, room_id: '20000000-0000-0000-0000-000000000003', service_id: '40000000-0000-0000-0000-000000000003', start_time: todayAt(14, 45), end_time: todayAtEnd(15, 30), status: 'pending_deposit', booking_source: 'whatsapp', deposit_paid: false, stripe_session_id: null, clinical_notes: null, triage_data: {}, created_at: '2026-03-01T10:00:00Z' },
    { id: 'a8', patient_id: 'p6', practitioner_id: '30000000-0000-0000-0000-000000000001', location_id: MOCK_LOCATION.id, room_id: '20000000-0000-0000-0000-000000000001', service_id: '40000000-0000-0000-0000-000000000001', start_time: todayAt(15, 30), end_time: todayAtEnd(16, 30), status: 'pending_deposit', booking_source: 'ai_phone', deposit_paid: false, stripe_session_id: null, clinical_notes: null, triage_data: { symptoms: ['knee pain', 'swelling'], urgency: 'soon', category: 'sports_injury' }, created_at: '2026-03-02T07:35:00Z' },
]

export const MOCK_CALL_LOGS: CallLog[] = [
    { id: 'cl1', vapi_call_id: 'vapi_001', caller_phone: '+34 612 345 678', patient_id: 'p1', direction: 'inbound', duration_seconds: 204, triage_result: { category: 'chronic_pain', urgency: 'routine' }, matched_practitioner_id: '30000000-0000-0000-0000-000000000001', matched_service_id: '40000000-0000-0000-0000-000000000002', appointment_id: 'a1', transcript: null, status: 'completed', created_at: '2026-03-02T08:42:00Z' },
    { id: 'cl2', vapi_call_id: 'vapi_002', caller_phone: '+44 7700 900123', patient_id: 'p2', direction: 'inbound', duration_seconds: 251, triage_result: { category: 'post_surgery', urgency: 'routine' }, matched_practitioner_id: '30000000-0000-0000-0000-000000000002', matched_service_id: '40000000-0000-0000-0000-000000000003', appointment_id: 'a2', transcript: null, status: 'completed', created_at: '2026-03-02T08:15:00Z' },
    { id: 'cl3', vapi_call_id: 'vapi_003', caller_phone: '+34 655 432 100', patient_id: 'p3', direction: 'inbound', duration_seconds: 128, triage_result: { category: 'acute_injury', urgency: 'soon' }, matched_practitioner_id: null, matched_service_id: null, appointment_id: null, transcript: null, status: 'completed', created_at: '2026-03-02T07:58:00Z' },
    { id: 'cl4', vapi_call_id: 'vapi_004', caller_phone: '+34 699 111 222', patient_id: null, direction: 'inbound', duration_seconds: 0, triage_result: {}, matched_practitioner_id: null, matched_service_id: null, appointment_id: null, transcript: null, status: 'no_answer', created_at: '2026-03-02T07:30:00Z' },
]
