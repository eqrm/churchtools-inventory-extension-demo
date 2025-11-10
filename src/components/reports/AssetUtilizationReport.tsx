/**
 * AssetUtilizationReport Component (T203)
 * 
 * Displays asset utilization data including booking frequency,
 * usage hours, idle time, and utilization percentage.
 */

import { useState } from 'react';
import { Paper, Title, Group, Button, Select, Stack, Text, Loader, SegmentedControl } from '@mantine/core';
import DateRangeCalendar from '../common/DateRangeCalendar'
import { DataTable } from 'mantine-datatable';
import { IconDownload, IconFilter } from '@tabler/icons-react';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { useAssets } from '../../hooks/useAssets';
import { useBookings } from '../../hooks/useBookings';
import { useCategories } from '../../hooks/useCategories';
import { useAssetGroups } from '../../hooks/useAssetGroups';
import {
  calculateAssetUtilization,
  aggregateGroupUtilization,
  type AssetUtilizationData,
  type AssetGroupUtilizationData,
} from '../../utils/reportCalculations';
import { exportUtilizationToCSV } from '../../utils/exportCSV';

/**
 * Filter controls for utilization report
 */
function UtilizationFilters({
  dateRange,
  setDateRange,
  selectedAssetTypeId,
  setSelectedAssetTypeId,
  selectedLocation,
  setSelectedLocation,
  assetTypes,
  locations,
}: {
  dateRange: [Date | null, Date | null];
  setDateRange: (range: [Date | null, Date | null]) => void;
  selectedAssetTypeId: string | null;
  setSelectedAssetTypeId: (assetTypeId: string | null) => void;
  selectedLocation: string | null;
  setSelectedLocation: (location: string | null) => void;
  assetTypes: Array<{ value: string; label: string }>;
  locations: string[];
}) {
  return (
    <Paper p="md" withBorder>
      <Group align="flex-end">
        <IconFilter size={20} />
        <Text fw={500}>Filter</Text>
      </Group>

      <Group mt="md">
        <div style={{ flex: 1 }}>
          <DateRangeCalendar
            value={{ start: dateRange[0] ? dateRange[0].toISOString().split('T')[0] : undefined, end: dateRange[1] ? dateRange[1].toISOString().split('T')[0] : undefined }}
            onChange={(r) => {
              if (!r || !r.start || !r.end) {
                setDateRange([null, null])
                return
              }
              setDateRange([new Date(r.start), new Date(r.end)])
            }}
          />
        </div>

        <Select
          label="Asset-Typ"
          placeholder="Alle Asset-Typen"
          data={assetTypes}
          value={selectedAssetTypeId}
          onChange={setSelectedAssetTypeId}
          clearable
          style={{ flex: 1 }}
        />

        <Select
          label="Standort"
          placeholder="Alle Standorte"
          data={locations.map((loc) => ({ value: loc, label: loc }))}
          value={selectedLocation}
          onChange={setSelectedLocation}
          clearable
          style={{ flex: 1 }}
        />
      </Group>
    </Paper>
  );
}

/**
 * Utilization data table
 */
function UtilizationTable({ data }: { data: AssetUtilizationData[] }) {
  return (
    <DataTable
      withTableBorder
      withColumnBorders
      striped
      highlightOnHover
      records={data}
      idAccessor="assetId"
      columns={[
        {
          accessor: 'assetNumber',
          title: 'Inventarnummer',
          width: 150,
        },
        {
          accessor: 'assetName',
          title: 'Name',
          width: 200,
        },
        {
          accessor: 'assetTypeName',
          title: 'Asset-Typ',
          width: 150,
        },
        {
          accessor: 'bookingCount',
          title: 'Buchungen',
          width: 120,
          textAlign: 'right',
        },
        {
          accessor: 'totalDaysBooked',
          title: 'Tage gebucht',
          width: 140,
          textAlign: 'right',
        },
        {
          accessor: 'utilizationPercentage',
          title: 'Auslastung',
          width: 130,
          textAlign: 'right',
          render: (row) => `${row.utilizationPercentage}%`,
        },
        {
          accessor: 'lastBookedDate',
          title: 'Letzte Buchung',
          width: 150,
          render: (row) =>
            row.lastBookedDate
              ? new Date(row.lastBookedDate).toLocaleDateString('de-DE')
              : '-',
        },
      ]}
      sortStatus={{
        columnAccessor: 'utilizationPercentage',
        direction: 'desc',
      }}
    />
  );
}

