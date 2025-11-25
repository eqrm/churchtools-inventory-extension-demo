import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '../../utils/custom-render';
import { HistoryTimeline } from '../../../components/common/HistoryTimeline';
import type { UseHistoryEventsResult } from '../../../utils/history/types';

const mockUseHistoryEvents = vi.hoisted(() => vi.fn());

vi.mock('../../../hooks/useHistoryEvents', () => ({
    useHistoryEvents: mockUseHistoryEvents,
}));

describe('HistoryTimeline', () => {
    beforeEach(() => {
        mockUseHistoryEvents.mockReset();
    });

    it('groups events by day and renders them in descending order', () => {
        mockUseHistoryEvents.mockReturnValue({
            events: [],
            groups: [
                {
                    date: '2025-10-11',
                    events: [
                        {
                            id: 'event-3',
                            entityId: 'booking-1',
                            entityType: 'booking',
                            occurredAt: '2025-10-11T13:15:00Z',
                            kind: 'status-change',
                            title: 'Booking confirmed',
                            description: 'Approved by coordinator',
                            actor: { id: 'person-2', name: 'Coordinator Carla' },
                        },
                    ],
                },
                {
                    date: '2025-10-10',
                    events: [
                        {
                            id: 'event-2',
                            entityId: 'booking-1',
                            entityType: 'booking',
                            occurredAt: '2025-10-10T09:30:00Z',
                            kind: 'updated',
                            title: 'Booking updated',
                            description: 'Adjusted quantity to 3 items',
                            actor: { id: 'person-1', name: 'Inventory Irene' },
                        },
                        {
                            id: 'event-1',
                            entityId: 'booking-1',
                            entityType: 'booking',
                            occurredAt: '2025-10-10T08:00:00Z',
                            kind: 'created',
                            title: 'Booking created',
                            description: 'Initial reservation submitted',
                            actor: { id: 'person-1', name: 'Inventory Irene' },
                        },
                    ],
                },
            ],
            isLoading: false,
            isError: false,
            error: null,
            refetch: vi.fn(),
        } satisfies UseHistoryEventsResult);

        render(
            <HistoryTimeline
                entityType="booking"
                entityId="booking-1"
                sources={[]}
                title="Booking History"
            />,
        );

        const dateHeadings = screen.getAllByTestId('history-group-date');
        expect(dateHeadings.map(element => element.textContent)).toEqual([
            'October 11, 2025',
            'October 10, 2025',
        ]);

        const eventTitles = screen.getAllByTestId('history-event-title');
        expect(eventTitles.map(element => element.textContent)).toEqual([
            'Booking confirmed',
            'Booking updated',
            'Booking created',
        ]);
    });

    it('renders an empty state message when no events exist', () => {
        mockUseHistoryEvents.mockReturnValue({
            events: [],
            groups: [],
            isLoading: false,
            isError: false,
            error: null,
            refetch: vi.fn(),
        } satisfies UseHistoryEventsResult);

        render(
            <HistoryTimeline
                entityType="booking"
                entityId="booking-1"
                sources={[]}
                emptyState="No history yet"
            />,
        );

        expect(screen.getByText('No history yet')).toBeInTheDocument();
    });
});
