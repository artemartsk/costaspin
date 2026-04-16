-- 014_emr_demo_data.sql
-- Seed script for populating the CostaSpine EMR system with realistic UI data.

CREATE TABLE IF NOT EXISTS public.clinical_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE RESTRICT,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    subjective TEXT,
    objective TEXT,
    assessment TEXT,
    plan TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'handed_to_human')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  vapi_call_id TEXT,
  direction TEXT CHECK (direction IN ('inbound', 'outbound')),
  status TEXT CHECK (status IN ('completed', 'failed', 'in_progress', 'no_answer')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_seconds INT,
  recording_url TEXT,
  transcript TEXT,
  summary TEXT,
  extracted_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

    -- Location
    INSERT INTO public.locations (id, name, address, phone, timezone)
    VALUES ('33333333-3333-3333-3333-333333333333', 'CostaSpine Elviria', 'C. de los Almendros, 1', '+34 600 000 000', 'Europe/Madrid')
    ON CONFLICT (id) DO NOTHING;

    -- Room
    INSERT INTO public.rooms (id, location_id, name, type)
    VALUES ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'Room 1 (Chiropractic)', 'chiropractic')
    ON CONFLICT (id) DO NOTHING;

    -- Practitioner
    INSERT INTO public.practitioners (id, first_name, last_name, profession, sub_specialties, skill_tags)
    VALUES ('11111111-1111-1111-1111-111111111111', 'Dr. Sarah', 'Jennings', 'Chiropractor', '{"Sports Injuries", "Spinal Adjustments"}', '{"cervical_spine", "sciatica"}')
    ON CONFLICT (id) DO NOTHING;

    -- Patient 1: Fully onboarded with EMR history
    INSERT INTO public.patients (id, first_name, last_name, email, phone, source, language, forms_completed, medical_data_consent, marketing_consent, visit_count, notes)
    VALUES (
        '44444444-4444-4444-4444-444444444444', 
        'Marcus', 
        'Aurelius', 
        'marcus@stoic.com', 
        '+44 7700 900077', 
        'ai_phone', 
        'en', 
        true, 
        true, 
        false, 
        4,
        'Patient presented with chronic lower back pain. Historically active in sports (tennis).'
    ) ON CONFLICT (id) DO NOTHING;

    -- Patient 2: Pending forms
    INSERT INTO public.patients (id, first_name, last_name, email, phone, source, language, forms_completed, medical_data_consent, visit_count)
    VALUES (
        '55555555-5555-5555-5555-555555555555', 
        'Elena', 
        'Martinez', 
        'elena.m@gmail.com', 
        '+34 611 222 333', 
        'whatsapp', 
        'es', 
        false, 
        false, 
        0
    ) ON CONFLICT (id) DO NOTHING;

    -- Patient 1: Clinical Notes (SOAP)
    INSERT INTO public.clinical_notes (patient_id, practitioner_id, appointment_id, subjective, objective, assessment, plan)
    VALUES (
        '44444444-4444-4444-4444-444444444444',
        '11111111-1111-1111-1111-111111111111',
        NULL,
        'Patient reports persistent ache in L4-L5 region after playing tennis 3 days ago. Pain is 6/10 dull.',
        'Decreased ROM in lumbar extension. Hypertonicity in right QL and erector spinae. Palpation tender at L5.',
        'Acute lumbar facet syndrome vs muscular strain secondary to athletic overexertion.',
        '1. Spinal adjustment (Diversified) L4/L5
2. Soft tissue work on right QL (10 mins)
3. Prescribed McKenzie extension exercises
4. RICE protocol for 48 hours. Follow up in 1 week.'
    );

    -- Patient 1: WhatsApp Thread
    INSERT INTO public.whatsapp_threads (patient_id, phone_number, status, messages, created_at, updated_at)
    VALUES (
        '44444444-4444-4444-4444-444444444444',
        '+44 7700 900077',
        'active',
        '[
            {"role": "user", "content": "Hi! Can I book an appointment for tomorrow? My back is killing me."},
            {"role": "assistant", "content": "Hello Marcus! I am the CostaSpine AI assistant. I can definitely help with that. Dr. Sarah has an opening tomorrow at 10:30 AM or 2:00 PM. Do either of those work for you?"},
            {"role": "user", "content": "10:30 AM is perfect."},
            {"role": "assistant", "content": "Excellent. I have booked your appointment for tomorrow at 10:30 AM with Dr. Sarah. Please remember to complete your intake forms using the link sent to your email. See you tomorrow!"}
        ]'::jsonb,
        now() - interval '2 days',
        now() - interval '2 days'
    );

    -- Patient 1: Call Logs (Inbound & Outbound)
    INSERT INTO public.call_logs (patient_id, vapi_call_id, direction, status, started_at, duration_seconds, recording_url, transcript)
    VALUES (
        '44444444-4444-4444-4444-444444444444',
        'call_inbound_xyz',
        'inbound',
        'completed',
        now() - interval '5 days',
        185,
        'https://actions.google.com/sounds/v1/water/rain_on_roof.ogg',
        'CostaSpine Bot: Hello! Thank you for calling CostaSpine Elviria. How can I help you today?
Patient: Hi, I need to know if you provide sports massage.
CostaSpine Bot: Yes, we absolutely do! Our clinicians specialize in sports injuries and deep tissue massage. Would you like to schedule a session?
Patient: Not right now, I will check your website first. Thanks.
CostaSpine Bot: No problem! You can book directly on our website or call back anytime. Have a great day.'
    );

    INSERT INTO public.call_logs (patient_id, vapi_call_id, direction, status, started_at, duration_seconds, recording_url, transcript)
    VALUES (
        '44444444-4444-4444-4444-444444444444',
        'call_outbound_qwe',
        'outbound',
        'no_answer',
        now() - interval '1 day',
        25,
        NULL,
        NULL
    );
