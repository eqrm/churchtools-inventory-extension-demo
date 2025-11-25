/**
 * MaintenanceRecordList component (T171)
 * Displays maintenance history in a sortable, filterable table
 */

import { useMemo } from 'react';
import { Badge, Group, Text } from '@mantine/core';
import type { DataTableColumn } from 'mantine-datatable';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
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
    inspection: 'Inspektion',
    cleaning: 'Reinigung',
    repair: 'Reparatur',
    calibration: 'Kalibrierung',
    testing: 'Prüfung',
    compliance: 'Compliance',
    other: 'Sonstiges',
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
      title: 'Datum',
      sortable: true,
      render: (record: MaintenanceRecord) => format(new Date(record.date), 'dd.MM.yyyy', { locale: de }),
    },
    {
      accessor: 'type',
      title: 'Typ',
      sortable: true,
      render: (record: MaintenanceRecord) => <MaintenanceTypeBadge type={record.type} />,
    },
    {
      accessor: 'description',
      title: 'Beschreibung',
      render: (record: MaintenanceRecord) => (
        <Text size="sm" lineClamp={2}>
          {record.description}
        </Text>
      ),
    },
    {
      accessor: 'performedByName',
      title: 'Durchgeführt von',
      sortable: true,
    },
    {
      accessor: 'cost',
      title: 'Kosten',
      sortable: true,
      render: (record: MaintenanceRecord) => (record.cost ? `${record.cost.toFixed(2)} €` : '-'),
    },
    {
      accessor: 'nextDueDate',
      title: 'Nächste Wartung',
      sortable: true,
      render: (record: MaintenanceRecord) =>
        record.nextDueDate
          ? format(new Date(record.nextDueDate), 'dd.MM.yyyy', { locale: de })
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
      noRecordsText="Keine Wartungseinträge vorhanden"
      emptyState={
        <Group justify="center" p="xl">
          <Text c="dimmed">Keine Wartungseinträge vorhanden</Text>
        </Group>
      }
    />
  );
}
