// Booking Engine — "Tetris" Algorithm
// Finds available time slots considering: practitioner schedule, room availability, existing bookings

import type { Appointment, Room, TimeSlot } from '@/types'

interface PractitionerSchedule {
    practitioner_id: string
    day_of_week: number
    start_time: string // "09:00"
    end_time: string   // "17:00"
}

interface BookingEngineInput {
    practitioner_id: string
    room_type: string
    duration_minutes: number
    date: Date
    schedules: PractitionerSchedule[]
    appointments: Appointment[]
    rooms: Room[]
}

/**
 * Parse "HH:MM" time string to Date on a given date
 */
function parseTime(date: Date, time: string): Date {
    const [h, m] = time.split(':').map(Number)
    const d = new Date(date)
    d.setHours(h, m, 0, 0)
    return d
}

/**
 * Get available time slots for a practitioner on a given date
 * Slot granularity: 15 minutes
 */
export function findAvailableSlots(input: BookingEngineInput): TimeSlot[] {
    const { practitioner_id, room_type, duration_minutes, date, schedules, appointments, rooms } = input

    const dayOfWeek = date.getDay() // 0=Sun, 1=Mon...

    // 1. Find practitioner's working hours on this day
    const schedule = schedules.find(
        (s) => s.practitioner_id === practitioner_id && s.day_of_week === dayOfWeek
    )
    if (!schedule) return [] // not working this day

    // 2. Get available rooms of the required type
    const eligibleRooms = rooms.filter(
        (r) => r.type === room_type && r.status !== 'maintenance'
    )
    if (eligibleRooms.length === 0) return []

    // 3. Get existing appointments for this practitioner on this date
    const practitionerApts = appointments.filter(
        (a) =>
            a.practitioner_id === practitioner_id &&
            a.status !== 'cancelled' &&
            isSameDay(new Date(a.start_time), date)
    )

    // 4. Generate 15-min slots within working hours
    const workStart = parseTime(date, schedule.start_time)
    const workEnd = parseTime(date, schedule.end_time)
    const slotDuration = 15 * 60 * 1000 // 15 min in ms
    const bookingDuration = duration_minutes * 60 * 1000

    const slots: TimeSlot[] = []

    for (
        let slotStart = workStart.getTime();
        slotStart + bookingDuration <= workEnd.getTime();
        slotStart += slotDuration
    ) {
        const start = new Date(slotStart)
        const end = new Date(slotStart + bookingDuration)

        // Check: no overlap with existing practitioner appointments
        const practitionerFree = !practitionerApts.some(
            (a) =>
                new Date(a.start_time).getTime() < end.getTime() &&
                new Date(a.end_time).getTime() > start.getTime()
        )
        if (!practitionerFree) continue

        // Check: at least one eligible room is free
        for (const room of eligibleRooms) {
            const roomApts = appointments.filter(
                (a) =>
                    a.room_id === room.id &&
                    a.status !== 'cancelled' &&
                    isSameDay(new Date(a.start_time), date)
            )
            const roomFree = !roomApts.some(
                (a) =>
                    new Date(a.start_time).getTime() < end.getTime() &&
                    new Date(a.end_time).getTime() > start.getTime()
            )
            if (roomFree) {
                slots.push({
                    start,
                    end,
                    practitioner_id,
                    room_id: room.id,
                })
                break // only need one room
            }
        }
    }

    return slots
}

/**
 * Find the next N available slots across multiple days
 */
export function findNextAvailableSlots(
    input: Omit<BookingEngineInput, 'date'>,
    startDate: Date,
    maxDays: number = 14,
    maxSlots: number = 5,
): TimeSlot[] {
    const results: TimeSlot[] = []
    const current = new Date(startDate)

    for (let i = 0; i < maxDays && results.length < maxSlots; i++) {
        const slots = findAvailableSlots({ ...input, date: new Date(current) })
        // Pick up to 2 slots per day (morning + afternoon)
        const morning = slots.find((s) => s.start.getHours() < 12)
        const afternoon = slots.find((s) => s.start.getHours() >= 12)
        if (morning) results.push(morning)
        if (afternoon && results.length < maxSlots) results.push(afternoon)
        current.setDate(current.getDate() + 1)
    }

    return results.slice(0, maxSlots)
}

function isSameDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    )
}
