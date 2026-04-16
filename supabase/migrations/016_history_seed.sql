-- 016_history_seed.sql
-- Extra history for James Sterling to make the timeline look full

-- Appointments
INSERT INTO public.appointments (id, patient_id, practitioner_id, location_id, service_id, start_time, end_time, status, booking_source, deposit_paid, created_at)
VALUES (
    gen_random_uuid(),
    '88888888-8888-8888-8888-888888888888',
    '11111111-1111-1111-1111-111111111111', 
    '10000000-0000-0000-0000-000000000000',
    '11111111-1234-1234-1234-000000000000', -- Diagnostic Assessment
    now() - interval '14 days',
    now() - interval '14 days' + interval '45 minutes',
    'attended',
    'ai_phone',
    true,
    now() - interval '16 days'
),
(
    gen_random_uuid(),
    '88888888-8888-8888-8888-888888888888',
    '11111111-1111-1111-1111-111111111111', 
    '10000000-0000-0000-0000-000000000000',
    '22222222-1234-1234-1234-000000000000', -- Standard Adjustment
    now() - interval '7 days',
    now() - interval '7 days' + interval '30 minutes',
    'attended',
    'web',
    true,
    now() - interval '8 days'
),
(
    gen_random_uuid(),
    '88888888-8888-8888-8888-888888888888',
    '11111111-1111-1111-1111-111111111111', 
    '10000000-0000-0000-0000-000000000000',
    '44444444-1234-1234-1234-000000000000', -- Deep Tissue Massage
    now() + interval '2 days',
    now() + interval '2 days' + interval '60 minutes',
    'confirmed',
    'whatsapp',
    true,
    now() - interval '1 day'
);

-- Extra Past Clinical Note
INSERT INTO public.clinical_notes (patient_id, practitioner_id, appointment_id, created_at, subjective, objective, assessment, plan)
VALUES (
    '88888888-8888-8888-8888-888888888888',
    '11111111-1111-1111-1111-111111111111', 
    NULL,
    now() - interval '14 days' + interval '50 minutes',
    'First visit. Deep tension in neck and shoulders. Sleep is compromised.',
    'Palpation reveals trigger points in QL and Traps. ROM limited.',
    'Initial diagnostic. Severe muscle tension contributing to cervicogenic headaches.',
    'Start with standard adjustments and heat therapy. Assigned stretching exercises.'
);
