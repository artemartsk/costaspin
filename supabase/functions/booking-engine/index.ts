// CostaSpine — Tetris Booking Engine API
// Supabase Edge Function: booking-engine
//
// Full-featured availability + booking API:
//   GET  ?action=availability   — find available slots
//   POST ?action=book           — create a booking
//
// Features:
//   - 15-min slot granularity
//   - Practitioner skill matching (60% weight)
//   - Load balancing (40% weight)
//   - Room type allocation (chiro/physio/massage)
//   - Multi-day search (up to 14 days)
//   - Collision-safe booking with double-check

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── TYPES ──────────────────────────────────────

interface SlotResult {
    date: string
    time: string
    end_time: string
    practitioner_id: string
    practitioner_name: string
    room_id: string
    room_name: string
    score: number
    duration_minutes: number
}

interface BookingRequest {
    patient_id?: string
    patient_name?: string
    patient_phone?: string
    service_id: string
    practitioner_id: string
    room_id: string
    date: string
    time: string
    location_id?: string
    booking_source?: string
}

// ─── SKILL MATCHING ─────────────────────────────

const CATEGORY_SKILL_MAP: Record<string, string[]> = {
    acute_injury: ['acute_injury', 'sports_injury'],
    chronic_pain: ['chronic_pain'],
    sports_injury: ['sports_injury', 'relaxation'],
    post_surgery: ['post_surgery', 'rehab'],
    relaxation: ['relaxation'],
}

const SERVICE_CATEGORY_MAP: Record<string, string> = {
    'Chiropractic': 'chronic_pain',
    'Chiropractic Adjustment': 'chronic_pain',
    'Initial Consultation': 'chronic_pain',
    'Physiotherapy': 'post_surgery',
    'Physiotherapy Session': 'post_surgery',
    'Sports Massage': 'sports_injury',
    'Deep Tissue Massage': 'relaxation',
    'Post-Surgery Rehab': 'post_surgery',
    'Relaxation Massage': 'relaxation',
}

const PROFESSION_ROOM_MAP: Record<string, string> = {
    'Chiropractor': 'chiropractic',
    'Physiotherapist': 'physiotherapy',
    'Massage Therapist': 'massage',
}

// ─── HELPERS ────────────────────────────────────

function isSameDay(a: string, b: string): boolean {
    return a.slice(0, 10) === b.slice(0, 10)
}

function timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + (m || 0)
}

