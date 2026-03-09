// CostaSpine — Create Practitioner Account
// Supabase Edge Function: create-practitioner
//
// Creates an auth.users account + practitioners row + user_roles row.
// Requires admin role. Returns generated credentials.
//
// POST body: { email, password?, first_name, last_name, profession, ... }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generatePassword(length = 12): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
    let result = ''
    const arr = new Uint8Array(length)
    crypto.getRandomValues(arr)
    for (let i = 0; i < length; i++) {
        result += chars[arr[i] % chars.length]
    }
    return result
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Verify caller is admin
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

        const adminClient = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        const { data: { user: caller }, error: authError } = await supabase.auth.getUser()
        if (authError || !caller) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Check admin role
        const { data: roleData } = await adminClient
            .from('user_roles')
            .select('role')
            .eq('user_id', caller.id)
            .single()

        if (roleData?.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'Only admins can create practitioners' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const body = await req.json()
        const {
            email,
            password: customPassword,
            first_name,
            last_name,
            profession,
            phone,
            sub_specialties = [],
            skill_tags = [],
            max_patients_per_day = 12,
        } = body

        if (!email || !first_name || !last_name || !profession) {
            return new Response(JSON.stringify({
                error: 'Missing required fields: email, first_name, last_name, profession',
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Generate password if not provided
        const password = customPassword || generatePassword()

        // 1. Create auth user
        const { data: authUser, error: createError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: `${first_name} ${last_name}` },
        })

        if (createError) {
            return new Response(JSON.stringify({ error: `Auth error: ${createError.message}` }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const userId = authUser.user.id

        // 2. Create practitioner record
        const { data: practitioner, error: practError } = await adminClient
            .from('practitioners')
            .insert({
                user_id: userId,
                first_name,
                last_name,
                email,
                phone: phone || null,
                profession,
                sub_specialties,
                skill_tags,
                max_patients_per_day,
                is_active: true,
            })
            .select()
            .single()

        if (practError) {
            // Rollback: delete auth user if practitioner insert fails
            await adminClient.auth.admin.deleteUser(userId)
            return new Response(JSON.stringify({ error: `Practitioner error: ${practError.message}` }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // 3. Assign role
        const { error: roleError } = await adminClient
            .from('user_roles')
            .insert({
                user_id: userId,
                role: 'practitioner',
            })

        if (roleError) {
            console.error('[CreatePractitioner] Role assignment error:', roleError)
        }

        // 4. Log the action
        await adminClient.from('audit_log').insert({
            user_id: caller.id,
            user_email: caller.email,
            action: 'create',
            table_name: 'practitioners',
            record_id: practitioner.id,
            new_data: { email, first_name, last_name, profession },
        })

        return new Response(JSON.stringify({
            success: true,
            practitioner,
            credentials: {
                email,
                password,
                note: 'Share these credentials securely with the practitioner. They should change their password on first login.',
            },
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error('[CreatePractitioner] Error:', error)
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
