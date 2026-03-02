// CostaSpine — Stripe Webhook Handler
// Supabase Edge Function: stripe-webhook
// Handles: checkout.session.completed → confirm appointment + WhatsApp
//          charge.refunded → cancel appointment

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

// HMAC-SHA256 signature verification (no external Stripe SDK needed)
async function verifyStripeSignature(
    payload: string,
    sigHeader: string,
    secret: string,
): Promise<boolean> {
    try {
        const pairs = sigHeader.split(',').reduce((acc, pair) => {
            const [key, value] = pair.split('=')
            acc[key.trim()] = value
            return acc
        }, {} as Record<string, string>)

        const timestamp = pairs['t']
        const signature = pairs['v1']

        if (!timestamp || !signature) return false

        // Reject timestamps older than 5 minutes
        const now = Math.floor(Date.now() / 1000)
        if (Math.abs(now - parseInt(timestamp)) > 300) {
            console.warn('[Stripe] Timestamp too old:', timestamp)
            return false
        }

        const signedPayload = `${timestamp}.${payload}`
        const encoder = new TextEncoder()
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign'],
        )
        const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload))
        const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')

        return computed === signature
    } catch (e) {
        console.error('[Stripe] Signature verification error:', e)
        return false
    }
}

async function sendTwilioMessage(
    to: string,
    body: string,
    accountSid: string,
    authToken: string,
    from: string,
): Promise<string | null> {
    try {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                To: `whatsapp:${to}`,
                From: `whatsapp:${from}`,
                Body: body,
            }).toString(),
        })
        const data = await res.json()
        return data.sid || null
    } catch (e) {
        console.error('[Stripe] Twilio error:', e)
        return null
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

        const body = await req.text()

        // Verify Stripe signature if secret is configured
        const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
        const sigHeader = req.headers.get('stripe-signature')

        if (webhookSecret && sigHeader) {
            const valid = await verifyStripeSignature(body, sigHeader, webhookSecret)
            if (!valid) {
                console.error('[Stripe] Invalid signature')
                return new Response(JSON.stringify({ error: 'Invalid signature' }), {
                    status: 401,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }
        } else if (webhookSecret && !sigHeader) {
            console.error('[Stripe] Missing stripe-signature header')
            return new Response(JSON.stringify({ error: 'Missing signature' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const event = JSON.parse(body)
        console.log('[Stripe] Event:', event.type)

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object
            const appointmentId = session.metadata?.appointment_id
            const patientId = session.metadata?.patient_id

            if (!appointmentId) {
                console.warn('[Stripe] No appointment_id in session metadata')
                return new Response(JSON.stringify({ received: true }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }

            // 1. Record payment
            await supabase.from('payments').insert({
                appointment_id: appointmentId,
                patient_id: patientId,
                amount: session.amount_total / 100,
                type: 'deposit',
                stripe_payment_id: session.payment_intent,
                stripe_session_id: session.id,
                status: 'completed',
            })

            // 2. Confirm appointment
            await supabase.from('appointments').update({
                status: 'confirmed',
                deposit_paid: true,
                stripe_session_id: session.id,
                updated_at: new Date().toISOString(),
            }).eq('id', appointmentId)

            // 3. Get appointment details for WhatsApp confirmation
            const { data: appointment } = await supabase
                .from('appointments')
                .select('*, patient:patients(*), practitioner:practitioners(*), service:services(*), location:locations(*)')
                .eq('id', appointmentId)
                .single()

            if (appointment?.patient?.phone) {
                const practName = `${appointment.practitioner?.first_name} ${appointment.practitioner?.last_name}`
                const time = new Date(appointment.start_time).toLocaleTimeString('en-GB', {
                    hour: '2-digit', minute: '2-digit'
                })
                const date = new Date(appointment.start_time).toLocaleDateString('en-GB', {
                    weekday: 'long', day: 'numeric', month: 'long'
                })
                const locationName = appointment.location?.name || 'CostaSpine'

                const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
                const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
                const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER')

                if (accountSid && authToken && fromNumber) {
                    const confirmMsg = `✅ Booking confirmed! Your appointment with ${practName} is on ${date} at ${time}.\n\n📍 ${locationName}, Marbella`
                    await sendTwilioMessage(appointment.patient.phone, confirmMsg, accountSid, authToken, fromNumber)

                    // If new patient, send onboarding
                    if (appointment.patient.visit_count === 0) {
                        const mapsUrl = appointment.location?.google_maps_url || ''
                        const onboardMsg = `Welcome to CostaSpine! 📍 How to find us: ${mapsUrl}\n\nBefore your visit, please have your ID and any medical records ready.`
                        await sendTwilioMessage(appointment.patient.phone, onboardMsg, accountSid, authToken, fromNumber)

                        await supabase.from('patients').update({
                            visit_count: 1,
                            updated_at: new Date().toISOString(),
                        }).eq('id', patientId)
                    }
                }
            }

            console.log('[Stripe] Appointment confirmed:', appointmentId)
        }

        if (event.type === 'charge.refunded') {
            const charge = event.data.object
            const paymentIntent = charge.payment_intent

            const { data: payment } = await supabase
                .from('payments')
                .select('*')
                .eq('stripe_payment_id', paymentIntent)
                .single()

            if (payment) {
                await supabase.from('payments').update({ status: 'refunded' }).eq('id', payment.id)

                if (payment.appointment_id) {
                    await supabase.from('appointments').update({
                        status: 'cancelled',
                        deposit_paid: false,
                        updated_at: new Date().toISOString(),
                    }).eq('id', payment.appointment_id)
                }
            }
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (error) {
        console.error('[Stripe Webhook] Error:', error)
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
