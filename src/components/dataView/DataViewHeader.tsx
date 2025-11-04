import type { ReactNode } from 'react';
import { Badge, Button, Group, SegmentedControl, Title } from '@mantine/core';
import { IconFilter } from '@tabler/icons-react';
import type { DataViewMode } from './types';

const MODE_LABELS: Record<DataViewMode, string> = {
    table: 'Tabelle',
    gallery: 'Galerie',
    kanban: 'Kanban',
    calendar: 'Kalender',
};

export interface DataViewHeaderProps {
    title: string;
    mode: DataViewMode;
    availableModes?: DataViewMode[];
    onModeChange?: (mode: DataViewMode) => void;
    filtersOpen: boolean;
    onToggleFilters: () => void;
    hasActiveFilters?: boolean;
    activeFilterCount?: number;
    showFilterButton?: boolean;
    primaryAction?: {
        label: string;
        icon?: ReactNode;
        onClick: () => void;
        disabled?: boolean;
    };
    actions?: ReactNode;
}

export function DataViewHeader({
    title,
    mode,
    availableModes = ['table'],
    onModeChange,
    filtersOpen,
    onToggleFilters,
    hasActiveFilters,
    activeFilterCount,
    showFilterButton = true,
    primaryAction,
    actions,
}: DataViewHeaderProps) {
    const showModeSwitcher = availableModes.length > 1 && typeof onModeChange === 'function';

    return (
        <Group justify="space-between" align="center">
            <Group gap="md" align="center">
                <Title order={2}>{title}</Title>
                {showModeSwitcher && (
                    <SegmentedControl
                        size="xs"
                        value={mode}
                        onChange={(value) => onModeChange(value as DataViewMode)}
                        data={availableModes.map((value) => ({
                            value,
                            label: MODE_LABELS[value],
                        }))}
                    />
                )}
            </Group>

            <Group gap="sm" align="center">
                {showFilterButton && (
                    <Button
                        variant={filtersOpen ? 'filled' : 'default'}
                        leftSection={<IconFilter size={16} />}
                        onClick={onToggleFilters}
                    >
                        Filter
                        {hasActiveFilters && activeFilterCount && activeFilterCount > 0 && (
                            <Badge size="xs" circle ml="xs">
                                {activeFilterCount}
                            </Badge>
                        )}
                    </Button>
                )}

                {actions}

                {primaryAction && (
                    <Button
                        leftSection={primaryAction.icon}
                        onClick={primaryAction.onClick}
                        disabled={primaryAction.disabled}
                    >
                        {primaryAction.label}
                    </Button>
                )}
            </Group>
        </Group>
    );
}