function minutesToTime(mins: number): string {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function overlaps(
    aStart: string, aEnd: string,
    bStart: string, bEnd: string,
): boolean {
    return aStart < bEnd && aEnd > bStart
}

// ─── CORE: FIND AVAILABLE SLOTS ─────────────────

async function findAvailableSlots(
    supabase: any,
    params: {
        date: string
        location_id?: string
        service_id?: string
        service_category?: string
        practitioner_id?: string
        days?: number
        max_slots?: number
    },
): Promise<{ slots: SlotResult[]; service: any; location: any }> {

    const {
        date,
        location_id,
        service_id,
        service_category,
        practitioner_id,
        days = 1,
        max_slots = 20,
    } = params

    // 1. Resolve service
    let service: any = null
    let durationMin = 30
    let roomType = 'general'
    let category = service_category || ''

    if (service_id) {
        const { data } = await supabase.from('services').select('*').eq('id', service_id).single()
        service = data
        if (service) {
            durationMin = service.duration_minutes || 30
            roomType = service.room_type || 'general'
            category = SERVICE_CATEGORY_MAP[service.name] || service.category || ''
        }
    }

    const requiredSkills = CATEGORY_SKILL_MAP[category] || []

    // 2. Resolve location
    let locationId = location_id
    let location: any = null
    if (!locationId) {
        const { data } = await supabase.from('locations').select('*').eq('is_active', true).limit(1).single()
        location = data
        locationId = data?.id
    } else {
        const { data } = await supabase.from('locations').select('*').eq('id', locationId).single()
        location = data
    }
    if (!locationId) return { slots: [], service, location }

    // 3. Load practitioners with schedules
    let practQuery = supabase
        .from('practitioner_schedules')
        .select('*, practitioner:practitioners(*)')
        .eq('practitioner.is_active', true)

    if (practitioner_id) {
        practQuery = practQuery.eq('practitioner_id', practitioner_id)
    }

    const { data: allSchedules } = await practQuery

    // 4. Load rooms at this location
    const { data: rooms } = await supabase
        .from('rooms')
        .select('*')
        .eq('location_id', locationId)
        .neq('status', 'maintenance')

    // 5. Multi-day slot search
    const allSlots: SlotResult[] = []
    const searchDays = Math.min(days, 14)

    for (let d = 0; d < searchDays && allSlots.length < max_slots; d++) {
        const currentDate = new Date(date)
        currentDate.setDate(currentDate.getDate() + d)
        const dateStr = currentDate.toISOString().split('T')[0]
        const dayOfWeek = currentDate.getDay() // 0=Sun

        // Filter schedules for this day
        const daySchedules = (allSchedules || []).filter(
            (s: any) => s.day_of_week === dayOfWeek && s.practitioner
        )

        if (daySchedules.length === 0) continue

        // Load existing appointments for this date
        const { data: existingApts } = await supabase
            .from('appointments')
            .select('id, practitioner_id, room_id, start_time, end_time, status')
            .gte('start_time', `${dateStr}T00:00:00`)
            .lte('start_time', `${dateStr}T23:59:59`)
            .neq('status', 'cancelled')

        // 6. Generate 15-min slots for each practitioner
        for (const schedule of daySchedules) {
            const pract = schedule.practitioner
            if (!pract || !pract.is_active) continue

            // Score this practitioner
            const skillTags: string[] = pract.skill_tags || []
            const matchingSkills = skillTags.filter((t: string) => requiredSkills.includes(t))
            const skillScore = requiredSkills.length > 0
                ? matchingSkills.length / requiredSkills.length
                : 0.5

            const dayApts = (existingApts || []).filter((a: any) => a.practitioner_id === pract.id)
            const loadScore = Math.max(0, 1 - dayApts.length / (pract.max_patients_per_day || 12))

            const totalScore = skillScore * 0.6 + loadScore * 0.4

            // Determine correct room type for this practitioner
            const practRoomType = PROFESSION_ROOM_MAP[pract.profession] || roomType
            const eligibleRooms = (rooms || []).filter((r: any) =>
                r.type === practRoomType || r.type === 'general'
            )

            if (eligibleRooms.length === 0) continue

            const workStartMin = timeToMinutes(schedule.start_time)
            const workEndMin = timeToMinutes(schedule.end_time)

            for (let slotMin = workStartMin; slotMin + durationMin <= workEndMin; slotMin += 15) {
                const slotStartStr = `${dateStr}T${minutesToTime(slotMin)}:00`
                const slotEndStr = `${dateStr}T${minutesToTime(slotMin + durationMin)}:00`

                // Check practitioner availability
                const practBusy = dayApts.some((a: any) =>
                    overlaps(a.start_time, a.end_time, slotStartStr, slotEndStr)
                )
                if (practBusy) continue

                // Check room availability (find first free room)
                let assignedRoom: any = null
                for (const room of eligibleRooms) {
                    const roomApts = (existingApts || []).filter((a: any) =>
                        a.room_id === room.id
                    )
                    const roomBusy = roomApts.some((a: any) =>
                        overlaps(a.start_time, a.end_time, slotStartStr, slotEndStr)
                    )
                    if (!roomBusy) {
                        assignedRoom = room
                        break
                    }
                }
                if (!assignedRoom) continue

                // ✅ Slot is available
                allSlots.push({
                    date: dateStr,
                    time: minutesToTime(slotMin),
                    end_time: minutesToTime(slotMin + durationMin),
                    practitioner_id: pract.id,
                    practitioner_name: `${pract.first_name} ${pract.last_name}`,
                    room_id: assignedRoom.id,
                    room_name: assignedRoom.name,
                    score: Math.round(totalScore * 100) / 100,
                    duration_minutes: durationMin,
                })
            }
        }
    }

    // Sort: best score first, then earliest time
    allSlots.sort((a, b) => {
        if (Math.abs(a.score - b.score) > 0.05) return b.score - a.score
        return `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)
    })

    return {
        slots: allSlots.slice(0, max_slots),
        service,
        location,
    }
}

// ─── CORE: CREATE BOOKING ───────────────────────

async function createBooking(
    supabase: any,
    params: BookingRequest,
): Promise<{ appointment: any; checkout_url: string | null; error: string | null }> {

    const {
        patient_id,
        patient_name,
        patient_phone,
        service_id,
        practitioner_id,
        room_id,
        date,
        time,
        location_id,
        booking_source = 'manual',
    } = params

    // 1. Resolve service for duration
    const { data: service } = await supabase
        .from('services').select('*').eq('id', service_id).single()
    const durationMin = service?.duration_minutes || 30

    // 2. Build timestamps
    const startTime = `${date}T${time}:00`
    const endDate = new Date(startTime)
    endDate.setMinutes(endDate.getMinutes() + durationMin)
    const endTime = endDate.toISOString()

    // 3. Double-check: no collision
    const { data: collisions } = await supabase
        .from('appointments')
        .select('id')
        .eq('practitioner_id', practitioner_id)
        .lt('start_time', endTime)
        .gt('end_time', startTime)
        .neq('status', 'cancelled')

    if (collisions && collisions.length > 0) {
        return { appointment: null, checkout_url: null, error: 'Slot is no longer available. Please choose another time.' }
    }

    // 4. Room collision check
    const { data: roomCollisions } = await supabase
        .from('appointments')
        .select('id')
        .eq('room_id', room_id)
        .lt('start_time', endTime)
        .gt('end_time', startTime)
        .neq('status', 'cancelled')

    if (roomCollisions && roomCollisions.length > 0) {
        return { appointment: null, checkout_url: null, error: 'Room is no longer available. Please choose another time.' }
    }

    // 5. Resolve patient
    let resolvedPatientId = patient_id
    if (!resolvedPatientId && patient_phone) {
        const { data: existing } = await supabase
            .from('patients').select('id').eq('phone', patient_phone).single()
        if (existing) {
            resolvedPatientId = existing.id
        } else {
            const nameParts = (patient_name || 'New Patient').split(' ')
            const { data: newPatient } = await supabase.from('patients').insert({
                first_name: nameParts[0],
                last_name: nameParts.slice(1).join(' ') || '',
                phone: patient_phone,
                source: booking_source === 'ai_phone' ? 'ai_phone' : 'web',
            }).select('id').single()
            resolvedPatientId = newPatient?.id
        }
    }

    // 6. Resolve location
    let resolvedLocationId = location_id
    if (!resolvedLocationId) {
        const { data: loc } = await supabase
            .from('locations').select('id').eq('is_active', true).limit(1).single()
        resolvedLocationId = loc?.id
    }

    // 7. INSERT appointment
    const { data: appointment, error: aptError } = await supabase
        .from('appointments')
        .insert({
            patient_id: resolvedPatientId,
            practitioner_id,
            location_id: resolvedLocationId,
            room_id,
            service_id,
            start_time: startTime,
            end_time: endTime,
            status: 'pending_deposit',
            booking_source,
            triage_data: {},
        })
        .select('id, start_time, end_time, status')
        .single()

    if (aptError) {
        console.error('[Booking] Insert error:', aptError)
        return { appointment: null, checkout_url: null, error: aptError.message }
    }

    // 8. Create Stripe Checkout Session if Stripe key is present
    let checkoutUrl: string | null = null
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (stripeKey && appointment?.id) {
        try {
            const deposit = service?.deposit_amount || 20
            const checkoutParams = new URLSearchParams({
                'mode': 'payment',
                'success_url': `${Deno.env.get('SUPABASE_URL')}/functions/v1/stripe-webhook?success=true`,
                'cancel_url': 'https://costaspine.com',
                'payment_method_types[0]': 'card',
                'line_items[0][price_data][currency]': 'eur',
                'line_items[0][price_data][unit_amount]': String(Math.round(deposit * 100)),
                'line_items[0][price_data][product_data][name]': `Deposit: ${service?.name || 'Appointment'}`,
                'line_items[0][quantity]': '1',
                'metadata[appointment_id]': appointment.id,
                'metadata[patient_id]': resolvedPatientId || '',
            })

            const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${stripeKey}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: checkoutParams.toString(),
            })
            const session = await stripeRes.json()
            checkoutUrl = session.url || null

            if (session.id) {
                await supabase.from('appointments').update({
                    stripe_session_id: session.id,
                }).eq('id', appointment.id)
            }
        } catch (e) {
            console.error('[Booking] Stripe error:', e)
        }
    }

    // 9. Send WhatsApp confirmation
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER')
    const phone = patient_phone || null

    if (accountSid && authToken && fromNumber && phone) {
        try {
            const { data: practData } = await supabase
                .from('practitioners').select('first_name, last_name').eq('id', practitioner_id).single()
            const practName = practData ? `${practData.first_name} ${practData.last_name}` : 'your practitioner'

            let msg = `📅 Booking confirmed at CostaSpine!\n\n`
            msg += `🕐 ${date} at ${time}\n`
            msg += `👨‍⚕️ ${practName}\n`
            msg += `💆 ${service?.name || 'Appointment'}\n`
            if (checkoutUrl) {
                msg += `\n💳 Pay deposit to secure your slot:\n${checkoutUrl}`
            }

            await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
                method: 'POST',
                headers: {
                    Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    To: `whatsapp:${phone}`,
                    From: `whatsapp:${fromNumber}`,
                    Body: msg,
                }).toString(),
            })
        } catch (e) {
            console.error('[Booking] WhatsApp error:', e)
        }
    }

    return { appointment, checkout_url: checkoutUrl, error: null }
}

// ─── HTTP HANDLER ───────────────────────────────

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        const url = new URL(req.url)
        const action = url.searchParams.get('action')

        // ─── GET: AVAILABILITY ───────────────────
        if (action === 'availability') {
            const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0]
            const locationId = url.searchParams.get('location_id') || undefined
            const serviceId = url.searchParams.get('service_id') || undefined
            const serviceCategory = url.searchParams.get('category') || undefined
            const practitionerId = url.searchParams.get('practitioner_id') || undefined
            const days = parseInt(url.searchParams.get('days') || '1')
            const maxSlots = parseInt(url.searchParams.get('max_slots') || '20')

            const result = await findAvailableSlots(supabase, {
                date,
                location_id: locationId,
                service_id: serviceId,
                service_category: serviceCategory,
                practitioner_id: practitionerId,
                days,
                max_slots: maxSlots,
            })

            return new Response(JSON.stringify({
                available: result.slots.length > 0,
                total_slots: result.slots.length,
                slots: result.slots,
                service: result.service ? {
                    id: result.service.id,
                    name: result.service.name,
                    duration_minutes: result.service.duration_minutes,
                    price: result.service.price,
                    deposit_amount: result.service.deposit_amount,
                } : null,
                location: result.location ? {
                    id: result.location.id,
                    name: result.location.name,
                } : null,
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // ─── POST: BOOK ─────────────────────────
        if (action === 'book' && req.method === 'POST') {
            const body: BookingRequest = await req.json()

            if (!body.service_id || !body.practitioner_id || !body.room_id || !body.date || !body.time) {
                return new Response(JSON.stringify({
                    error: 'Missing required fields: service_id, practitioner_id, room_id, date, time',
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }

            const result = await createBooking(supabase, body)

            if (result.error) {
                return new Response(JSON.stringify({ error: result.error }), {
                    status: 409,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }

            return new Response(JSON.stringify({
                success: true,
                appointment: result.appointment,
                checkout_url: result.checkout_url,
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        return new Response(JSON.stringify({
            error: 'Invalid action. Use ?action=availability or ?action=book',
            docs: {
                availability: {
                    method: 'GET',
                    params: 'date, location_id?, service_id?, category?, practitioner_id?, days? (1-14), max_slots? (default 20)',
                    example: '/booking-engine?action=availability&date=2026-03-10&service_id=xxx&days=3',
                },
                book: {
                    method: 'POST',
                    body: 'service_id, practitioner_id, room_id, date, time, patient_id?, patient_name?, patient_phone?, location_id?, booking_source?',
                },
            },
        }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error('[Booking Engine] Error:', error)
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
