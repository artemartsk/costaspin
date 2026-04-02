import { render, screen, waitFor, within } from '../../lib/test-utils';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ManualBookingModal } from '../ManualBookingModal';
import { server } from '../../test/setup';
import { http, HttpResponse } from 'msw';
import { queryClient } from '../../lib/test-utils';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
    }
}));

const mockPatients = [
    { id: 'pat-1', first_name: 'Carlos', last_name: 'García' },
];

const mockPractitioners = [
    { id: 'pract-1', first_name: 'James', last_name: 'Wilson', sub_specialties: ['chiropractic'] },
    { id: 'pract-2', first_name: 'Sarah', last_name: 'Chen', sub_specialties: ['physiotherapy', 'assessment'] },
];

const mockServices = [
    { id: 'srv-1', name: 'Chiropractic Adjustment', duration_minutes: 30, category: 'chiropractic' },
    { id: 'srv-2', name: 'Physiotherapy Session', duration_minutes: 60, category: 'physiotherapy' },
    { id: 'srv-3', name: 'Initial Assessment', duration_minutes: 45, category: 'assessment' },
];

const mockRooms = [
    { id: 'room-1', name: 'Room 1' },
    { id: 'room-2', name: 'Room 2' },
];

describe('ManualBookingModal Integration & TDD', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        queryClient.clear();

        server.use(
            http.get('*/rest/v1/patients', () => HttpResponse.json(mockPatients)),
            http.get('*/rest/v1/practitioners', () => HttpResponse.json(mockPractitioners)),
            http.get('*/rest/v1/services', () => HttpResponse.json(mockServices)),
            http.get('*/rest/v1/rooms', () => HttpResponse.json(mockRooms)),
            http.get('*/rest/v1/appointments', () => HttpResponse.json([])),
            http.get('*/rest/v1/locations', () => HttpResponse.json([]))
        );
    });

    afterEach(() => {
        server.resetHandlers();
    });

    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        bookingSlot: { date: new Date(2026, 3, 6, 0, 0, 0), hour: 10, startMin: 0 },
        selectedLocationId: 'loc-1',
        preselectedPractitionerId: 'pract-1'
    };

    /**
     * Helper to select an option in a Radix dropdown securely.
     */
    async function selectRadixOption(user: any, comboboxIndex: number, optionText: RegExp | string) {
        const triggers = screen.getAllByRole('combobox');
        if (comboboxIndex >= triggers.length) throw new Error(`Combobox index ${comboboxIndex} not found`);
        const trigger = triggers[comboboxIndex];
        await user.click(trigger);
        
        const option = await screen.findByText(optionText);
        await user.click(option);
    }

    // Combobox Indices when Existing Patient tab is active:
    // 0: Patient, 1: Practitioner, 2: Service, 3: Room

    // Combobox Indices when New Patient tab is active:
    // 0: Practitioner, 1: Service, 2: Room

    describe('TC-01: Existing Patient Success POST', () => {
        it('should correctly build and dispatch manual appointment POST', async () => {
            const user = userEvent.setup();
            
            let grabbedAppointmentPayload: any = null;
            server.use(
                http.post('*/rest/v1/appointments', async ({ request }) => {
                    grabbedAppointmentPayload = await request.json();
                    return HttpResponse.json({ id: 'new-apt-1' }, { status: 201 });
                })
            );

            render(<ManualBookingModal {...defaultProps} />);

            expect(screen.getByText(/10:00/i)).toBeInTheDocument();

            // Setup: wait for patients to load so we don't click too early
            await waitFor(() => {
                const triggers = screen.getAllByRole('combobox');
                expect(triggers.length).toBeGreaterThanOrEqual(4);
            });

            // 1. Select patient (index 0)
            await selectRadixOption(user, 0, /Carlos García/i);

            // Practitioner is auto-filled to index 1 "James Wilson".
            
            // 2. Select Service (index 2)
            await selectRadixOption(user, 2, /Chiropractic Adjustment/i);

            // 3. Select Room (index 3)
            await selectRadixOption(user, 3, /Room 1/i);

            // 4. Click Save
            await user.click(screen.getByRole('button', { name: /Save Booking/i }));

            // 5. Assertions
            await waitFor(() => {
                expect(grabbedAppointmentPayload).toBeDefined();
            });

            expect(grabbedAppointmentPayload.patient_id).toBe('pat-1');
            expect(grabbedAppointmentPayload.practitioner_id).toBe('pract-1');
            expect(grabbedAppointmentPayload.service_id).toBe('srv-1');
            expect(grabbedAppointmentPayload.room_id).toBe('room-1');
            expect(grabbedAppointmentPayload.booking_source).toBe('manual');
            
            expect(toast.success).toHaveBeenCalledWith('Appointment created successfully');
            expect(defaultProps.onClose).toHaveBeenCalled();
        });
    });

    describe('TC-02: Inline New Patient Creation', () => {
        it('should execute both Patient POST and Appointment POST sequentially', async () => {
            const user = userEvent.setup();

            let patientPayload: any = null;
            let aptPayload: any = null;

            server.use(
                http.post('*/rest/v1/patients', async ({ request }) => {
                    patientPayload = await request.json();
                    return HttpResponse.json({ id: 'pat-new-99' }, { status: 201 });
                }),
                http.post('*/rest/v1/appointments', async ({ request }) => {
                    aptPayload = await request.json();
                    return HttpResponse.json({ id: 'new-apt-2' }, { status: 201 });
                })
            );

            render(<ManualBookingModal {...defaultProps} />);

            await user.click(screen.getByRole('tab', { name: /Create New Patient/i }));

            // Now Combobox Indices: 0: Practitioner, 1: Service, 2: Room
            await waitFor(() => {
                expect(screen.getAllByRole('combobox').length).toBe(3);
            });

            await user.type(screen.getByPlaceholderText('First Name *'), 'John');
            await user.type(screen.getByPlaceholderText('Last Name *'), 'Doe');
            await user.type(screen.getByPlaceholderText('Phone Number *'), '123456789');
            await user.type(screen.getByPlaceholderText('Email (Optional)'), 'john@example.com');

            // Select Service (index 1)
            await selectRadixOption(user, 1, /Chiropractic Adjustment/i);
            // Select Room (index 2)
            await selectRadixOption(user, 2, /Room 2/i);

            // Save
            await user.click(screen.getByRole('button', { name: /Save Booking/i }));

            await waitFor(() => {
                expect(patientPayload).toBeDefined();
                expect(aptPayload).toBeDefined();
            });

            expect(patientPayload.first_name).toBe('John');
            expect(patientPayload.email).toBe('john@example.com');
            expect(patientPayload.phone).toBe('123456789');
            expect(aptPayload.patient_id).toBe('pat-new-99');
            expect(toast.success).toHaveBeenCalled();
        });
    });

    describe('TC-03: Conflict Validation', () => {
        it('should block save and show specific toast error if conflicting appointment exists', async () => {
            const user = userEvent.setup();

            server.use(
                http.get('*/rest/v1/appointments', () => {
                    return HttpResponse.json([{
                        id: 'existing-conflict-1',
                        start_time: new Date(2026, 3, 6, 10, 0, 0).toISOString(),
                        end_time: new Date(2026, 3, 6, 11, 0, 0).toISOString(),
                        practitioner_id: 'pract-1', // Overlaps
                        room_id: 'room-5'
                    }]);
                }),
                http.post('*/rest/v1/appointments', () => HttpResponse.json({}, { status: 201 }))
            );

            render(<ManualBookingModal {...defaultProps} />);

            await waitFor(() => expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(4));

            // Select Patient (0), Service (2), Room (3)
            await selectRadixOption(user, 0, /Carlos García/i);
            await selectRadixOption(user, 2, /Chiropractic Adjustment/i);
            await selectRadixOption(user, 3, /Room 1/i);

            await user.click(screen.getByRole('button', { name: /Save Booking/i }));

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Booking Conflict: Practitioner is already booked at this time.'));
            });

            expect(defaultProps.onClose).not.toHaveBeenCalled();
        });
    });

    // ============================================
    // THE FOLLOWING TESTS WILL FAIL (TDD Acceptance)
    // ============================================

    describe('TC-04: Practitioner Sub-Specialties Filter (TDD)', () => {
        it('should strictly limit the visible services based on the selected practitioner logic', async () => {
            const user = userEvent.setup();
            
            // Render with Dr. Sarah Chen (Handles: physiotherapy, assessment)
            render(<ManualBookingModal {...defaultProps} preselectedPractitionerId="pract-2" />);

            await waitFor(() => {
                expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(4);
            });

            // Open the Services Dropdown (index 2)
            const triggers = screen.getAllByRole('combobox');
            await user.click(triggers[2]); 

            const listbox = await screen.findByRole('listbox');
            
            // Expected to FAIL: Modal currently returns all services.
            // Sarah Chen should NOT be able to do Chiropractic
            expect(within(listbox).queryByText(/Chiropractic Adjustment/i)).not.toBeInTheDocument();
        });
    });

    describe('TC-05: Rooms Filtering Constraints (TDD)', () => {
        it('should display an empty/warning state or filter out unavailable rooms', async () => {
            const user = userEvent.setup();

            // Mock that ALL rooms are occupied via existing appointments at 10:00
            server.use(
                http.get('*/rest/v1/appointments', () => {
                    return HttpResponse.json([
                        {
                            id: 'conflict-room1',
                            start_time: new Date(2026, 3, 6, 10, 0, 0).toISOString(),
                            end_time: new Date(2026, 3, 6, 11, 0, 0).toISOString(),
                            practitioner_id: 'some-other-pract',
                            room_id: 'room-1'
                        },
                        {
                            id: 'conflict-room2',
                            start_time: new Date(2026, 3, 6, 10, 0, 0).toISOString(),
                            end_time: new Date(2026, 3, 6, 11, 0, 0).toISOString(),
                            practitioner_id: 'yet-another-pract',
                            room_id: 'room-2'
                        }
                    ]);
                })
            );

            render(<ManualBookingModal {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(4);
            });

            // Service is index 2. Set duration to 30 mins.
            await selectRadixOption(user, 2, /Chiropractic Adjustment/i);

            // Attempt to look for rooms (index 3)
            const triggers = screen.getAllByRole('combobox');
            await user.click(triggers[3]); 

            const listbox = await screen.findByRole('listbox');

            // Expected to FAIL: Modal currently lists all rooms continuously
            expect(within(listbox).queryByText(/Room 1/i)).not.toBeInTheDocument();
            expect(within(listbox).queryByText(/Room 2/i)).not.toBeInTheDocument();
        });
    });
});
