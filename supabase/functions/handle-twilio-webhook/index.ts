// CostaSpine — Twilio WhatsApp Webhook Handler (Function Calling AI)
// Supabase Edge Function: handle-twilio-webhook

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Ensure the OpenAI messages limit isn't exceeded for huge conversations
const MAX_MESSAGES = 15;

const SYSTEM_PROMPT = `You are Sofia, an AI booking assistant at CostaSpine clinic in Elviria, Marbella.
You help patients book appointments. The clinic is open Mon-Fri 9:00-17:00, Sat 10:00-14:00.
Always respond in the same language the patient speaks (default to English). Keep messages brief (under 160 characters) and natural for WhatsApp.
If the patient wants to book, ask what kind of treatment they need (Chiropractic, Physiotherapy, Massage, etc.) and their preferred date.
Use the check_availability tool to see time slots. Offer 2 options.
Once they confirm a time, use the book_appointment tool.
Only offer Elviria location. You do NOT handle Guadalmina or Aloha.`

const TOOLS = [
    {
        type: "function",
        function: {
            name: "check_availability",
            description: "Check available appointment slots at CostaSpine Elviria.",
            parameters: {
                type: "object",
                properties: {
                    date: { type: "string", description: "Date to search in YYYY-MM-DD format" },
                    service_category: { type: "string", description: "One of: acute_injury, chronic_pain, sports_injury, post_surgery, relaxation" }
                },
                required: ["date"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "book_appointment",
            description: "Create an appointment for the patient.",
            parameters: {
                type: "object",
                properties: {
                    date: { type: "string", description: "YYYY-MM-DD" },
                    time: { type: "string", description: "HH:MM" },
                    service_id: { type: "string", description: "ID of the service/treatment (can be mocked if unknown)" },
                    practitioner_id: { type: "string", description: "ID of the practitioner returned from check_availability" },
                    room_id: { type: "string", description: "ID of the assigned room returned from check_availability" }
                },
                required: ["date", "time", "practitioner_id", "room_id", "service_id"]
            }
        }
    }
]

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
        
        console.log('[Twilio] Incoming from:', from, '| Body:', body)

        // Twilio Credentials
        const { data: settings } = await supabase.from('clinic_settings').select('twilio_settings').single()
        const twilioSettings = settings?.twilio_settings || {}
        const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || (twilioSettings as Record<string, string>).account_sid
        const authToken = Deno.env.get('TWILIO_AUTH_TOKEN') || (twilioSettings as Record<string, string>).auth_token
        const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER') || (twilioSettings as Record<string, string>).from_number

        // Resolve Patient
        let { data: patient } = await supabase.from('patients').select('id, first_name').eq('phone', from).single()
        let patientId = patient?.id

        if (!patientId) {
            const { data: newPatient } = await supabase.from('patients').insert({
                first_name: 'Patient',
                phone: from,
                source: 'whatsapp',
            }).select('id, first_name').single()
            patientId = newPatient?.id
            patient = newPatient
        }

        // Get or Create Thread Session
        let { data: thread } = await supabase.from('whatsapp_threads')
            .select('*').eq('phone_number', from).eq('status', 'active').single()
        
        let messages: any[] = []
        if (!thread) {
            messages = [{ role: 'system', content: SYSTEM_PROMPT.replace('Elviria', 'Elviria (Your known patient is named ' + patient?.first_name + ')') }]
            const { data: newThread } = await supabase.from('whatsapp_threads').insert({
                patient_id: patientId,
                phone_number: from,
                messages: messages
            }).select('*').single()
            thread = newThread
        } else {
            messages = thread.messages || []
        }

        // Append User Msg
        messages.push({ role: 'user', content: body })
        if (messages.length > MAX_MESSAGES) messages = [messages[0], ...messages.slice(-MAX_MESSAGES + 1)]

        const openaiKey = Deno.env.get('OPENAI_API_KEY')
        if (!openaiKey) throw new Error("OPENAI_API_KEY missing")

        // ─── INITIAL OPENAI CALL ───
        let openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${openaiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-5.4', // User requested newer model
                messages: messages,
                tools: TOOLS,
                tool_choice: "auto",
                temperature: 0.3,
            }),
        })
        
        let aiData = await openAiResponse.json()
        let responseMessage = aiData.choices?.[0]?.message
        if (!responseMessage) {
            throw new Error("Invalid response from OpenAI")
        }

        messages.push(responseMessage)

        // ─── PROCESS TOOL CALLS ───
        if (responseMessage.tool_calls) {
            for (const toolCall of responseMessage.tool_calls) {
                const functionName = toolCall.function.name
                const args = JSON.parse(toolCall.function.arguments)
                let toolResult = ""

                console.log(`[Twilio] Tool call: ${functionName}`, args)

                try {
                    const engineBaseUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/booking-engine`
                    if (functionName === 'check_availability') {
                        const qs = new URLSearchParams({
                            action: 'availability',
                            date: args.date,
                        })
                        if (args.service_category) qs.append('category', args.service_category)
                        
                        const r = await fetch(`${engineBaseUrl}?${qs.toString()}`)
                        const json = await r.json()
                        // Summarize to save tokens
                        toolResult = JSON.stringify(json.slots ? json.slots.slice(0, 3) : json)
                    } 
                    else if (functionName === 'book_appointment') {
                        const r = await fetch(`${engineBaseUrl}?action=book`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                patient_id: patientId,
                                patient_phone: from,
                                booking_source: 'whatsapp',
                                ...args
                            })
                        })
                        const json = await r.json()
                        toolResult = JSON.stringify(json)
                    }
                } catch (e) {
                    console.error("[Twilio] Tool exec error:", e)
                    toolResult = JSON.stringify({ error: "Failed to execute function" })
                }

                messages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    name: functionName,
                    content: toolResult
                })
            }

            // ─── SECOND PASS TO OPENAI ───
            openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${openaiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'gpt-5.4',
                    messages: messages,
                }),
            })
            aiData = await openAiResponse.json()
            responseMessage = aiData.choices?.[0]?.message
            if (responseMessage) messages.push(responseMessage)
        }

        // ─── SEND REPLY TO USER ───
        const replyText = responseMessage?.content || "I'm having a little trouble thinking. Please try again or call the clinic."
        
        if (accountSid && authToken && fromNumber) {
            await sendTwilioMessage(from, replyText, accountSid, authToken, fromNumber)
        }

        // ─── SAVE THREAD ───
        await supabase.from('whatsapp_threads')
            .update({ messages: messages })
            .eq('id', thread.id)

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
