import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()
    const record = payload.record

    if (!record || !record.patient_id || !record.practitioner_id) {
      return new Response(JSON.stringify({ error: "Missing required fields in payload" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "http://localhost:5177"
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")
    const TWILIO_FROM = Deno.env.get("TWILIO_FROM_PHONE") || "whatsapp:+14155238886"

    // 1. Fetch Patient
    const { data: patient, error: patientError } = await supabaseClient
      .from('patients')
      .select('first_name, phone, forms_completed, form_token')
      .eq('id', record.patient_id)
      .single()

    if (patientError || !patient) {
      console.error("Patient fetch error:", patientError)
      return new Response(JSON.stringify({ error: "Failed to fetch patient" }), { status: 500 })
    }

    // 2. Fetch Practitioner
    const { data: practitioner, error: practError } = await supabaseClient
      .from('practitioners')
      .select('first_name, last_name')
      .eq('id', record.practitioner_id)
      .single()

    // 3. Format Message
    let messageBody = ""
    let templateType = ""

    if (patient.forms_completed) {
      templateType = "booking_confirmation"
      messageBody = `Hi ${patient.first_name}, your appointment with Dr. ${practitioner?.last_name || 'CostaSpine'} is confirmed for ${new Date(record.start_time).toLocaleString()}. See you soon!`
    } else {
      templateType = "magic_link_onboarding"
      const magicLink = `${FRONTEND_URL}/forms?token=${patient.form_token}`
      messageBody = `Welcome to CostaSpine, ${patient.first_name}! Please complete your medical history and intake forms before your visit: ${magicLink}`
    }

    // Log the notification payload immediately as pending
    const { data: logEntry, error: logError } = await supabaseClient
      .from('notification_logs')
      .insert({
        appointment_id: record.id,
        patient_id: record.patient_id,
        type: templateType,
        status: 'pending'
      })
      .select()
      .single()

    if (logError) {
      console.warn("Failed to create log entry:", logError)
    }

    const logId = logEntry?.id

    // 4. Validate Phone before sending
    if (!patient.phone) {
      await updateLog(supabaseClient, logId, 'failed', 'Missing patient phone number')
      return new Response(JSON.stringify({ error: "Missing patient phone" }), { status: 200, headers: corsHeaders })
    }

    let toPhone = patient.phone.trim()
    // Formatting: ensuring + prefix
    if (!toPhone.startsWith('+')) {
      toPhone = '+' + toPhone.replace(/\\D/g, '')
    }

    const isWhatsApp = true; // Business requirement is always whatsapp
    const e164To = isWhatsApp ? `whatsapp:${toPhone}` : toPhone;

    // 5. Twilio Request
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      console.warn("Twilio credentials not configured, skipping actual dispatch.")
      await updateLog(supabaseClient, logId, 'failed', 'Missing Twilio credentials')
      return new Response(JSON.stringify({ message: "Twilio credentials missing, notification simulated." }), { headers: corsHeaders })
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
    const basicAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)
    
    // Twilio requires x-www-form-urlencoded
    const formData = new URLSearchParams()
    formData.append('To', e164To)
    formData.append('From', TWILIO_FROM)
    formData.append('Body', messageBody)

    const twilioRes = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    })

    const twilioData = await twilioRes.json()

    if (twilioRes.ok) {
      await updateLog(supabaseClient, logId, 'sent', null, twilioData.sid)
      return new Response(JSON.stringify({ success: true, sid: twilioData.sid }), { headers: corsHeaders })
    } else {
      await updateLog(supabaseClient, logId, 'failed', twilioData.message || 'Twilio Error')
      return new Response(JSON.stringify({ error: "Twilio API error", details: twilioData }), { status: 500, headers: corsHeaders })
    }

  } catch (error: any) {
    console.error("Webhook processing error:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})

async function updateLog(client: any, logId: string, status: string, error_msg: string | null = null, sid: string | null = null) {
  if (!logId) return
  await client
    .from('notification_logs')
    .update({ status, error_message: error_msg, message_sid: sid, updated_at: new Date().toISOString() })
    .eq('id', logId)
}
