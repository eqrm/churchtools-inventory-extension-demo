/**
 * ReportList Component (T202)
 * 
 * Displays available pre-built reports in a card grid.
 */

import { Card, SimpleGrid, Text, Title, Group, ThemeIcon } from '@mantine/core';
import { useMemo } from 'react';
import {
  IconChartLine,
  IconCalendarCheck,
  IconClipboardList,
  IconHistory,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useFeatureSettingsStore } from '../../stores';

interface Report {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  path: string;
}

const AVAILABLE_REPORTS: Report[] = [
  {
    id: 'utilization',
    name: 'Inventory utilization',
    description: 'Booking frequency, usage hours, and idle time per asset',
    icon: <IconChartLine size={24} />,
    path: '/reports/utilization',
  },
  {
    id: 'maintenance',
    name: 'Maintenance compliance',
    description: 'Overdue vs. compliant assets and upcoming maintenance',
    icon: <IconCalendarCheck size={24} />,
    path: '/reports/maintenance',
  },
  {
    id: 'stocktake',
    name: 'Stocktake summary',
    description: 'Found vs. missing assets and discrepancies',
    icon: <IconClipboardList size={24} />,
    path: '/reports/stocktake',
  },
  {
    id: 'bookings',
    name: 'Booking history',
    description: 'Booking trends over time and high-demand assets',
    icon: <IconHistory size={24} />,
    path: '/reports/bookings',
  },
];

/**
 * ReportList Component
 */
export function ReportList() {
  const navigate = useNavigate();
  const { bookingsEnabled, maintenanceEnabled } = useFeatureSettingsStore((state) => ({
    bookingsEnabled: state.bookingsEnabled,
    maintenanceEnabled: state.maintenanceEnabled,
  }));

  const reports = useMemo(() => {
    return AVAILABLE_REPORTS.filter((report) => {
      if (report.id === 'bookings' && !bookingsEnabled) {
        return false;
      }
      if (report.id === 'maintenance' && !maintenanceEnabled) {
        return false;
      }
      return true;
    });
  }, [bookingsEnabled, maintenanceEnabled]);

  return (
    <div>
      <Title order={2} mb="lg">
        Reports
      </Title>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {reports.map((report) => (
          <Card
            key={report.id}
            shadow="sm"
            padding="lg"
            radius="md"
            withBorder
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(report.path)}
          >
            <Group mb="md">
              <ThemeIcon size="xl" radius="md" variant="light">
                {report.icon}
              </ThemeIcon>
              <Title order={4}>{report.name}</Title>
            </Group>
            <Text size="sm" c="dimmed">
              {report.description}
            </Text>
          </Card>
        ))}
      </SimpleGrid>
    </div>
  );
}
