import { Container, Stack, Title, Text } from '@mantine/core';
import { useMemo } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { ReportList } from '../components/reports/ReportList';
import { AssetUtilizationReport } from '../components/reports/AssetUtilizationReport';
import { MaintenanceComplianceReport } from '../components/reports/MaintenanceComplianceReport';
import { StockTakeSummaryReport } from '../components/reports/StockTakeSummaryReport';
import { BookingHistoryReport } from '../components/reports/BookingHistoryReport';
import { useFeatureSettingsStore } from '../stores';

/**
 * Reports Page - Central hub for all reporting features
 * Provides access to:
 * - Booking History Reports
 * - Maintenance Compliance Reports
 * - Asset Utilization Reports
 * - Stock Take Summary Reports
 */
export function ReportsPage() {
  const { reportId } = useParams<{ reportId?: string }>();
  const { bookingsEnabled, maintenanceEnabled } = useFeatureSettingsStore((state) => ({
    bookingsEnabled: state.bookingsEnabled,
    maintenanceEnabled: state.maintenanceEnabled,
  }));

  const reportSummary = useMemo(() => {
    const parts: string[] = ['assets', 'stock take'];
    if (maintenanceEnabled) {
      parts.push('maintenance');
    }
    if (bookingsEnabled) {
      parts.push('bookings');
    }

    if (parts.length === 1) {
      return `Generate and view reports for ${parts[0]}.`;
    }
    if (parts.length === 2) {
      return `Generate and view reports for ${parts[0]} and ${parts[1]}.`;
    }

    const last = parts.pop();
    return `Generate and view reports for ${parts.join(', ')}, and ${last}.`;
  }, [bookingsEnabled, maintenanceEnabled]);

  if (reportId === 'bookings' && !bookingsEnabled) {
    return <Navigate to="/reports" replace />;
  }

  if (reportId === 'maintenance' && !maintenanceEnabled) {
    return <Navigate to="/reports" replace />;
  }

  // If a specific report is selected, show that report
  if (reportId) {
    const renderReport = () => {
      switch (reportId) {
        case 'utilization':
          return <AssetUtilizationReport />;
        case 'maintenance':
          return <MaintenanceComplianceReport />;
        case 'stocktake':
          return <StockTakeSummaryReport />;
        case 'bookings':
          return <BookingHistoryReport />;
        default:
          return (
            <Text c="red">
              Bericht "{reportId}" nicht gefunden.
            </Text>
          );
      }
    };

    return (
      <Container size="xl" py="xl">
        <Stack gap="lg">
          <div>
            <Title order={1}>Reports</Title>
            <Text size="lg" c="dimmed" mt="xs">
                {reportSummary}
            </Text>
          </div>

          {renderReport()}
        </Stack>
      </Container>
    );
  }

  // Otherwise, show the report list
  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={1}>Reports</Title>
          <Text size="lg" c="dimmed" mt="xs">
            {reportSummary}
          </Text>
        </div>

        <ReportList />
      </Stack>
    </Container>
  );
}
