/**
 * WorkOrderCompletionReport Component (T12.4.2)
 * 
 * Displays a report of completed work orders with timing analysis.
 * - List of completed WOs with dates, time to complete
 * - Columns: WO #, Asset, Type, Scheduled Date, Completed Date, Days Early/Late
 * - Filters: Date range, type (internal/external), status
 * - Export: CSV download button
 */

import { Paper, Title, Group, Button, Stack, Text, Badge, Loader, SimpleGrid, ThemeIcon } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { IconDownload, IconCheck, IconClock, IconAlertTriangle } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useWorkOrders, useMaintenanceRules } from '../../hooks/useMaintenance';
import { useAssets } from '../../hooks/useAssets';
import { exportWorkOrderCompletionToCSV } from '../../utils/exportCSV';
import type { WorkOrder } from '../../types/maintenance';

interface CompletedWorkOrderRow {
  id: string;
  workOrderNumber: string;
  assetName: string;
  type: WorkOrder['type'];
  orderType: WorkOrder['orderType'];
  scheduledEnd: string;
  actualEnd: string;
  daysEarlyLate: number; // negative = early, positive = late
}

function calculateDaysEarlyLate(scheduledEnd: string | undefined, actualEnd: string | undefined): number {
  if (!scheduledEnd || !actualEnd) return 0;
  
  const scheduled = new Date(scheduledEnd);
  const actual = new Date(actualEnd);
  const diffMs = actual.getTime() - scheduled.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Summary statistics for completed work orders
 */
function CompletionStats({ data }: { data: CompletedWorkOrderRow[] }) {
  const stats = useMemo(() => {
    const total = data.length;
    const onTime = data.filter(d => d.daysEarlyLate === 0).length;
    const early = data.filter(d => d.daysEarlyLate < 0).length;
    const late = data.filter(d => d.daysEarlyLate > 0).length;
    
    const avgDays = total > 0 
      ? data.reduce((sum, d) => sum + d.daysEarlyLate, 0) / total 
      : 0;

    return { total, onTime, early, late, avgDays };
  }, [data]);

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 5 }} spacing="md">
      <Paper p="md" withBorder>
        <Group gap="xs">
          <ThemeIcon size="lg" variant="light">
            <IconCheck size={20} />
          </ThemeIcon>
          <div>
            <Text size="xl" fw={700}>{stats.total}</Text>
            <Text size="sm" c="dimmed">Total completed</Text>
          </div>
        </Group>
      </Paper>

      <Paper p="md" withBorder>
        <Group gap="xs">
          <ThemeIcon size="lg" variant="light" color="blue">
            <IconClock size={20} />
          </ThemeIcon>
          <div>
            <Text size="xl" fw={700}>{stats.onTime}</Text>
            <Text size="sm" c="dimmed">On time</Text>
          </div>
        </Group>
      </Paper>

      <Paper p="md" withBorder>
        <Group gap="xs">
          <ThemeIcon size="lg" variant="light" color="green">
            <IconCheck size={20} />
          </ThemeIcon>
          <div>
            <Text size="xl" fw={700} c="green">{stats.early}</Text>
            <Text size="sm" c="dimmed">Completed early</Text>
          </div>
        </Group>
      </Paper>

      <Paper p="md" withBorder>
        <Group gap="xs">
          <ThemeIcon size="lg" variant="light" color="red">
            <IconAlertTriangle size={20} />
          </ThemeIcon>
          <div>
            <Text size="xl" fw={700} c="red">{stats.late}</Text>
            <Text size="sm" c="dimmed">Completed late</Text>
          </div>
        </Group>
      </Paper>

      <Paper p="md" withBorder>
        <Text size="xl" fw={700} ta="center">
          {stats.avgDays > 0 ? '+' : ''}{stats.avgDays.toFixed(1)}
        </Text>
        <Text ta="center" c="dimmed" size="sm">Avg days (early/late)</Text>
      </Paper>
    </SimpleGrid>
  );
}

/**
 * WorkOrderCompletionReport Component
 */
export function WorkOrderCompletionReport() {
  const { data: workOrders, isLoading: workOrdersLoading, error: workOrdersError } = useWorkOrders();
  const { data: rules, isLoading: rulesLoading } = useMaintenanceRules();
  const { data: assets, isLoading: assetsLoading } = useAssets();

  const completedWorkOrders = useMemo<CompletedWorkOrderRow[]>(() => {
    if (!workOrders) return [];
    
    // Filter to only completed work orders (done state)
    const completed = workOrders.filter(wo => wo.state === 'done');
    
    return completed.map(wo => {
      // Get asset name from rule if available
      let assetName = 'Unknown';
      if (wo.ruleId && rules && assets) {
        const rule = rules.find(r => r.id === wo.ruleId);
        if (rule) {
          const asset = assets.find(a => a.id === rule.assetId);
          if (asset) {
            assetName = asset.name;
          }
        }
      }
      
      return {
        id: wo.id,
        workOrderNumber: wo.workOrderNumber,
        assetName,
        type: wo.type,
        orderType: wo.orderType,
        scheduledEnd: wo.scheduledEnd ?? '',
        actualEnd: wo.actualEnd ?? '',
        daysEarlyLate: calculateDaysEarlyLate(wo.scheduledEnd, wo.actualEnd),
      };
    });
  }, [workOrders, rules, assets]);

  if (workOrdersLoading || rulesLoading || assetsLoading) return <Loader />;
  if (workOrdersError) return <Text c="red">Failed to load work orders</Text>;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>Work order completion</Title>
        <Button
          leftSection={<IconDownload size={16} />}
          onClick={() => exportWorkOrderCompletionToCSV(completedWorkOrders)}
        >
          Export
        </Button>
      </Group>

      <CompletionStats data={completedWorkOrders} />

      <Title order={3} mt="md">Completed work orders</Title>

      <DataTable
        withTableBorder
        withColumnBorders
        striped
        highlightOnHover
        records={completedWorkOrders}
        columns={[
          {
            accessor: 'workOrderNumber',
            title: 'Work order',
            width: 120,
          },
          {
            accessor: 'assetName',
            title: 'Asset',
            width: 200,
          },
          {
            accessor: 'type',
            title: 'Type',
            width: 100,
            render: (row) => (
              <Badge color={row.type === 'internal' ? 'blue' : 'orange'} variant="light">
                {row.type}
              </Badge>
            ),
          },
          {
            accessor: 'scheduledEnd',
            title: 'Scheduled',
            width: 120,
            render: (row) => row.scheduledEnd 
              ? new Date(row.scheduledEnd).toLocaleDateString('en-US') 
              : '-',
          },
          {
            accessor: 'actualEnd',
            title: 'Completed',
            width: 120,
            render: (row) => row.actualEnd 
              ? new Date(row.actualEnd).toLocaleDateString('en-US') 
              : '-',
          },
          {
            accessor: 'daysEarlyLate',
            title: 'Days early/late',
            width: 140,
            textAlign: 'right',
            render: (row) => {
              if (row.daysEarlyLate === 0) {
                return <Badge color="blue" variant="light">On time</Badge>;
              }
              if (row.daysEarlyLate < 0) {
                return (
                  <Badge color="green" variant="filled">
                    {Math.abs(row.daysEarlyLate)} days early
                  </Badge>
                );
              }
              return (
                <Badge color="red" variant="filled">
                  {row.daysEarlyLate} days late
                </Badge>
              );
            },
          },
        ]}
        sortStatus={{
          columnAccessor: 'actualEnd',
          direction: 'desc',
        }}
      />
    </Stack>
  );
}
