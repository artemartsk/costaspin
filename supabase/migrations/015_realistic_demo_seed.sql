-- 015_realistic_demo_seed.sql
-- Seed script for realistic patient: James Sterling (Expat in Marbella)

INSERT INTO public.patients (id, first_name, last_name, email, phone, source, language, forms_completed, medical_data_consent, marketing_consent, visit_count, notes)
VALUES (
    '88888888-8888-8888-8888-888888888888', 
    'James', 
    'Sterling', 
    'j.sterling.marbella@gmail.com', 
    '+34 644 555 777', 
    'ai_phone', 
    'en', 
    true, 
    true, 
    true, 
    1,
    'Client is a 45-year-old British expat living in Elviria. Complains of chronic neck stiffness (tech neck).'
) ON CONFLICT (id) DO NOTHING;

-- Clinical Notes (SOAP)
INSERT INTO public.clinical_notes (patient_id, practitioner_id, appointment_id, subjective, objective, assessment, plan)
VALUES (
    '88888888-8888-8888-8888-888888888888',
    '11111111-1111-1111-1111-111111111111', -- Dr. Sarah
    NULL,
    'Patient complains of sharp pain in the C5-C6 region when turning head to the right. Sitting at a desk 8+ hours a day.',
    'Restricted cervical rotation to the right (approx 40 degrees). Hypertonicity in levator scapulae and upper trapezius bilaterally.',
    'Cervical facet restriction and postural strain syndrome (forward head posture).',
    '1. High-velocity low-amplitude (HVLA) thrust to C5. 2. Myofascial release on upper traps. 3. Prescribed ergonomic setup changes.'
);

-- WhatsApp Thread
INSERT INTO public.whatsapp_threads (patient_id, phone_number, status, messages, created_at, updated_at)
VALUES (
    '88888888-8888-8888-8888-888888888888',
    '+34 644 555 777',
    'active',
    '[
        {"role": "user", "content": "Hello, do you treat tech neck? My neck is completely stiff."},
        {"role": "assistant", "content": "Hi James! This is the CostaSpine AI. Yes, we absolutely treat neck stiffness and postural issues. Our chiropractors are experts in adjusting cervical restrictions. Would you like to check availability for this week?"},
        {"role": "user", "content": "Yes, Thursday afternoon if possible."},
        {"role": "assistant", "content": "I have an opening this Thursday at 4:00 PM or 5:30 PM with Dr. Sarah. Which one suits you best?"},
        {"role": "user", "content": "4:00 PM is great."},
        {"role": "assistant", "content": "Perfect. You are booked for Thursday at 4:00 PM. We will send you a reminder 24h before."}
    ]'::jsonb,
    now() - interval '1 day',
    now() - interval '1 day'
);

-- Call Logs
INSERT INTO public.call_logs (patient_id, vapi_call_id, direction, status, created_at, duration_seconds, recording_url, transcript)
VALUES (
    '88888888-8888-8888-8888-888888888888',
    'call_inbound_sterling',
    'inbound',
    'completed',
    now() - interval '2 days',
    120,
    'https://actions.google.com/sounds/v1/water/rain_on_roof.ogg',
    'CostaSpine Bot: Hello! Thank you for calling CostaSpine Elviria. How can I assist you?
Patient: Hi, I wanted to confirm that your clinic is located near the Don Carlos hotel?
CostaSpine Bot: Yes, we are located right in the heart of Elviria, very close to the Don Carlos area. There is plenty of parking outside.
Patient: Excellent, thank you. I am booking an appointment now via WhatsApp.'
);