function GroupUtilizationTable({ data }: { data: AssetGroupUtilizationData[] }) {
  return (
    <DataTable
      withTableBorder
      withColumnBorders
      striped
      highlightOnHover
      records={data}
      idAccessor="groupId"
      columns={[
        {
          accessor: 'groupNumber',
          title: 'Gruppe',
          width: 150,
        },
        {
          accessor: 'groupName',
          title: 'Name',
          width: 220,
        },
        {
          accessor: 'memberCount',
          title: 'Mitglieder',
          width: 120,
          textAlign: 'right',
        },
        {
          accessor: 'bookingCount',
          title: 'Buchungen',
          width: 120,
          textAlign: 'right',
        },
        {
          accessor: 'totalDaysBooked',
          title: 'Gebuchte Tage',
          width: 140,
          textAlign: 'right',
        },
        {
          accessor: 'averageUtilization',
          title: 'Ø Auslastung',
          width: 140,
          textAlign: 'right',
          render: (row) => `${row.averageUtilization}%`,
        },
        {
          accessor: 'lastBookedDate',
          title: 'Letzte Buchung',
          width: 150,
          render: (row) =>
            row.lastBookedDate
              ? new Date(row.lastBookedDate).toLocaleDateString('de-DE')
              : '-',
        },
      ]}
      sortStatus={{
        columnAccessor: 'averageUtilization',
        direction: 'desc',
      }}
    />
  );
}

/**
 * AssetUtilizationReport Component
 */
export function AssetUtilizationReport() {
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    startOfMonth(subMonths(new Date(), 3)),
    endOfMonth(new Date()),
  ]);
  const [selectedAssetTypeId, setSelectedAssetTypeId] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'assets' | 'groups'>('assets');

  const { data: assets, isLoading: assetsLoading, error: assetsError } = useAssets();
  const { data: bookings, isLoading: bookingsLoading, error: bookingsError } = useBookings();
  const { data: assetTypes } = useCategories();
  const {
    data: assetGroups = [],
    isLoading: assetGroupsLoading,
    error: assetGroupsError,
  } = useAssetGroups();

  if (assetsLoading || bookingsLoading || assetGroupsLoading) return <Loader />;
  if (assetsError) return <Text c="red">Fehler beim Laden der Inventargegenstände</Text>;
  if (bookingsError) return <Text c="red">Fehler beim Laden der Buchungen</Text>;
  if (assetGroupsError) return <Text c="red">Fehler beim Laden der Asset-Gruppen</Text>;
  if (!assets || !bookings) return null;

  // Filter assets
  let filteredAssets = assets;
  if (selectedAssetTypeId) {
    filteredAssets = filteredAssets.filter((a) => a.assetType?.id === selectedAssetTypeId);
  }
  if (selectedLocation) {
    filteredAssets = filteredAssets.filter((a) => a.location === selectedLocation);
  }

  // Calculate utilization
  const utilizationData = calculateAssetUtilization(
    filteredAssets,
    bookings,
    dateRange[0] || new Date(),
    dateRange[1] || new Date()
  );

  const groupUtilizationData = dateRange[0] && dateRange[1]
    ? aggregateGroupUtilization(
        filteredAssets,
        utilizationData,
        assetGroups,
        dateRange[0],
        dateRange[1]
      )
    : [];

  // Extract unique locations
  const locations = Array.from(new Set(assets.map((a) => a.location).filter(Boolean))) as string[];

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>Inventar-Auslastung</Title>
        <Group gap="sm">
          <SegmentedControl
            value={viewMode}
            onChange={(value) => setViewMode(value as 'assets' | 'groups')}
            data={[
              { value: 'assets', label: 'Assets' },
              { value: 'groups', label: 'Gruppen' },
            ]}
          />
          {viewMode === 'assets' && (
            <Button
              leftSection={<IconDownload size={16} />}
              onClick={() => exportUtilizationToCSV(utilizationData)}
            >
              Exportieren
            </Button>
          )}
        </Group>
      </Group>

      <UtilizationFilters
        dateRange={dateRange}
        setDateRange={setDateRange}
        selectedAssetTypeId={selectedAssetTypeId}
        setSelectedAssetTypeId={setSelectedAssetTypeId}
        selectedLocation={selectedLocation}
        setSelectedLocation={setSelectedLocation}
        assetTypes={assetTypes?.map((type) => ({ value: type.id, label: type.name })) || []}
        locations={locations}
      />

      {viewMode === 'assets' ? (
        <UtilizationTable data={utilizationData} />
      ) : groupUtilizationData.length > 0 ? (
        <GroupUtilizationTable data={groupUtilizationData} />
      ) : (
        <Text size="sm" c="dimmed">
          Keine Gruppen-Aktivität für den gewählten Zeitraum gefunden.
        </Text>
      )}
    </Stack>
  );
}
