import { render, screen, waitFor, within } from '../../lib/test-utils';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import CalendarPage from '../Calendar';
import { server } from '../../test/setup';
import { http, HttpResponse } from 'msw';
import { queryClient } from '../../lib/test-utils';
import userEvent from '@testing-library/user-event';
import { format, startOfWeek, addWeeks } from 'date-fns';

const mockLocations = [{ id: 'loc-1', name: 'Location 1' }];
const mockPractitioners = [{ id: 'pract-1', first_name: 'James', last_name: 'Wilson' }];

describe('Calendar Navigation & DatePicker (TASK_QA_06)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Set date exactly to Mon, April 6, 2026.
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(2026, 3, 6, 12, 0, 0)); 
        queryClient.clear();

        server.use(
            http.get('*/rest/v1/locations', () => HttpResponse.json(mockLocations)),
            http.get('*/rest/v1/practitioners', () => HttpResponse.json(mockPractitioners)),
            http.get('*/rest/v1/appointments', () => HttpResponse.json([])),
            http.get('*/rest/v1/rooms', () => HttpResponse.json([])),
            http.get('*/rest/v1/services', () => HttpResponse.json([])),
            http.get('*/rest/v1/practitioner_schedules', () => HttpResponse.json([]))
        );
    });

    afterEach(() => {
        server.resetHandlers();
        vi.useRealTimers();
    });

    describe('TC-01 & TC-04: Header Layout & Today Button', () => {
        it('should correctly disable the Today button on the current week and render correct Week Range', async () => {
            render(<CalendarPage />);
            
            // Wait for mounting
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Today/i })).toBeInTheDocument();
            });

            const todayBtn = screen.getByRole('button', { name: /Today/i });
            expect(todayBtn).toBeDisabled();

            // Check range label (April 6 is Mon, Apr 11 is Sat)
            const expectedRange = `Apr 6 – Apr 11, 2026`;
            expect(screen.getByRole('button', { name: new RegExp(expectedRange, 'i') })).toBeInTheDocument();
        });

        it('should enable the Today button when navigating away, and teleport back when clicked', async () => {
            const user = userEvent.setup({ delay: null });
            render(<CalendarPage />);
            
            const todayBtn = await screen.findByRole('button', { name: /Today/i });
            
            // Navigate forward by 1 week using the > arrow
            // The arrows don't have text so we need to rely on their generic properties or icon.
            // Based on DOM, there is a chevron-right inside a button. 
            // In shadcn, we often grab buttons by class or position, but we can query by nearest icon or text.
            // To be precise, Next / Prev week buttons:
            const buttons = screen.getAllByRole('button');
            // Assuming the chevron right button is right before or after the Popover trigger
            // A safer way is to find the popover string, and use the prev button
            const nextWeekBtn = buttons.find(b => b.innerHTML.includes('lucide-chevron-right'));
            if(nextWeekBtn) await user.click(nextWeekBtn);

            // Now "Today" should be enabled
            await waitFor(() => {
                expect(todayBtn).not.toBeDisabled();
            });

            const newExpectedRange = `Apr 13 – Apr 18, 2026`;
            expect(screen.getByRole('button', { name: new RegExp(newExpectedRange, 'i') })).toBeInTheDocument();

            // Click Today
            await user.click(todayBtn);

            // Returns to disabled and current week
            await waitFor(() => {
                expect(todayBtn).toBeDisabled();
            });
            const expectedRange = `Apr 6 – Apr 11, 2026`;
            expect(screen.getByRole('button', { name: new RegExp(expectedRange, 'i') })).toBeInTheDocument();
        });
    });

    describe('TC-02 & TC-03: Popover Mounting & Date Selection', () => {
        it('should open DatePicker popover, allow date selection, update range, and close automatically', async () => {
            const user = userEvent.setup({ delay: null });
            render(<CalendarPage />);

            const rangeTrigger = await screen.findByRole('button', { name: /Apr 6 – Apr 11, 2026/i });
            
            // TC-02: Open Popover
            await user.click(rangeTrigger);

            // The calendar modal/popover mounts via Dialog or generic role. 
            // Shadcn DatePicker renders calendar inside a dialog/popover.
            const calendarDaysComponent = await screen.findByRole('grid'); // react-day-picker uses role grid
            expect(calendarDaysComponent).toBeInTheDocument();

            // TC-03: Pick Date 15 (which is Wed, Apr 15 2026) -> Next Week
            // react-day-picker v9 gives days "gridcell" or "button".
            // We need to specifically click the button inside the gridcell.
            const day15Cell = screen.getAllByRole('gridcell').find(cell => cell.textContent === '15' || cell.innerHTML.includes('15'));
            expect(day15Cell).toBeDefined();

            const day15Btn = within(day15Cell as HTMLElement).getByRole('button');
            await user.click(day15Btn);

            // Weekly label updates to the week of April 15 (Mon Apr 13 - Sat Apr 18)
            const expectedFutureRange = `Apr 13 – Apr 18, 2026`;
            await waitFor(() => {
                expect(screen.getByRole('button', { name: new RegExp(expectedFutureRange, 'i') })).toBeInTheDocument();
            });

            // Popover should close
            await waitFor(() => {
                expect(screen.queryByRole('grid')).not.toBeInTheDocument();
            });
        });
    });
});
