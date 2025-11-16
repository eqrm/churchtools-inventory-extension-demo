/**
 * MaintenanceRecordList component (T171)
 * Displays maintenance history in a sortable, filterable table
 */

import { useMemo } from 'react';
import { Badge, Group, Text } from '@mantine/core';
import type { DataTableColumn } from 'mantine-datatable';
import { format } from 'date-fns';
import type { MaintenanceRecord } from '../../types/entities';
import { DataViewTable } from '../dataView/DataViewTable';

export interface MaintenanceRecordListProps {
  records: MaintenanceRecord[];
  onRecordClick?: (record: MaintenanceRecord) => void;
}

/**
 * Badge for maintenance type
 */
export function MaintenanceTypeBadge({ type }: { type: MaintenanceRecord['type'] }) {
  const colors = {
    inspection: 'blue',
    cleaning: 'cyan',
    repair: 'orange',
    calibration: 'purple',
    testing: 'green',
    compliance: 'red',
    other: 'gray',
  };

  const labels = {
    inspection: 'Inspection',
    cleaning: 'Cleaning',
    repair: 'Repair',
    calibration: 'Calibration',
    testing: 'Testing',
    compliance: 'Compliance',
    other: 'Other',
  };

  return (
    <Badge color={colors[type]} size="sm">
      {labels[type]}
    </Badge>
  );
}

/**
 * Get table columns configuration
 */
// eslint-disable-next-line react-refresh/only-export-components
export function getMaintenanceRecordColumns(): DataTableColumn<MaintenanceRecord>[] {
  return [
    {
      accessor: 'date',
      title: 'Date',
      sortable: true,
      render: (record: MaintenanceRecord) => format(new Date(record.date), 'MM/dd/yyyy'),
    },
    {
      accessor: 'type',
      title: 'Type',
      sortable: true,
      render: (record: MaintenanceRecord) => <MaintenanceTypeBadge type={record.type} />,
    },
    {
      accessor: 'description',
      title: 'Description',
      render: (record: MaintenanceRecord) => (
        <Text size="sm" lineClamp={2}>
          {record.description}
        </Text>
      ),
    },
    {
      accessor: 'performedByName',
      title: 'Performed by',
      sortable: true,
    },
    {
      accessor: 'cost',
      title: 'Cost',
      sortable: true,
      render: (record: MaintenanceRecord) => (record.cost ? `${record.cost.toFixed(2)} €` : '-'),
    },
    {
      accessor: 'nextDueDate',
      title: 'Next maintenance',
      sortable: true,
      render: (record: MaintenanceRecord) =>
        record.nextDueDate
          ? format(new Date(record.nextDueDate), 'MM/dd/yyyy')
          : '-',
    },
  ];
}

/**
 * Display maintenance history in a table
 */
export function MaintenanceRecordList({ records, onRecordClick }: MaintenanceRecordListProps) {
  const columns = useMemo(() => getMaintenanceRecordColumns(), []);

  return (
    <DataViewTable<MaintenanceRecord>
      records={records}
      columns={columns}
      highlightOnHover={Boolean(onRecordClick)}
      onRowClick={
        onRecordClick
          ? ({ record }) => {
              onRecordClick(record);
            }
          : undefined
      }
      rowStyle={() => (onRecordClick ? { cursor: 'pointer' } : undefined)}
      noRecordsText="No maintenance records found"
      emptyState={
        <Group justify="center" p="xl">
          <Text c="dimmed">No maintenance records found</Text>
        </Group>
      }
    />
  );
}
