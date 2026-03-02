// CostaSpine — Vapi Webhook Handler
// Supabase Edge Function: handle-vapi-webhook
// Handles: status updates, end-of-call analysis (Gemini), function calls (check_availability, create_booking)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        const body = await req.json()
        const { message } = body

        console.log('[Vapi Webhook] Event type:', message?.type)

        // ─── STATUS UPDATE ───────────────────────────────
        if (message?.type === 'status-update') {
            const { status, call } = message
            const callId = call?.id

            if (status === 'in-progress') {
                await supabase.from('call_logs').upsert({
                    vapi_call_id: callId,
                    caller_phone: call?.customer?.number || null,
                    direction: 'inbound',
                    status: 'in_progress',
                    created_at: new Date().toISOString(),
                }, { onConflict: 'vapi_call_id' })
            }

            if (status === 'ended') {
                const durationSeconds = call?.endedAt && call?.startedAt
                    ? Math.round((new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000)
                    : 0

                await supabase.from('call_logs').update({
                    duration_seconds: durationSeconds,
                    status: durationSeconds > 0 ? 'completed' : 'no_answer',
                }).eq('vapi_call_id', callId)
            }
        }

        // ─── END OF CALL REPORT ──────────────────────────
        if (message?.type === 'end-of-call-report') {
            const { call, transcript, summary, recordingUrl } = message
            const callId = call?.id
            const callerPhone = call?.customer?.number

            console.log('[Vapi] End of call report for:', callId)

            let triageResult: Record<string, unknown> = {}
            let patientData: Record<string, unknown> = {}

            const geminiKey = Deno.env.get('GEMINI_API_KEY')
            if (geminiKey && transcript) {
                try {
                    const analysisPrompt = `You are a medical receptionist AI analyzing a phone call transcript between a virtual receptionist and a potential patient across CostaSpine's locations (Elviria, Guadalmina, Aloha).

Extract the following data in JSON format:
{
  "patient_name": "string or null",
  "symptoms": ["list of symptoms mentioned"],
  "category": "acute_injury | chronic_pain | sports_injury | post_surgery | relaxation",
  "urgency": "immediate | soon | routine",
  "preferred_location": "Elviria | Guadalmina | Aloha | null",
  "preferred_date": "YYYY-MM-DD or null",
  "preferred_time": "HH:MM or null",
  "language": "en | es",
  "notes": "any other relevant information"
}

Transcript:
${transcript}

Summary:
${summary || 'No summary available'}

Return ONLY valid JSON.`

                    const geminiRes = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{ parts: [{ text: analysisPrompt }] }],
                                generationConfig: { temperature: 0.1 },
                            }),
                        }
                    )

                    const geminiData = await geminiRes.json()
                    const responseText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || ''

                    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0])
                        triageResult = {
                            category: parsed.category,
                            urgency: parsed.urgency,
                            symptoms: parsed.symptoms,
                            preferred_location: parsed.preferred_location,
                        }
                        patientData = {
                            name: parsed.patient_name,
                            language: parsed.language,
                            preferred_date: parsed.preferred_date,
                            preferred_time: parsed.preferred_time,
                            notes: parsed.notes,
                        }
                    }
                } catch (e) {
                    console.error('[Vapi] Gemini analysis error:', e)
                }
            }

            await supabase.from('call_logs').update({
                triage_result: triageResult,
                analysis: patientData,
                transcript: transcript || null,
                recording_url: recordingUrl || null,
                status: 'completed',
            }).eq('vapi_call_id', callId)

            // Auto-create patient if caller phone is provided
            if (callerPhone) {
                const { data: existingPatient } = await supabase
                    .from('patients')
                    .select('id')
                    .eq('phone', callerPhone)
                    .single()

                let patientId = existingPatient?.id

                if (!patientId) {
                    const nameParts = (patientData.name as string || 'New Patient').split(' ')
                    const { data: newPatient } = await supabase.from('patients').insert({
                        first_name: nameParts[0] || 'New',
                        last_name: nameParts.slice(1).join(' ') || 'Patient',
                        phone: callerPhone,
                        source: 'ai_phone',
                        language: (patientData.language as string) || 'en',
                        notes: `AI call triage: ${JSON.stringify(triageResult)}`,
                    }).select('id').single()

                    patientId = newPatient?.id
                }

                if (patientId) {
                    await supabase.from('call_logs').update({
                        patient_id: patientId,
                    }).eq('vapi_call_id', callId)
                }
            }
        }

        // ─── TOOL CALLS (function calling from Vapi) ────
        if (message?.type === 'function-call') {
            const { functionCall } = message
            const functionName = functionCall?.name
            const params = functionCall?.parameters

            console.log('[Vapi] Function call:', functionName, params)

            // ─── CHECK AVAILABILITY (real DB query) ──────
            if (functionName === 'check_availability') {
                const requestedDate = params?.date || new Date().toISOString().split('T')[0]
                const locationName = params?.location || 'Elviria'
                const serviceCategory = params?.service_type || null

                try {
                    // 1. Find location
                    const { data: location } = await supabase
                        .from('locations')
                        .select('id')
                        .ilike('name', `%${locationName}%`)
                        .single()

                    const locationId = location?.id || '10000000-0000-0000-0000-000000000001'

                    // 2. Get day of week (0=Sun, 1=Mon, ...)
                    const dateParts = requestedDate.split('-')
                    const dateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]))
                    const dayOfWeek = dateObj.getDay()

                    // 3. Get practitioner schedules for that day + location
                    const { data: schedules } = await supabase
                        .from('practitioner_schedules')
                        .select('*, practitioner:practitioners(id, first_name, last_name, profession, skill_tags)')
                        .eq('location_id', locationId)
                        .eq('day_of_week', dayOfWeek)

                    if (!schedules?.length) {
                        return new Response(JSON.stringify({
                            results: { available: false, message: `No practitioners available on ${requestedDate} at ${locationName}. Would you like to try another day?` }
                        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
                    }

                    // 4. Get existing appointments for that date
                    const { data: existingApts } = await supabase
                        .from('appointments')
                        .select('practitioner_id, start_time, end_time')
                        .gte('start_time', `${requestedDate}T00:00:00`)
                        .lte('start_time', `${requestedDate}T23:59:59`)
                        .in('status', ['confirmed', 'pending_deposit'])

                    // 5. Get rooms at location
                    const { data: rooms } = await supabase
                        .from('rooms')
                        .select('id, name, type')
                        .eq('location_id', locationId)

                    // 6. Build available slots (1-hour granularity)
                    const slots: Array<{ time: string; practitioner: string; room: string; practitioner_id: string; room_id: string }> = []

                    for (const schedule of schedules) {
                        const pract = schedule.practitioner
                        if (!pract) continue

                        const startHour = parseInt(schedule.start_time.split(':')[0])
                        const endHour = parseInt(schedule.end_time.split(':')[0])

                        for (let hour = startHour; hour < endHour; hour++) {
                            const slotStart = `${requestedDate}T${String(hour).padStart(2, '0')}:00:00`
                            const slotEnd = `${requestedDate}T${String(hour + 1).padStart(2, '0')}:00:00`

                            // Check if practitioner is free
                            const busy = (existingApts || []).some(apt =>
                                apt.practitioner_id === pract.id &&
                                new Date(apt.start_time) < new Date(slotEnd) &&
                                new Date(apt.end_time) > new Date(slotStart)
                            )

                            if (!busy) {
                                // Find matching room
                                const matchedRoom = (rooms || []).find(r => {
                                    if (pract.profession === 'Chiropractor') return r.type === 'chiropractic'
                                    if (pract.profession === 'Physiotherapist') return r.type === 'physiotherapy'
                                    if (pract.profession === 'Massage Therapist') return r.type === 'massage'
                                    return true
                                })

                                slots.push({
                                    time: `${String(hour).padStart(2, '0')}:00`,
                                    practitioner: `${pract.first_name} ${pract.last_name}`,
                                    practitioner_id: pract.id,
                                    room: matchedRoom?.name || 'Any available room',
                                    room_id: matchedRoom?.id || '',
                                })
                            }
                        }
                    }

                    // Return top 5 slots
                    const topSlots = slots.slice(0, 5).map(s => ({
                        time: s.time,
                        practitioner: s.practitioner,
                        room: s.room,
                    }))

                    return new Response(JSON.stringify({
                        results: topSlots.length
                            ? { available: true, slots: topSlots, date: requestedDate, location: locationName }
                            : { available: false, message: `No available slots on ${requestedDate} at ${locationName}. Would you like to try the next day?` }
                    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

                } catch (e) {
                    console.error('[Vapi] check_availability error:', e)
                    return new Response(JSON.stringify({
                        results: { available: false, message: 'I had trouble checking availability. Let me connect you with our team.' }
                    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
                }
            }

            // ─── CREATE BOOKING (real INSERT) ────────────
            if (functionName === 'create_booking') {
                const patientName = params?.patient_name
                const patientPhone = params?.patient_phone
                const date = params?.date
                const time = params?.time
                const serviceType = params?.service_type || 'Initial Consultation'
                const locationName = params?.location || 'Elviria'
                const practitionerName = params?.practitioner || null

                try {
                    // 1. Find or create patient
                    let patientId: string | null = null
                    if (patientPhone) {
                        const { data: existing } = await supabase
                            .from('patients')
                            .select('id')
                            .eq('phone', patientPhone)
                            .single()

                        if (existing) {
                            patientId = existing.id
                        } else {
                            const nameParts = (patientName || 'New Patient').split(' ')
                            const { data: newPat } = await supabase.from('patients').insert({
                                first_name: nameParts[0],
                                last_name: nameParts.slice(1).join(' ') || 'Patient',
                                phone: patientPhone,
                                source: 'ai_phone',
                            }).select('id').single()
                            patientId = newPat?.id || null
                        }
                    }

                    if (!patientId) {
                        return new Response(JSON.stringify({
                            results: { success: false, message: 'I need the patient phone number to create a booking.' }
                        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
                    }

                    // 2. Find location
                    const { data: location } = await supabase
                        .from('locations')
                        .select('id')
                        .ilike('name', `%${locationName}%`)
                        .single()
                    const locationId = location?.id || '10000000-0000-0000-0000-000000000001'

                    // 3. Find service
                    const { data: service } = await supabase
                        .from('services')
                        .select('id, duration_minutes')
                        .ilike('name', `%${serviceType}%`)
                        .limit(1)
                        .single()
                    const serviceId = service?.id || '40000000-0000-0000-0000-000000000001'
                    const durationMin = service?.duration_minutes || 60

                    // 4. Find practitioner (by name or first available)
                    let practitionerId: string | null = null
                    let roomId: string | null = null

                    if (practitionerName) {
                        const { data: pract } = await supabase
                            .from('practitioners')
                            .select('id')
                            .or(`first_name.ilike.%${practitionerName}%,last_name.ilike.%${practitionerName}%`)
                            .limit(1)
                            .single()
                        practitionerId = pract?.id || null
                    }

                    if (!practitionerId) {
                        // Get first available practitioner at location
                        const { data: pl } = await supabase
                            .from('practitioner_locations')
                            .select('practitioner_id')
                            .eq('location_id', locationId)
                            .limit(1)
                            .single()
                        practitionerId = pl?.practitioner_id || '30000000-0000-0000-0000-000000000001'
                    }

                    // 5. Find a room
                    const { data: rooms } = await supabase
                        .from('rooms')
                        .select('id')
                        .eq('location_id', locationId)
                        .limit(1)
                    roomId = rooms?.[0]?.id || null

                    // 6. Build timestamps
                    const startTime = `${date}T${time || '10:00'}:00`
                    const endDate = new Date(startTime)
                    endDate.setMinutes(endDate.getMinutes() + durationMin)
                    const endTime = endDate.toISOString()

                    // 7. INSERT appointment
                    const { data: appointment, error: aptError } = await supabase
                        .from('appointments')
                        .insert({
                            patient_id: patientId,
                            practitioner_id: practitionerId,
                            location_id: locationId,
                            room_id: roomId,
                            service_id: serviceId,
                            start_time: startTime,
                            end_time: endTime,
                            status: 'pending_deposit',
                            booking_source: 'ai_phone',
                            triage_data: {},
                        })
                        .select('id')
                        .single()

                    if (aptError) {
                        console.error('[Vapi] Appointment insert error:', aptError)
                        return new Response(JSON.stringify({
                            results: { success: false, message: 'There was an issue creating the booking. Please try again.' }
                        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
                    }

                    // 8. Link to call log if we have the vapi call id
                    const callId = message?.call?.id
                    if (callId && appointment?.id) {
                        await supabase.from('call_logs').update({
                            appointment_id: appointment.id,
                        }).eq('vapi_call_id', callId)
                    }

                    return new Response(JSON.stringify({
                        results: {
                            success: true,
                            appointment_id: appointment?.id,
                            message: `Booking created for ${patientName} on ${date} at ${time || '10:00'}. They will receive a WhatsApp message with the deposit payment link shortly.`,
                        }
                    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

                } catch (e) {
                    console.error('[Vapi] create_booking error:', e)
                    return new Response(JSON.stringify({
                        results: { success: false, message: 'There was an issue creating the booking. Let me connect you with our team.' }
                    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
                }
            }
        }

        return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (error) {
        console.error('[Vapi Webhook] Error:', error)
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
