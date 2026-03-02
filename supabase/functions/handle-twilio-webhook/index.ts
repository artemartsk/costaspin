// CostaSpine — Twilio WhatsApp Webhook Handler
// Supabase Edge Function: handle-twilio-webhook
// Adapted from Stayte's handle-twilio-webhook (737 lines → clinic messaging)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Send WhatsApp message via Twilio
async function sendTwilioMessage(
    to: string,
    body: string,
    accountSid: string,
    authToken: string,
    from: string,
): Promise<{ success: boolean; messageSid?: string }> {
    try {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
        const formData = new URLSearchParams({
            To: `whatsapp:${to}`,
            From: `whatsapp:${from}`,
            Body: body,
        })

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
        })

        const data = await res.json()
        return { success: res.ok, messageSid: data.sid }
    } catch (error) {
        console.error('[Twilio] Send error:', error)
        return { success: false }
    }
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

        // Parse form-encoded Twilio webhook data
        const formData = await req.formData()
        const body = formData.get('Body') as string || ''
        const from = (formData.get('From') as string || '').replace('whatsapp:', '')
        const messageSid = formData.get('MessageSid') as string || ''

        console.log('[Twilio] Incoming from:', from, '| Body:', body)

        // Get Twilio settings from clinic_settings
        const { data: settings } = await supabase
            .from('clinic_settings')
            .select('twilio_settings')
            .single()

        const twilioSettings = settings?.twilio_settings || {}
        const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || (twilioSettings as Record<string, string>).account_sid
        const authToken = Deno.env.get('TWILIO_AUTH_TOKEN') || (twilioSettings as Record<string, string>).auth_token
        const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER') || (twilioSettings as Record<string, string>).from_number

        // Find or create patient by phone
        const { data: existingPatient } = await supabase
            .from('patients')
            .select('*')
            .eq('phone', from)
            .single()

        let patientId = existingPatient?.id

        if (!patientId) {
            const { data: newPatient } = await supabase.from('patients').insert({
                first_name: 'WhatsApp',
                last_name: 'User',
                phone: from,
                source: 'whatsapp',
            }).select('id').single()
            patientId = newPatient?.id
        }

        // Process message content
        const lowerBody = body.toLowerCase().trim()

        // ─── QUICK REPLIES ──────────────────────────────

        // Confirm appointment
        if (lowerBody === 'confirm' || lowerBody === 'yes' || lowerBody === 'sí' || lowerBody === 'si') {
            // Find pending appointment for this patient
            const { data: pendingApt } = await supabase
                .from('appointments')
                .select('*')
                .eq('patient_id', patientId)
                .eq('status', 'pending_deposit')
                .order('start_time', { ascending: true })
                .limit(1)
                .single()

            if (pendingApt) {
                if (accountSid && authToken && fromNumber) {
                    await sendTwilioMessage(
                        from,
                        `✅ Great! To confirm your appointment, please complete the deposit payment: ${Deno.env.get('STRIPE_DEPOSIT_URL') || '[deposit link will be sent]'}`,
                        accountSid,
                        authToken,
                        fromNumber,
                    )
                }
            } else {
                if (accountSid && authToken && fromNumber) {
                    await sendTwilioMessage(
                        from,
                        `You don't have any pending appointments. Would you like to book one? Call us at +34 952 123 456 or reply BOOK.`,
                        accountSid,
                        authToken,
                        fromNumber,
                    )
                }
            }
        }

        // Cancel appointment
        else if (lowerBody === 'cancel' || lowerBody === 'cancelar') {
            const { data: nextApt } = await supabase
                .from('appointments')
                .select('*')
                .eq('patient_id', patientId)
                .in('status', ['confirmed', 'pending_deposit'])
                .order('start_time', { ascending: true })
                .limit(1)
                .single()

            if (nextApt) {
                await supabase.from('appointments').update({
                    status: 'cancelled',
                    updated_at: new Date().toISOString(),
                }).eq('id', nextApt.id)

                if (accountSid && authToken && fromNumber) {
                    await sendTwilioMessage(
                        from,
                        `Your appointment has been cancelled. We hope to see you soon! If you'd like to rebook, reply BOOK or call +34 952 123 456.`,
                        accountSid,
                        authToken,
                        fromNumber,
                    )
                }
            }
        }

        // Book / Schedule request
        else if (lowerBody === 'book' || lowerBody === 'cita' || lowerBody === 'reservar') {
            if (accountSid && authToken && fromNumber) {
                await sendTwilioMessage(
                    from,
                    `📅 I'd love to help you book! Here are our available services:\n\n1️⃣ Chiropractic (30 min, €75)\n2️⃣ Physiotherapy (45 min, €85)\n3️⃣ Sports Massage (60 min, €70)\n4️⃣ Deep Tissue (45 min, €65)\n\nReply with a number to choose, or call us for a personalised recommendation.`,
                    accountSid,
                    authToken,
                    fromNumber,
                )
            }
        }

        // General / AI auto-reply for unrecognised messages
        else {
            const openaiKey = Deno.env.get('OPENAI_API_KEY')
            if (openaiKey && accountSid && authToken && fromNumber) {
                try {
                    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${openaiKey}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model: 'gpt-4o-mini',
                            messages: [
                                {
                                    role: 'system',
                                    content: `You are Sofia, a friendly virtual assistant for CostaSpine clinic in Elviria, Marbella. Keep responses short (under 160 chars). Help with: booking appointments, answering hours (Mon-Fri 9-17, Sat 10-14), directions (Urb. Elviria, Marbella), and general clinic info. If they need medical advice, recommend calling or booking a consultation. Reply in the same language as the patient.`,
                                },
                                { role: 'user', content: body },
                            ],
                            max_tokens: 100,
                            temperature: 0.7,
                        }),
                    })

                    const aiData = await aiRes.json()
                    const reply = aiData.choices?.[0]?.message?.content || 'Thank you for contacting CostaSpine! Please call +34 952 123 456 for assistance.'

                    await sendTwilioMessage(from, reply, accountSid, authToken, fromNumber)
                } catch (e) {
                    console.error('[Twilio] AI reply error:', e)
                }
            }
        }

        // Return TwiML empty response
        return new Response(
            '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
            { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
        )
    } catch (error) {
        console.error('[Twilio Webhook] Error:', error)
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
