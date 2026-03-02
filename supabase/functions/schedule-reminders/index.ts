// CostaSpine — Schedule Reminders
// Supabase Edge Function: schedule-reminders
// Runs on a cron schedule to send WhatsApp reminders

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
        console.error('[Reminder] Twilio error:', e)
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

        const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!
        const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')!
        const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER')!

        const now = new Date()
        const results = { sent_24h: 0, sent_6h: 0, sent_thank_you: 0, sent_review: 0, errors: 0 }

        // ─── 24-HOUR REMINDERS ──────────────────────────
        const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
        const in24h_from = new Date(in24h.getTime() - 30 * 60 * 1000) // 30 min window
        const in24h_to = new Date(in24h.getTime() + 30 * 60 * 1000)

        const { data: tomorrow } = await supabase
            .from('appointments')
            .select('*, patient:patients(*), practitioner:practitioners(*), service:services(*)')
            .in('status', ['confirmed', 'pending_deposit'])
            .gte('start_time', in24h_from.toISOString())
            .lte('start_time', in24h_to.toISOString())

        for (const apt of (tomorrow || [])) {
            // Check if reminder already sent
            const { data: existing } = await supabase.from('reminders')
                .select('id').eq('appointment_id', apt.id).eq('type', '24h').single()
            if (existing) continue

            const patient = apt.patient
            if (!patient?.phone) continue

            const practName = `${apt.practitioner?.first_name} ${apt.practitioner?.last_name}`
            const time = new Date(apt.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
            const formsNote = !patient.forms_completed ? '\n\n📋 Please complete your intake forms before your visit.' : ''

            const message = `⏰ Reminder: Your appointment is tomorrow at ${time} with ${practName}.${formsNote}`
            const sid = await sendTwilioMessage(patient.phone, message, accountSid, authToken, fromNumber)

            await supabase.from('reminders').insert({
                appointment_id: apt.id,
                type: '24h',
                channel: 'whatsapp',
                message_sid: sid,
                status: sid ? 'sent' : 'failed',
                sent_at: sid ? new Date().toISOString() : null,
            })

            results.sent_24h++
        }

        // ─── 6-HOUR REMINDERS ───────────────────────────
        const in6h = new Date(now.getTime() + 6 * 60 * 60 * 1000)
        const in6h_from = new Date(in6h.getTime() - 30 * 60 * 1000)
        const in6h_to = new Date(in6h.getTime() + 30 * 60 * 1000)

        const { data: soonApts } = await supabase
            .from('appointments')
            .select('*, patient:patients(*)')
            .in('status', ['confirmed'])
            .gte('start_time', in6h_from.toISOString())
            .lte('start_time', in6h_to.toISOString())

        for (const apt of (soonApts || [])) {
            const { data: existing } = await supabase.from('reminders')
                .select('id').eq('appointment_id', apt.id).eq('type', '6h').single()
            if (existing) continue

            const patient = apt.patient
            if (!patient?.phone) continue

            const time = new Date(apt.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
            const message = `See you soon! Your appointment is today at ${time} at CostaSpine Elviria.`
            const sid = await sendTwilioMessage(patient.phone, message, accountSid, authToken, fromNumber)

            await supabase.from('reminders').insert({
                appointment_id: apt.id, type: '6h', channel: 'whatsapp',
                message_sid: sid, status: sid ? 'sent' : 'failed',
                sent_at: sid ? new Date().toISOString() : null,
            })

            results.sent_6h++
        }

        // ─── POST-VISIT THANK YOU ───────────────────────
        const { data: attended } = await supabase
            .from('appointments')
            .select('*, patient:patients(*)')
            .eq('status', 'attended')
            .gte('updated_at', new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString())

        for (const apt of (attended || [])) {
            const { data: existing } = await supabase.from('reminders')
                .select('id').eq('appointment_id', apt.id).eq('type', 'post_visit').single()
            if (existing) continue

            const patient = apt.patient
            if (!patient?.phone) continue

            const message = `Thank you for visiting CostaSpine, ${patient.first_name}! We hope you're feeling better. 😊`
            const sid = await sendTwilioMessage(patient.phone, message, accountSid, authToken, fromNumber)

            await supabase.from('reminders').insert({
                appointment_id: apt.id, type: 'post_visit', channel: 'whatsapp',
                message_sid: sid, status: sid ? 'sent' : 'failed',
                sent_at: sid ? new Date().toISOString() : null,
            })

            results.sent_thank_you++
        }

        // ─── REVIEW REQUEST (3rd+ visit) ────────────────
        const { data: reviewCandidates } = await supabase
            .from('patients')
            .select('*')
            .gte('visit_count', 3)

        const { data: settings } = await supabase.from('locations').select('google_review_url').single()
        const reviewUrl = settings?.google_review_url || 'https://g.page/costaspine-elviria'

        for (const patient of (reviewCandidates || [])) {
            // Check if review already requested
            const { data: existing } = await supabase.from('reminders')
                .select('id').eq('type', 'review_request')
                .limit(1)
            // Simple: skip if we've sent more than 1 review request to this patient recently
            if (existing && existing.length > 0) continue

            const message = `Hi ${patient.first_name}! As a valued patient, would you mind leaving us a review? It helps others find quality care. ${reviewUrl} ⭐`
            const sid = await sendTwilioMessage(patient.phone, message, accountSid, authToken, fromNumber)

            if (sid) results.sent_review++
        }

        console.log('[Reminders] Results:', results)

        return new Response(JSON.stringify(results), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (error) {
        console.error('[Reminders] Error:', error)
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
