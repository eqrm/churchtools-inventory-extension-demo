/**
 * StockTakeSummaryReport Component (T205)
 * 
 * Displays stock take summary: found vs missing assets and discrepancies.
 */

import { Paper, Title, Group, Button, Stack, Text, Badge, Loader, SimpleGrid, RingProgress, Center, Select } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { IconDownload } from '@tabler/icons-react';
import { useState } from 'react';
import { useAssets } from '../../hooks/useAssets';
import { useStockTakeSessions } from '../../hooks/useStockTake';
import { calculateStockTakeSummary } from '../../utils/reportCalculations';
import { exportStockTakeSummaryToCSV } from '../../utils/exportCSV';

/**
 * Stock take statistics summary
 */
function StockTakeStats({ data }: { data: ReturnType<typeof calculateStockTakeSummary> }) {
  const percentage = data.completionRate;
  const color = percentage >= 95 ? 'green' : percentage >= 80 ? 'yellow' : 'red';

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 5 }} spacing="md">
      <Paper p="md" withBorder>
        <Center>
          <RingProgress
            size={120}
            thickness={12}
            sections={[{ value: percentage, color }]}
            label={
              <Center>
                <Text size="xl" fw={700}>{percentage.toFixed(1)}%</Text>
              </Center>
            }
          />
        </Center>
        <Text ta="center" mt="xs" fw={500}>Capture rate</Text>
      </Paper>

      <Paper p="md" withBorder>
        <Text size="xl" fw={700} ta="center">{data.expectedCount}</Text>
        <Text ta="center" c="dimmed" size="sm">Expected</Text>
      </Paper>

      <Paper p="md" withBorder>
        <Text size="xl" fw={700} ta="center" c="green">{data.scannedCount}</Text>
        <Text ta="center" c="dimmed" size="sm">Scanned</Text>
      </Paper>

      <Paper p="md" withBorder>
        <Text size="xl" fw={700} ta="center" c="red">{data.missingCount}</Text>
        <Text ta="center" c="dimmed" size="sm">Missing</Text>
      </Paper>

      <Paper p="md" withBorder>
        <Text size="xl" fw={700} ta="center" c="orange">{data.unexpectedCount}</Text>
        <Text ta="center" c="dimmed" size="sm">Unexpected</Text>
      </Paper>
    </SimpleGrid>
  );
}

/**
 * StockTakeSummaryReport Component
 */
export function StockTakeSummaryReport() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const { data: assets, isLoading: assetsLoading, error: assetsError } = useAssets();
  const { data: sessions, isLoading: sessionsLoading, error: sessionsError } = useStockTakeSessions();

  if (assetsLoading || sessionsLoading) return <Loader />;
  if (assetsError) return <Text c="red">Failed to load assets</Text>;
  if (sessionsError) return <Text c="red">Failed to load stock take sessions</Text>;
  if (!assets || !sessions || sessions.length === 0) {
    return <Text>No stock take sessions found</Text>;
  }

  // Select first session by default
  const sessionId = selectedSessionId || sessions[0]?.id;
  const selectedSession = sessions.find((s) => s.id === sessionId);

  if (!selectedSession) return null;

  const summaryData = calculateStockTakeSummary(selectedSession, assets);

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>Stock take summary</Title>
        <Button
          leftSection={<IconDownload size={16} />}
          onClick={() => exportStockTakeSummaryToCSV(summaryData)}
        >
          Export
        </Button>
      </Group>

      <Paper p="md" withBorder>
        <Group>
          <Text fw={500}>Session:</Text>
          <Select
            data={sessions.map((s) => ({
              value: String(s.id),
              label: `${s.startDate.substring(0, 10)} - ${s.status}`,
            }))}
            value={sessionId || undefined}
            onChange={(value) => setSelectedSessionId(value || null)}
            style={{ flex: 1, maxWidth: 400 }}
          />
        </Group>
      </Paper>

      <StockTakeStats data={summaryData} />

      <Title order={3} mt="md">Missing assets</Title>

      <DataTable
        withTableBorder
        withColumnBorders
        striped
        highlightOnHover
        records={summaryData.missingAssets}
        idAccessor="assetId"
        columns={[
          {
            accessor: 'assetNumber',
            title: 'Asset number',
            width: 150,
          },
          {
            accessor: 'assetName',
            title: 'Name',
            width: 200,
          },
          {
            accessor: 'categoryName',
            title: 'Category',
            width: 150,
          },
          {
            accessor: 'lastLocation',
            title: 'Last location',
            width: 180,
            render: (row) => row.lastLocation || '-',
          },
          {
            accessor: 'status',
            title: 'Status',
            width: 120,
            render: () => (
              <Badge color="red" variant="filled">
                Missing
              </Badge>
            ),
          },
        ]}
      />
    </Stack>
  );
}
