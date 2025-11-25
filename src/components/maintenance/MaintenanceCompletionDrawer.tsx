import { useEffect, useMemo, useState } from 'react';
import {
    Badge,
    Button,
    Drawer,
    FileInput,
    Group,
    SegmentedControl,
    Stack,
    Text,
    Textarea,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { IconClockHour4, IconFileAlert } from '@tabler/icons-react';
import type { MaintenancePlanAssetStatus } from '../../types/entities';
import type { MaintenancePlanAssetState } from '../../state/maintenance/planStore';

type CompletionMode = 'complete' | 'skip' | 'pending';

export interface MaintenanceCompletionDrawerPayload {
    status: MaintenancePlanAssetStatus;
    notes?: string;
    occurredAt?: string;
}

interface MaintenanceCompletionDrawerProps {
    asset: MaintenancePlanAssetState | null;
    opened: boolean;
    mode: CompletionMode;
    onClose: () => void;
    onSubmit: (payload: MaintenanceCompletionDrawerPayload) => void;
}

const statusOptions: Array<{ value: MaintenancePlanAssetStatus; label: string }> = [
    { value: 'completed', label: 'Completed' },
    { value: 'pending', label: 'Pending' },
    { value: 'skipped', label: 'Skipped' },
];

function deriveInitialStatus(mode: CompletionMode, asset: MaintenancePlanAssetState | null): MaintenancePlanAssetStatus {
    if (mode === 'complete') {
        return 'completed';
    }
    if (mode === 'skip') {
        return 'skipped';
    }
    if (mode === 'pending') {
        return 'pending';
    }
    return asset?.status ?? 'pending';
}

function parseDate(value?: string) {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function MaintenanceCompletionDrawer({ asset, opened, mode, onClose, onSubmit }: MaintenanceCompletionDrawerProps) {
    const [status, setStatus] = useState<MaintenancePlanAssetStatus>('pending');
    const [notes, setNotes] = useState('');
    const [occurredAt, setOccurredAt] = useState<Date | null>(null);

    useEffect(() => {
        if (!opened) {
            return;
        }

        setStatus(deriveInitialStatus(mode, asset));
        setNotes(asset?.notes ?? '');
        setOccurredAt(parseDate(asset?.completedAt) ?? new Date());
    }, [asset, mode, opened]);

    const assetLabel = useMemo(() => {
        if (!asset) {
            return 'Select an asset to log maintenance';
        }
        return `${asset.assetNumber} · ${asset.assetName}`;
    }, [asset]);

    return (
        <Drawer opened={opened} onClose={onClose} position="right" size="md" title="Log maintenance outcome">
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    if (!asset) {
                        return;
                    }

                    onSubmit({
                        status,
                        notes: notes.trim() ? notes.trim() : undefined,
                        occurredAt: occurredAt ? occurredAt.toISOString() : undefined,
                    });
                    onClose();
                }}
            >
                <Stack gap="lg">
                    <Stack gap={4}>
                        <Text fw={600}>Asset</Text>
                        <Text size="sm" c="dimmed">
                            {assetLabel}
                        </Text>
                    </Stack>

                    <SegmentedControl
                        value={status}
                        onChange={(value) => setStatus(value as MaintenancePlanAssetStatus)}
                        fullWidth
                        data={statusOptions}
                    />

                    <DateTimePicker
                        label="Occurred at"
                        value={occurredAt}
                        onChange={setOccurredAt}
                        placeholder="Select timestamp"
                        leftSection={<IconClockHour4 size={16} />}
                    />

                    <Textarea
                        label="Notes"
                        placeholder="Add optional notes or follow-up actions"
                        minRows={3}
                        value={notes}
                        onChange={(event) => setNotes(event.currentTarget.value)}
                    />

                    <Stack gap={6}>
                        <FileInput
                            label="Upload documentation"
                            placeholder="Select files"
                            disabled
                            leftSection={<IconFileAlert size={16} />}
                            rightSection={<Badge size="xs" variant="light" color="gray">Soon</Badge>}
                            description="We’re working on secure maintenance file uploads. Until then, include relevant details in the notes field."
                            value={null}
                        />
                        <Text size="xs" c="dimmed">
                            Attachments can’t be uploaded yet. Add any maintenance photos or reports to your ChurchTools files and reference them in the notes.
                        </Text>
                    </Stack>

                    <Group justify="flex-end">
                        <Button variant="subtle" onClick={onClose} type="button">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!asset}>
                            Save outcome
                        </Button>
                    </Group>
                </Stack>
            </form>
        </Drawer>
    );
}
