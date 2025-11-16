/**
 * Dashboard Grid Layout Component (T168)
 * 
 * Responsive grid layout for dashboard widgets.
 */

import { SimpleGrid } from '@mantine/core';
import { MyAssignedAssets } from './widgets/MyAssignedAssets';
import { AssetsNeedingAttention } from './widgets/AssetsNeedingAttention';
import { UpcomingMaintenance } from './widgets/UpcomingMaintenance';
import { RecentActivityTimeline } from './widgets/RecentActivityTimeline';
import { UtilizationStats } from './widgets/UtilizationStats';
import { OverdueWorkOrders } from './widgets/OverdueWorkOrders';

export function DashboardGrid() {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
      <MyAssignedAssets />
      <AssetsNeedingAttention />
      <UpcomingMaintenance />
      <RecentActivityTimeline />
      <UtilizationStats />
      <OverdueWorkOrders />
    </SimpleGrid>
  );
}
