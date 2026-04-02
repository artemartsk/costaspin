// CostaSpine — GDPR Data Management API
// Supabase Edge Function: gdpr-data
//
// Endpoints:
//   POST ?action=export     — export all patient data (Art. 20 portability)
//   POST ?action=anonymize  — anonymize patient data (Art. 17 erasure)
//   POST ?action=consent    — record/withdraw consent
//   GET  ?action=audit      — view audit log (admin only)

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
        // Use the user's JWT for RLS enforcement
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_ANON_KEY')!,
            { global: { headers: { Authorization: authHeader } } }
        )

        // Also create a service-role client for admin operations
        const adminClient = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        // Verify user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Get user role
        const { data: roleData } = await adminClient
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single()
        const userRole = roleData?.role || 'receptionist'

        const url = new URL(req.url)
        const action = url.searchParams.get('action')

        // ─── EXPORT PATIENT DATA (Art. 20) ──────────
        if (action === 'export' && req.method === 'POST') {
            if (userRole !== 'admin') {
                return new Response(JSON.stringify({ error: 'Only admins can export patient data' }), {
                    status: 403,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }

            const { patient_id } = await req.json()
            if (!patient_id) {
                return new Response(JSON.stringify({ error: 'patient_id required' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }

            const { data, error } = await adminClient.rpc('export_patient_data', {
                p_patient_id: patient_id,
            })

            if (error) {
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }

            // Log the export action
            await adminClient.from('audit_log').insert({
                user_id: user.id,
                user_email: user.email,
                action: 'export',
                table_name: 'patients',
                record_id: patient_id,
                ip_address: req.headers.get('x-forwarded-for') || 'unknown',
            })

            return new Response(JSON.stringify({
                success: true,
                data,
                format: 'GDPR_Article_20_Export',
                exported_at: new Date().toISOString(),
                exported_by: user.email,
            }), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                    'Content-Disposition': `attachment; filename="patient_data_${patient_id}.json"`,
                },
            })
        }

        // ─── ANONYMIZE PATIENT (Art. 17) ────────────
        if (action === 'anonymize' && req.method === 'POST') {
            if (userRole !== 'admin') {
                return new Response(JSON.stringify({ error: 'Only admins can anonymize patient data' }), {
                    status: 403,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }

            const { patient_id, reason } = await req.json()
            if (!patient_id) {
                return new Response(JSON.stringify({ error: 'patient_id required' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }

            // Execute anonymization
            const { error } = await adminClient.rpc('anonymize_patient', {
                p_patient_id: patient_id,
            })

            if (error) {
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }

            // Log the anonymization
            await adminClient.from('audit_log').insert({
                user_id: user.id,
                user_email: user.email,
                action: 'delete',
                table_name: 'patients',
                record_id: patient_id,
                new_data: { reason: reason || 'GDPR erasure request', requested_by: user.email },
                ip_address: req.headers.get('x-forwarded-for') || 'unknown',
            })

            return new Response(JSON.stringify({
                success: true,
                message: 'Patient data has been anonymized per GDPR Art. 17',
                patient_id,
                anonymized_at: new Date().toISOString(),
                note: 'Medical records retained for legal minimum period (5 years) per Ley 41/2002',
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // ─── RECORD / WITHDRAW CONSENT ──────────────
        if (action === 'consent' && req.method === 'POST') {
            const { patient_id, consent_type, granted } = await req.json()
            if (!patient_id || !consent_type) {
                return new Response(JSON.stringify({ error: 'patient_id and consent_type required' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }

            const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

            switch (consent_type) {
                case 'medical_data':
                    updates.medical_data_consent = granted
                    updates.medical_consent_date = granted ? new Date().toISOString() : null
                    if (!granted) updates.consent_withdrawn_at = new Date().toISOString()
                    break
                case 'marketing':
                    updates.marketing_consent = granted
                    updates.consent_date = granted ? new Date().toISOString() : null
                    break
                case 'data_processing':
                    updates.data_processing_consent = granted
                    updates.data_processing_consent_date = granted ? new Date().toISOString() : null
                    break
                default:
                    return new Response(JSON.stringify({ error: 'Invalid consent_type. Use: medical_data, marketing, data_processing' }), {
                        status: 400,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    })
            }

            const { error } = await adminClient
                .from('patients')
                .update(updates)
                .eq('id', patient_id)

            if (error) {
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }

            // Log consent change
            await adminClient.from('audit_log').insert({
                user_id: user.id,
                user_email: user.email,
                action: 'update',
                table_name: 'patients',
                record_id: patient_id,
                new_data: { consent_type, granted },
                ip_address: req.headers.get('x-forwarded-for') || 'unknown',
            })

            return new Response(JSON.stringify({
                success: true,
                consent_type,
                granted,
                recorded_at: new Date().toISOString(),
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // ─── VIEW AUDIT LOG (admin only) ────────────
        if (action === 'audit') {
            if (userRole !== 'admin') {
                return new Response(JSON.stringify({ error: 'Only admins can view audit logs' }), {
                    status: 403,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }

            const limit = parseInt(url.searchParams.get('limit') || '50')
            const table = url.searchParams.get('table') || undefined
            const recordId = url.searchParams.get('record_id') || undefined

            let query = adminClient
                .from('audit_log')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit)

            if (table) query = query.eq('table_name', table)
            if (recordId) query = query.eq('record_id', recordId)

            const { data, error } = await query

            if (error) {
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                })
            }

            return new Response(JSON.stringify({ audit_entries: data, total: data?.length || 0 }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        return new Response(JSON.stringify({
            error: 'Invalid action',
            available_actions: {
                export: { method: 'POST', body: 'patient_id', description: 'Export all patient data (GDPR Art. 20)' },
                anonymize: { method: 'POST', body: 'patient_id, reason?', description: 'Anonymize patient data (GDPR Art. 17)' },
                consent: { method: 'POST', body: 'patient_id, consent_type, granted', description: 'Record/withdraw consent' },
                audit: { method: 'GET', params: 'limit?, table?, record_id?', description: 'View audit log (admin only)' },
            },
        }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error('[GDPR] Error:', error)
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
