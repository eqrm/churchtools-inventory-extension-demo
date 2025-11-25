import { Tabs, Stack, Group, Text, Card, Button, Badge, Divider } from '@mantine/core';
import { IconClock } from '@tabler/icons-react';
import { useMemo } from 'react';
import { bookingStrings } from '../../i18n/bookingStrings';
import type { Booking } from '../../types/entities';
import { HistoryTimeline } from '../common/HistoryTimeline';
import { createBookingHistorySource } from '../../services/bookings/bookingHistory';
import { BookingParticipants } from './BookingParticipants';

interface BookingDetailsTabsProps {
    booking: Booking;
    onEdit?: () => void;
    onCheckOut?: () => void;
    onCheckIn?: () => void;
    onCancel?: () => void;
}

function formatDateRange(booking: Booking): string {
    const start = new Date(booking.startDate);
    const end = new Date(booking.endDate);

    const startStr = start.toLocaleDateString('en-US');
    const endStr = end.toLocaleDateString('en-US');

    if (startStr === endStr) {
        return startStr;
    }

    return `${startStr} → ${endStr}`;
}

function formatTimeRange(booking: Booking): string | null {
    if (!booking.startTime && !booking.endTime) {
        return null;
    }

    const start = booking.startTime ?? '00:00';
    const end = booking.endTime ?? '23:59';
    return `${start} → ${end}`;
}

function QuantityBadges({ booking }: { booking: Booking }) {
    if (!booking.quantity || booking.quantity <= 1) {
        return null;
    }

    return (
        <Stack gap="xs">
            <Text fw={500}>Allocated Quantity</Text>
            <Group gap="xs">
                <Badge color="blue" variant="light">
                    Requested: {booking.quantity}
                </Badge>
                <Badge color="green" variant="light">
                    Allocated: {booking.allocatedChildAssets?.length ?? 0}
                </Badge>
            </Group>
            {booking.allocatedChildAssets && booking.allocatedChildAssets.length > 0 ? (
                <Stack gap={4}>
                    {booking.allocatedChildAssets.map(asset => (
                        <Text key={asset.id} size="sm" c="dimmed">
                            {asset.assetNumber} — {asset.name}
                        </Text>
                    ))}
                </Stack>
            ) : null}
        </Stack>
    );
}

export function BookingDetailsTabs({
    booking,
    onEdit,
    onCheckOut,
    onCheckIn,
    onCancel,
}: BookingDetailsTabsProps) {
    const historySources = useMemo(() => [createBookingHistorySource(booking.id)], [booking.id]);
    const timeRange = formatTimeRange(booking);

    return (
        <Tabs defaultValue="overview" keepMounted={false} variant="outline">
            <Tabs.List>
                <Tabs.Tab value="overview">Overview</Tabs.Tab>
                <Tabs.Tab value="history">History</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="overview">
                <Stack gap="md" mt="md">
                    <Card withBorder>
                        <Stack gap="sm">
                            {booking.asset ? (
                                <Stack gap={4}>
                                    <Text fw={500}>Asset</Text>
                                    <Text>{booking.asset.assetNumber} — {booking.asset.name}</Text>
                                </Stack>
                            ) : null}

                            {booking.kit ? (
                                <Stack gap={4}>
                                    <Text fw={500}>{bookingStrings.labels.equipmentKit}</Text>
                                    <Text>{booking.kit.name}</Text>
                                </Stack>
                            ) : null}

                            <Stack gap={4}>
                                <Text fw={500}>Date Range</Text>
                                <Group gap="xs">
                                    <Text>{formatDateRange(booking)}</Text>
                                    {timeRange ? (
                                        <Group gap={4} c="dimmed" wrap="nowrap">
                                            <IconClock size={14} />
                                            <Text size="sm">{timeRange}</Text>
                                        </Group>
                                    ) : null}
                                </Group>
                            </Stack>

                            <Stack gap={4}>
                                <Text fw={500}>Purpose</Text>
                                <Text>{booking.purpose}</Text>
                            </Stack>

                            {booking.notes ? (
                                <Stack gap={4}>
                                    <Text fw={500}>Notes</Text>
                                    <Text>{booking.notes}</Text>
                                </Stack>
                            ) : null}

                            <QuantityBadges booking={booking} />

                            <Divider />
                            <BookingParticipants booking={booking} />
                        </Stack>
                    </Card>

                    <Group>
                        {onEdit ? <Button onClick={onEdit}>{bookingStrings.actions.edit}</Button> : null}
                        {onCheckOut && booking.status === 'approved' ? (
                            <Button onClick={onCheckOut} color="green">
                                {bookingStrings.actions.checkOut}
                            </Button>
                        ) : null}
                        {onCheckIn && booking.status === 'active' ? (
                            <Button onClick={onCheckIn} color="blue">
                                {bookingStrings.actions.checkIn}
                            </Button>
                        ) : null}
                        {onCancel && ['pending', 'approved'].includes(booking.status) ? (
                            <Button onClick={onCancel} color="red" variant="subtle">
                                {bookingStrings.actions.cancel}
                            </Button>
                        ) : null}
                    </Group>
                </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="history">
                <Stack gap="md" mt="md">
                    <HistoryTimeline
                        entityType="booking"
                        entityId={booking.id}
                        sources={historySources}
                        title="Booking history"
                        emptyState="No history entries yet. Actions will appear here."
                    />
                </Stack>
            </Tabs.Panel>
        </Tabs>
    );
}
