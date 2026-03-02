// CostaSpine — Create Stripe Checkout Session
// Supabase Edge Function: create-checkout-session
// Called after booking to generate a deposit payment link

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

        const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
        if (!stripeKey) {
            return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const { appointment_id } = await req.json()

        if (!appointment_id) {
            return new Response(JSON.stringify({ error: 'appointment_id required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Fetch appointment with relations
        const { data: appointment, error: aptError } = await supabase
            .from('appointments')
            .select('*, patient:patients(*), service:services(*), practitioner:practitioners(*), location:locations(*)')
            .eq('id', appointment_id)
            .single()

        if (aptError || !appointment) {
            return new Response(JSON.stringify({ error: 'Appointment not found' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const service = appointment.service
        const patient = appointment.patient
        const practitioner = appointment.practitioner
        const location = appointment.location
        const depositAmount = service?.deposit_amount || 20

        // Create Stripe Checkout Session via API (no SDK)
        const successUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/stripe-webhook?success=true`
        const cancelUrl = location?.google_maps_url || 'https://costaspine.com'

        const params = new URLSearchParams({
            'mode': 'payment',
            'success_url': successUrl,
            'cancel_url': cancelUrl,
            'payment_method_types[0]': 'card',
            'line_items[0][price_data][currency]': 'eur',
            'line_items[0][price_data][unit_amount]': String(Math.round(depositAmount * 100)),
            'line_items[0][price_data][product_data][name]': `Deposit: ${service?.name || 'Appointment'}`,
            'line_items[0][price_data][product_data][description]': `${practitioner?.first_name} ${practitioner?.last_name} · ${location?.name || 'CostaSpine'}`,
            'line_items[0][quantity]': '1',
            'metadata[appointment_id]': appointment_id,
            'metadata[patient_id]': appointment.patient_id,
            'customer_email': patient?.email || '',
        })

        const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${stripeKey}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        })

        const session = await stripeRes.json()

        if (session.error) {
            console.error('[Checkout] Stripe error:', session.error)
            return new Response(JSON.stringify({ error: session.error.message }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Update appointment with Stripe session ID
        await supabase.from('appointments').update({
            stripe_session_id: session.id,
        }).eq('id', appointment_id)

        console.log('[Checkout] Session created:', session.id, 'URL:', session.url)

        return new Response(JSON.stringify({
            checkout_url: session.url,
            session_id: session.id,
            deposit_amount: depositAmount,
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error('[Checkout] Error:', error)
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
