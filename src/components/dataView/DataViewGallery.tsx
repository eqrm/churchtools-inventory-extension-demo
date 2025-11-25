import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Card, Group, Pagination, SimpleGrid, Stack, Text } from '@mantine/core';
import type { ViewRecord } from './types';
import { useTranslation } from 'react-i18next';

export interface DataViewGalleryProps<TRecord extends ViewRecord> {
    records: TRecord[];
    emptyState?: ReactNode;
    renderItem?: (record: TRecord) => ReactNode;
    pageSize?: number;
    page?: number;
    initialPage?: number;
    onPageChange?: (page: number) => void;
    paginationSummary?: (info: {
        page: number;
        pageSize: number;
        total: number;
        start: number;
        end: number;
    }) => ReactNode;
}

export function DataViewGallery<TRecord extends ViewRecord>({
    records,
    emptyState,
    renderItem,
    pageSize = 24,
    page,
    initialPage = 1,
    onPageChange,
    paginationSummary,
}: DataViewGalleryProps<TRecord>) {
    const { t } = useTranslation('views');
    const resolvedPageSize = Math.max(1, pageSize);
    const totalPages = Math.max(1, Math.ceil(records.length / resolvedPageSize));
    const isPageControlled = typeof page === 'number' && onPageChange;

    const [internalPage, setInternalPage] = useState(() => Math.min(Math.max(initialPage, 1), totalPages));

    useEffect(() => {
        if (!isPageControlled) {
            setInternalPage((current) => Math.min(Math.max(current, 1), totalPages));
        }
    }, [isPageControlled, totalPages]);

    const currentPage = useMemo(() => {
        const candidate = isPageControlled ? page ?? 1 : internalPage;
        return Math.min(Math.max(candidate, 1), totalPages);
    }, [internalPage, isPageControlled, page, totalPages]);

    const handlePageChange = (nextPage: number) => {
        const clamped = Math.min(Math.max(nextPage, 1), totalPages);
        if (isPageControlled) {
            onPageChange?.(clamped);
            return;
        }
        setInternalPage(clamped);
        onPageChange?.(clamped);
    };

    const visibleRecords = useMemo(() => {
        if (records.length <= resolvedPageSize) {
            return records;
        }
        const start = (currentPage - 1) * resolvedPageSize;
        const end = start + resolvedPageSize;
        return records.slice(start, end);
    }, [currentPage, records, resolvedPageSize]);

    if (visibleRecords.length === 0) {
        return (
            emptyState ?? (
                <Card withBorder>
                    <Text c="dimmed" ta="center">
                        {t('gallery.empty')}
                    </Text>
                </Card>
            )
        );
    }

    const showPagination = records.length > resolvedPageSize;
    const start = (currentPage - 1) * resolvedPageSize + 1;
    const end = Math.min(records.length, start + resolvedPageSize - 1);

    return (
        <Stack gap="md">
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                {visibleRecords.map((record) => (
                    <Card key={record.id} withBorder>
                        {renderItem ? (
                            renderItem(record)
                        ) : (
                            <Stack gap="xs">
                                <Text fw={600}>{record.title}</Text>
                                {record.subtitle && (
                                    <Text size="sm" c="dimmed">
                                        {record.subtitle}
                                    </Text>
                                )}
                                {record.description && <Text size="sm">{record.description}</Text>}
                            </Stack>
                        )}
                    </Card>
                ))}
            </SimpleGrid>

            {showPagination && (
                <Card withBorder>
                    <Group justify="space-between" align="center">
                        <Text size="sm" c="dimmed">
                            {paginationSummary
                                ? paginationSummary({
                                    page: currentPage,
                                    pageSize: resolvedPageSize,
                                    total: records.length,
                                    start,
                                    end,
                                })
                                : t('gallery.summary', { start, end, total: records.length })}
                        </Text>
                        <Pagination
                            total={totalPages}
                            value={currentPage}
                            onChange={handlePageChange}
                            size="sm"
                        />
                    </Group>
                </Card>
            )}
        </Stack>
    );
}
