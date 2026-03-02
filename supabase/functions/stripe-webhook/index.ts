// CostaSpine — Stripe Webhook Handler
// Supabase Edge Function: stripe-webhook
// Handles Checkout session completion → confirms appointment + triggers WhatsApp

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
        const sig = req.headers.get('stripe-signature')!
        const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

        // In production, verify Stripe signature here
        // For now, parse the event directly
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
                .select('*, patient:patients(*), practitioner:practitioners(*), service:services(*)')
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

                const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!
                const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')!
                const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER')!

                // Booking confirmation message
                const confirmMsg = `✅ Booking confirmed! Your appointment with ${practName} is on ${date} at ${time}.\n\n📍 CostaSpine Elviria, Marbella`
                await sendTwilioMessage(appointment.patient.phone, confirmMsg, accountSid, authToken, fromNumber)

                // If new patient, send onboarding
                if (appointment.patient.visit_count === 0) {
                    const { data: location } = await supabase.from('locations').select('google_maps_url').single()
                    const mapsUrl = location?.google_maps_url || ''

                    const onboardMsg = `Welcome to CostaSpine! 📍 How to find us: ${mapsUrl}\n\nBefore your visit, please have your ID and any medical records ready.`
                    await sendTwilioMessage(appointment.patient.phone, onboardMsg, accountSid, authToken, fromNumber)

                    // Update visit count
                    await supabase.from('patients').update({
                        visit_count: 1,
                        updated_at: new Date().toISOString(),
                    }).eq('id', patientId)
                }
            }

            console.log('[Stripe] Appointment confirmed:', appointmentId)
        }

        if (event.type === 'charge.refunded') {
            const charge = event.data.object
            const paymentIntent = charge.payment_intent

            // Find and update payment record
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
