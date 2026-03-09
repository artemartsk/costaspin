// CostaSpine — Call Recordings Cleanup (GDPR Data Retention)
// Supabase Edge Function: cleanup-recordings
//
// Runs as a cron job to redact call recordings older than 90 days.
// Keeps metadata for analytics but removes PII (phone, transcript, recording URL).

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

        // Calculate 90 days ago
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - 90)
        const cutoffISO = cutoffDate.toISOString()

        // Find records to redact
        const { data: toRedact, error: fetchError } = await supabase
            .from('call_logs')
            .select('id, caller_phone')
            .lt('created_at', cutoffISO)
            .not('transcript', 'is', null)
            .neq('transcript', '[REDACTED — retention period expired]')

        if (fetchError) {
            console.error('[Cleanup] Fetch error:', fetchError)
            return new Response(JSON.stringify({ error: fetchError.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        if (!toRedact || toRedact.length === 0) {
            return new Response(JSON.stringify({
                message: 'No records to redact',
                checked_before: cutoffISO,
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Redact each record
        let redactedCount = 0
        for (const record of toRedact) {
            const maskedPhone = record.caller_phone
                ? record.caller_phone.slice(0, 4) + '****'
                : null

            const { error: updateError } = await supabase
                .from('call_logs')
                .update({
                    transcript: '[REDACTED — retention period expired]',
                    recording_url: null,
                    caller_phone: maskedPhone,
                })
                .eq('id', record.id)

            if (!updateError) redactedCount++
        }

        // Log the cleanup action
        await supabase.from('audit_log').insert({
            action: 'delete',
            table_name: 'call_logs',
            new_data: {
                reason: 'GDPR data retention policy — 90 day TTL',
                records_redacted: redactedCount,
                cutoff_date: cutoffISO,
            },
        })

        console.log(`[Cleanup] Redacted ${redactedCount} call log records older than 90 days`)

        return new Response(JSON.stringify({
            success: true,
            records_redacted: redactedCount,
            cutoff_date: cutoffISO,
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error('[Cleanup] Error:', error)
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
