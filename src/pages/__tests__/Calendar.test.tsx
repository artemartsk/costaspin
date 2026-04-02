import { render, screen, waitFor } from '../../lib/test-utils';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import CalendarPage from '../Calendar';
import { server } from '../../test/setup';
import { http, HttpResponse } from 'msw';
import { queryClient } from '../../lib/test-utils';

describe('Calendar Interactive Engine', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(2026, 3, 6, 0, 0, 0));
        queryClient.clear();
        
        server.use(
            http.get('*/rest/v1/locations', () => HttpResponse.json([{ id: 'loc-1', name: 'Location 1' }])),
            http.get('*/rest/v1/practitioner_schedules', () => HttpResponse.json([])),
            http.get('*/rest/v1/practitioners', () => HttpResponse.json([
                { id: 'pract-1', first_name: 'Dr', last_name: 'Smith' },
                { id: 'pract-2', first_name: 'Dr', last_name: 'Jones' }
            ])),
            http.get('*/rest/v1/rooms', () => HttpResponse.json([
                { id: 'room-1', name: 'Room 1' },
                { id: 'room-2', name: 'Room 2' }
            ]))
        );
    });

    it('should render the calendar grid correctly', async () => {
        server.use(
            http.get('*/rest/v1/appointments', () => HttpResponse.json([]))
        );
        
        render(<CalendarPage />);
        await waitFor(() => {
            expect(screen.getByText('Calendar')).toBeInTheDocument();
            expect(screen.getByText('CostaSpine · Week view')).toBeInTheDocument();
            expect(screen.getByText('08:00')).toBeInTheDocument();
            expect(screen.getByText('17:00')).toBeInTheDocument();
        });
    });

    it('should cluster overlapping events into separate lanes', async () => {
        const aptStart1 = new Date(2026, 3, 6, 9, 0, 0);
        const aptEnd1 = new Date(2026, 3, 6, 10, 0, 0);

        const aptStart2 = new Date(2026, 3, 6, 9, 30, 0);
        const aptEnd2 = new Date(2026, 3, 6, 10, 30, 0);

        server.use(
            http.get('*/rest/v1/appointments', () => {
                return HttpResponse.json([
                    {
                        id: 'evt-1',
                        start_time: aptStart1.toISOString(),
                        end_time: aptEnd1.toISOString(),
                        practitioner_id: 'pract-1',
                        room_id: 'room-1',
                        location_id: 'loc-1',
                        patient: { first_name: 'John', last_name: 'Doe' },
                        service: { name: 'Consult' },
                        booking_source: 'web'
                    },
                    {
                        id: 'evt-2',
                        start_time: aptStart2.toISOString(),
                        end_time: aptEnd2.toISOString(),
                        practitioner_id: 'pract-2',
                        room_id: 'room-2',
                        location_id: 'loc-1',
                        patient: { first_name: 'Jane', last_name: 'Smith' },
                        service: { name: 'Follow-up' },
                        booking_source: 'web'
                    }
                ]);
            })
        );

        render(<CalendarPage />);
        
        await waitFor(() => {
            expect(screen.getByText('John Doe')).toBeInTheDocument();
        });

        const event1 = screen.getByText('John Doe').closest('div');
        const event2 = screen.getByText('Jane Smith').closest('div');

        expect(event1).toBeInTheDocument();
        expect(event2).toBeInTheDocument();

        expect(event1?.style.width).toBe('calc(50% - 8px)');
        expect(event2?.style.width).toBe('calc(50% - 8px)');
        expect(event1?.style.left).toBe('calc(0% + 4px)');
        expect(event2?.style.left).toBe('calc(50% + 4px)');
    });
});
