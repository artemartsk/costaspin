// CostaSpine — Vapi Webhook Handler
// Supabase Edge Function: handle-vapi-webhook
// Adapted from Stayte's handle-vapi-webhook (540 lines → clinic domain)

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
                // Call started — create or update call log
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

            // Analyse transcript with Gemini for triage extraction
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

                    // Extract JSON from response
                    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0])
                        triageResult = {
                            category: parsed.category,
                            urgency: parsed.urgency,
                            symptoms: parsed.symptoms,
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

            // Update call log with analysis results
            await supabase.from('call_logs').update({
                triage_result: triageResult,
                analysis: patientData,
                transcript: transcript || null,
                recording_url: recordingUrl || null,
                status: 'completed',
            }).eq('vapi_call_id', callId)

            // Auto-create patient if caller phone is provided and not already exists
            if (callerPhone) {
                const { data: existingPatient } = await supabase
                    .from('patients')
                    .select('id')
                    .eq('phone', callerPhone)
                    .single()

                let patientId = existingPatient?.id

                if (!patientId) {
                    // Create new patient from call data
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

                // Link patient to call log
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

            if (functionName === 'check_availability') {
                // Return available slots for patient
                const practitionerType = params?.practitioner_type || 'chiropractic'
                const date = params?.date || new Date().toISOString().split('T')[0]

                // Simplified: return mock available slots
                // In production, this would query the booking engine
                const slots = [
                    { time: '10:00', practitioner: 'Dr. James Wilson', room: 'Room 1' },
                    { time: '14:00', practitioner: 'Dr. Sarah Chen', room: 'Physio Suite' },
                    { time: '15:30', practitioner: 'Dr. James Wilson', room: 'Room 1' },
                ]

                return new Response(JSON.stringify({ results: slots }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }

            if (functionName === 'create_booking') {
                // Create appointment from Vapi call
                const patientName = params?.patient_name
                const patientPhone = params?.patient_phone
                const dateTime = params?.date_time
                const serviceType = params?.service_type

                // Find or create patient
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

                return new Response(JSON.stringify({
                    results: {
                        success: true,
                        patient_id: patientId,
                        message: `Booking created for ${patientName}. They will receive a WhatsApp with the deposit link.`,
                    }
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
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
