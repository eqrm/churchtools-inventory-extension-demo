import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Group, Pagination, Stack, Text } from '@mantine/core';
import { DataTable, type DataTableProps } from 'mantine-datatable';
import { useTranslation } from 'react-i18next';

export type DataViewTableProps<T> = {
    records: DataTableProps<T>['records'];
    columns: NonNullable<DataTableProps<T>['columns']>;
    enableVirtualWindow?: boolean;
    virtualWindowSize?: number;
    initialVirtualWindow?: number;
    onVirtualWindowChange?: (window: number) => void;
    renderWindowSummary?: (info: {
        window: number;
        windowSize: number;
        total: number;
        start: number;
        end: number;
    }) => ReactNode;
} & Omit<DataTableProps<T>, 'records' | 'columns' | 'groups' | 'customLoader'>;

export function DataViewTable<T>({
    records,
    columns,
    enableVirtualWindow = true,
    virtualWindowSize = 100,
    initialVirtualWindow = 1,
    onVirtualWindowChange,
    renderWindowSummary,
    highlightOnHover = true,
    striped = true,
    withTableBorder = true,
    borderRadius = 'sm',
    ...rest
}: DataViewTableProps<T>) {
    const { t } = useTranslation('views');
    const resolvedRecords = useMemo(() => records ?? [], [records]);
    const resolvedWindowSize = Math.max(1, virtualWindowSize);
    const hasExternalPagination = typeof rest.totalRecords === 'number'
        || typeof rest.recordsPerPage === 'number'
        || typeof rest.page === 'number';
    const shouldWindow = enableVirtualWindow && !hasExternalPagination && resolvedRecords.length > resolvedWindowSize;

    const [windowIndex, setWindowIndex] = useState(() => Math.min(Math.max(initialVirtualWindow, 1), Math.max(1, Math.ceil(resolvedRecords.length / resolvedWindowSize))));

    useEffect(() => {
        if (!shouldWindow) {
            setWindowIndex(1);
            return;
        }
        setWindowIndex((current) => {
            const totalWindows = Math.max(1, Math.ceil(resolvedRecords.length / resolvedWindowSize));
            const next = Math.min(Math.max(current, 1), totalWindows);
            if (next !== current) {
                onVirtualWindowChange?.(next);
            }
            return next;
        });
    }, [onVirtualWindowChange, resolvedRecords.length, resolvedWindowSize, shouldWindow]);

    const totalWindows = useMemo(() => Math.max(1, Math.ceil(resolvedRecords.length / resolvedWindowSize)), [resolvedRecords.length, resolvedWindowSize]);
    const currentWindow = shouldWindow ? Math.min(Math.max(windowIndex, 1), totalWindows) : 1;
    const startIndex = shouldWindow ? (currentWindow - 1) * resolvedWindowSize : 0;
    const endIndex = shouldWindow ? Math.min(resolvedRecords.length, startIndex + resolvedWindowSize) : resolvedRecords.length;

    const windowRecords = useMemo(() => {
        if (!shouldWindow) {
            return resolvedRecords;
        }
        return resolvedRecords.slice(startIndex, endIndex);
    }, [endIndex, resolvedRecords, shouldWindow, startIndex]);

    const tableProps = {
        records: windowRecords,
        columns,
        highlightOnHover,
        striped,
        withTableBorder,
        borderRadius,
        ...rest,
    } as DataTableProps<T>;

    const handleWindowChange = (next: number) => {
        const clamped = Math.min(Math.max(next, 1), totalWindows);
        setWindowIndex(clamped);
        onVirtualWindowChange?.(clamped);
    };

    if (!shouldWindow) {
        return <DataTable {...tableProps} />;
    }

    const summaryContent = renderWindowSummary
        ? renderWindowSummary({
            window: currentWindow,
            windowSize: resolvedWindowSize,
            total: resolvedRecords.length,
            start: startIndex + 1,
            end: endIndex,
        })
        : t('table.summary', { start: startIndex + 1, end: endIndex, total: resolvedRecords.length });

    return (
        <Stack gap="sm">
            <DataTable {...tableProps} />
            <Group justify="space-between" align="center">
                <Text size="sm" c="dimmed">
                    {summaryContent}
                </Text>
                <Pagination
                    total={totalWindows}
                    value={currentWindow}
                    onChange={handleWindowChange}
                    size="sm"
                />
            </Group>
        </Stack>
    );
}
