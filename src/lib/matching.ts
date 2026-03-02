// Practitioner Matching Engine
// Scores practitioners based on: skills (40%), availability (35%), gap-fill (25%)

import type { Practitioner, Appointment, PractitionerScore } from '@/types'
import { CATEGORY_SKILL_MAP } from '@/lib/triage'
import type { TriageResult } from '@/types'

interface MatchingInput {
    practitioners: Practitioner[]
    appointments: Appointment[]   // existing for the target date
    category: TriageResult['category']
    requestedDate: Date
    durationMinutes: number
}

/**
 * Score and rank practitioners for a given triage category and date
 * Returns sorted array (best fit first)
 */
export function matchPractitioners(input: MatchingInput): PractitionerScore[] {
    const { practitioners, appointments, category, requestedDate, durationMinutes } = input
    const requiredSkills = CATEGORY_SKILL_MAP[category]

    const scores: PractitionerScore[] = practitioners.map((p) => {
        // ─── SKILL SCORE (40%) ───
        const matchingSkills = p.skill_tags.filter((t) => requiredSkills.includes(t))
        const skill_score = requiredSkills.length > 0
            ? matchingSkills.length / requiredSkills.length
            : 0

        // ─── AVAILABILITY SCORE (35%) ───
        const dayAppointments = appointments.filter(
            (a) => a.practitioner_id === p.id && a.status !== 'cancelled'
        )
        const todayCount = dayAppointments.length
        const loadRatio = todayCount / p.max_patients_per_day
        const availability_score = Math.max(0, 1 - loadRatio)

        // ─── GAP-FILL SCORE (25%) ───
        // Prefer practitioners who have gaps that closely match the requested duration
        let gap_fill_score = 0.5 // neutral default
        if (dayAppointments.length > 0) {
            const sortedApts = [...dayAppointments].sort(
                (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
            )

            // Find gaps between appointments
            const gaps: number[] = []
            for (let i = 0; i < sortedApts.length - 1; i++) {
                const gapStart = new Date(sortedApts[i].end_time).getTime()
                const gapEnd = new Date(sortedApts[i + 1].start_time).getTime()
                const gapMinutes = (gapEnd - gapStart) / 60000
                if (gapMinutes >= durationMinutes) {
                    gaps.push(gapMinutes)
                }
            }

            if (gaps.length > 0) {
                // Prefer gap that is closest to the requested duration (tight fit = less wasted time)
                const bestGapFit = Math.min(...gaps.map((g) => Math.abs(g - durationMinutes)))
                gap_fill_score = Math.max(0, 1 - bestGapFit / 120) // normalize: 0-120 min waste
            } else if (todayCount === 0) {
                gap_fill_score = 0.7 // available all day, good but not a tight fit bonus
            } else {
                gap_fill_score = 0.2 // no suitable gaps
            }
        }

        // ─── WEIGHTED TOTAL ───
        const total_score =
            skill_score * 0.4 +
            availability_score * 0.35 +
            gap_fill_score * 0.25

        return {
            practitioner_id: p.id,
            skill_score,
            availability_score,
            gap_fill_score,
            total_score,
        }
    })

    // Sort best match first
    return scores.sort((a, b) => b.total_score - a.total_score)
}

/**
 * Get the best-matching practitioner for a triage result
 */
export function getBestPractitioner(
    practitioners: Practitioner[],
    appointments: Appointment[],
    category: TriageResult['category'],
    date: Date,
    durationMinutes: number,
): { practitioner_id: string; score: PractitionerScore } | null {
    const scores = matchPractitioners({
        practitioners,
        appointments,
        category,
        requestedDate: date,
        durationMinutes,
    })

    const best = scores[0]
    if (!best || best.total_score < 0.1) return null

    return { practitioner_id: best.practitioner_id, score: best }
}
