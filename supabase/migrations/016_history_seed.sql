-- 016_history_seed.sql
-- Extra history for James Sterling to make the timeline look full

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
