// Triage Engine — maps symptoms to service categories and recommended practitioners
// Used by the Vapi webhook to route patients from AI phone calls

import type { TriageResult } from '@/types'

// Symptom → category mapping
const SYMPTOM_MAP: Record<string, TriageResult['category']> = {
    // Acute injury
    'acute': 'acute_injury',
    'sudden pain': 'acute_injury',
    'fell': 'acute_injury',
    'accident': 'acute_injury',
    'sprain': 'acute_injury',
    'twist': 'acute_injury',
    'whiplash': 'acute_injury',
    'just happened': 'acute_injury',

    // Chronic pain
    'chronic': 'chronic_pain',
    'long time': 'chronic_pain',
    'ongoing': 'chronic_pain',
    'months': 'chronic_pain',
    'years': 'chronic_pain',
    'keeps coming back': 'chronic_pain',
    'recurring': 'chronic_pain',
    'back pain': 'chronic_pain',
    'neck pain': 'chronic_pain',
    'headache': 'chronic_pain',
    'sciatica': 'chronic_pain',
    'stiffness': 'chronic_pain',

    // Sports injury
    'sports': 'sports_injury',
    'gym': 'sports_injury',
    'training': 'sports_injury',
    'running': 'sports_injury',
    'tennis': 'sports_injury',
    'football': 'sports_injury',
    'golf': 'sports_injury',
    'padel': 'sports_injury',
    'muscle strain': 'sports_injury',
    'pulled muscle': 'sports_injury',

    // Post-surgery
    'surgery': 'post_surgery',
    'operation': 'post_surgery',
    'post-op': 'post_surgery',
    'recovery': 'post_surgery',
    'rehabilitation': 'post_surgery',
    'rehab': 'post_surgery',
    'knee replacement': 'post_surgery',
    'hip replacement': 'post_surgery',

    // Relaxation
    'relax': 'relaxation',
    'stress': 'relaxation',
    'tension': 'relaxation',
    'massage': 'relaxation',
    'wellness': 'relaxation',
    'treat myself': 'relaxation',
}

// Category → recommended service ID mapping
export const CATEGORY_SERVICE_MAP: Record<TriageResult['category'], string> = {
    acute_injury: '40000000-0000-0000-0000-000000000002',    // Chiropractic Adjustment
    chronic_pain: '40000000-0000-0000-0000-000000000002',    // Chiropractic Adjustment
    sports_injury: '40000000-0000-0000-0000-000000000004',   // Sports Massage
    post_surgery: '40000000-0000-0000-0000-000000000006',    // Post-Surgery Rehab
    relaxation: '40000000-0000-0000-0000-000000000004',      // Sports Massage
}

// Category → skill_tag mapping for practitioner matching
export const CATEGORY_SKILL_MAP: Record<TriageResult['category'], string[]> = {
    acute_injury: ['acute_injury', 'sports_injury'],
    chronic_pain: ['chronic_pain'],
    sports_injury: ['sports_injury', 'relaxation'],
    post_surgery: ['post_surgery', 'rehab'],
    relaxation: ['relaxation'],
}

// Urgency keywords
const URGENCY_KEYWORDS: Record<string, TriageResult['urgency']> = {
    'urgent': 'immediate',
    'emergency': 'immediate',
    'right now': 'immediate',
    'today': 'immediate',
    'asap': 'immediate',
    'this week': 'soon',
    'soon': 'soon',
    'when possible': 'routine',
    'routine': 'routine',
    'check-up': 'routine',
    'follow-up': 'routine',
}

/**
 * Analyse free-text symptoms/description and return triage result
 */
export function triageFromText(text: string): TriageResult {
    const lower = text.toLowerCase()
    const matchedSymptoms: string[] = []
    const categoryCounts: Record<string, number> = {}

    // Match symptoms
    for (const [keyword, category] of Object.entries(SYMPTOM_MAP)) {
        if (lower.includes(keyword)) {
            matchedSymptoms.push(keyword)
            categoryCounts[category] = (categoryCounts[category] || 0) + 1
        }
    }

    // Determine primary category (most matches wins)
    let category: TriageResult['category'] = 'chronic_pain' // default
    let maxCount = 0
    for (const [cat, count] of Object.entries(categoryCounts)) {
        if (count > maxCount) {
            maxCount = count
            category = cat as TriageResult['category']
        }
    }

    // Determine urgency
    let urgency: TriageResult['urgency'] = 'routine'
    for (const [keyword, urg] of Object.entries(URGENCY_KEYWORDS)) {
        if (lower.includes(keyword)) {
            urgency = urg
            break
        }
    }

    return {
        category,
        urgency,
        symptoms: matchedSymptoms,
        recommended_service_id: CATEGORY_SERVICE_MAP[category],
        matched_practitioner_id: null, // filled by matching engine
    }
}

/**
 * Extract structured data from Vapi call transcript
 */
export function extractPatientData(transcript: string): {
    name?: string
    phone?: string
    symptoms: string[]
    urgency: TriageResult['urgency']
    language: string
} {
    const lower = transcript.toLowerCase()

    // Simple language detection
    const spanishIndicators = ['hola', 'dolor', 'cita', 'necesito', 'bueno', 'gracias']
    const isSpanish = spanishIndicators.some((w) => lower.includes(w))

    const triage = triageFromText(transcript)

    return {
        symptoms: triage.symptoms,
        urgency: triage.urgency,
        language: isSpanish ? 'es' : 'en',
    }
}
