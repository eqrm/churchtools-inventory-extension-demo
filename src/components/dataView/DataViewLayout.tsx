import type { ReactNode } from 'react';
import { Card, Stack, Text } from '@mantine/core';
import type { DataViewMode, ViewRecord } from './types';
import { DataViewHeader } from './DataViewHeader';
import { DataViewGallery, type DataViewGalleryProps } from './DataViewGallery';
import { DataViewKanban, type DataViewKanbanProps } from './DataViewKanban';
import { DataViewCalendar, type DataViewCalendarProps } from './DataViewCalendar';

export interface DataViewLayoutProps<TRecord extends ViewRecord = ViewRecord> {
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
    toolbarContent?: ReactNode;
    filterContent?: ReactNode;
    tableView?: ReactNode;
    galleryView?: DataViewGalleryProps<TRecord>;
    kanbanView?: DataViewKanbanProps<TRecord>;
    calendarView?: DataViewCalendarProps<TRecord>;
    calendarViewContent?: ReactNode;
    missingViewContent?: ReactNode;
    children?: ReactNode;
}

export function DataViewLayout<TRecord extends ViewRecord = ViewRecord>({
    title,
    mode,
    availableModes,
    onModeChange,
    filtersOpen,
    onToggleFilters,
    hasActiveFilters,
    activeFilterCount,
    showFilterButton,
    primaryAction,
    actions,
    toolbarContent,
    filterContent,
    tableView,
    galleryView,
    kanbanView,
    calendarView,
    calendarViewContent,
    missingViewContent,
    children,
}: DataViewLayoutProps<TRecord>) {
    const tableContent = tableView ?? children;

    const renderContent = (): ReactNode => {
        switch (mode) {
            case 'gallery':
                if (galleryView) {
                    return <DataViewGallery<TRecord> {...galleryView} />;
                }
                break;
            case 'kanban':
                if (kanbanView) {
                    return <DataViewKanban<TRecord> {...kanbanView} />;
                }
                break;
            case 'calendar':
                if (calendarViewContent) {
                    return calendarViewContent;
                }
                if (calendarView) {
                    return <DataViewCalendar<TRecord> {...calendarView} />;
                }
                break;
            case 'table':
            default:
                if (tableContent) {
                    return tableContent;
                }
                break;
        }

        if (tableContent) {
            return tableContent;
        }

        return (
            missingViewContent ?? (
                <Card withBorder>
                    <Text c="dimmed" ta="center">
                        No renderer configured for this view.
                    </Text>
                </Card>
            )
        );
    };

    return (
        <Stack gap="md">
            <DataViewHeader
                title={title}
                mode={mode}
                availableModes={availableModes}
                onModeChange={onModeChange}
                filtersOpen={filtersOpen}
                onToggleFilters={onToggleFilters}
                hasActiveFilters={hasActiveFilters}
                activeFilterCount={activeFilterCount}
                showFilterButton={showFilterButton}
                primaryAction={primaryAction}
                actions={actions}
            />

            {filtersOpen && filterContent && <Card withBorder>{filterContent}</Card>}

            {toolbarContent}

            {renderContent()}
        </Stack>
    );
}
