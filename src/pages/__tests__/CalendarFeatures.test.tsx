import { render, screen, waitFor } from '../../lib/test-utils';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import CalendarPage from '../Calendar';
import { server } from '../../test/setup';
import { http, HttpResponse } from 'msw';
import { queryClient } from '../../lib/test-utils';
import userEvent from '@testing-library/user-event';

const mockLocations = [
    { id: 'loc-1', name: 'CostaSpine Elviria' },
    { id: 'loc-2', name: 'CostaSpine Marbella' }
];

describe('Calendar Features (Manager Report) & MSW Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        queryClient.clear();
        server.use(
            http.get('*/rest/v1/locations', () => HttpResponse.json(mockLocations)),
            http.get('*/rest/v1/practitioners', () => HttpResponse.json([{ id: 'pract-1', first_name: 'Dr', last_name: 'Smith' }])),
            http.get('*/rest/v1/rooms', () => HttpResponse.json([])),
            http.get('*/rest/v1/practitioner_schedules', () => HttpResponse.json([]))
        );
    });

    describe('1. Global Location Filter Strictness', () => {
        it('should render a Location Select dropdown', async () => {
            render(<CalendarPage />);
            await waitFor(() => {
                expect(screen.getByText(/All Locations|CostaSpine Elviria/i)).toBeInTheDocument();
            });
        });
    });

    describe('2. Booking Source Transparency', () => {
        it('should render an AI icon for ai_phone source bookings', async () => {
            const date = new Date();
            date.setHours(10, 0, 0, 0);

            server.use(
                http.get('*/rest/v1/appointments', () => {
                    return HttpResponse.json([{
                        id: 'evt-ai',
                        start_time: date.toISOString(),
                        end_time: new Date(date.getTime() + 3600000).toISOString(),
                        practitioner_id: 'pract-1',
                        room_id: 'room-1',
                        patient: { first_name: 'Robot', last_name: 'AI' },
                        booking_source: 'ai_phone',
                        location_id: 'loc-1'
                    }]);
                })
            );

            render(<CalendarPage />);
            await waitFor(() => {
                expect(screen.getByTestId('badge-source-ai')).toBeInTheDocument();
            });
        });

        it('should render a WhatsApp icon for whatsapp source bookings', async () => {
            const date = new Date();
            date.setHours(11, 0, 0, 0);

            server.use(
                http.get('*/rest/v1/appointments', () => {
                    return HttpResponse.json([{
                        id: 'evt-wa',
                        start_time: date.toISOString(),
                        end_time: new Date(date.getTime() + 3600000).toISOString(),
                        practitioner_id: 'pract-1',
                        room_id: 'room-1',
                        patient: { first_name: 'John', last_name: 'Chat' },
                        booking_source: 'whatsapp',
                        location_id: 'loc-1'
                    }]);
                })
            );

            render(<CalendarPage />);
            await waitFor(() => {
                expect(screen.getByTestId('badge-source-wa')).toBeInTheDocument();
            });
        });
    });

    describe('3. Roster & Availability shading', () => {
        it('should correctly shade out non-working hours dynamically', async () => {
            const user = userEvent.setup();
            
            server.use(
                http.get('*/rest/v1/practitioner_schedules', () => {
                    return HttpResponse.json([{
                        id: 'sched-1',
                        practitioner_id: 'pract-1',
                        day_of_week: 1, // Mon
                        start_time: '09:00:00', 
                        end_time: '17:00:00',
                        is_working_day: true
                    }]);
                })
            );

            render(<CalendarPage />);

            // Select the practitioner from Radix Select
            const triggers = await screen.findAllByRole('combobox');
            // triggers[1] is the Practitioner select based on DOM order
            await user.click(triggers[1]);
            
            // Wait for Radix SelectContent to render "Dr Smith"
            const drSmithOption = await screen.findByText('Dr Smith');
            await user.click(drSmithOption);

            await waitFor(() => {
                const shadedAreas = screen.getAllByTestId('roster-unavailable-cell');
                expect(shadedAreas.length).toBeGreaterThan(0);
            });
        });
    });
});
