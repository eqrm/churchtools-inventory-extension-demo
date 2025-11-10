import { Card, Stack, Title, Text, Switch } from '@mantine/core';
import { useFeatureSettingsStore } from '../../stores';

export function FeatureToggleSettings() {
  const { bookingsEnabled, kitsEnabled, maintenanceEnabled, setModuleEnabled } = useFeatureSettingsStore((state) => ({
    bookingsEnabled: state.bookingsEnabled,
    kitsEnabled: state.kitsEnabled,
    maintenanceEnabled: state.maintenanceEnabled,
    setModuleEnabled: state.setModuleEnabled,
  }));

  return (
    <Card withBorder>
      <Stack gap="lg">
        <Stack gap={4}>
          <Title order={3}>Modules</Title>
          <Text size="sm" c="dimmed">
            Control which workflow modules are available across the application.
          </Text>
        </Stack>

        <Switch
          label="Enable bookings"
          description="Show booking schedules, calendar, and related reports."
          checked={bookingsEnabled}
          onChange={(event) => setModuleEnabled('bookings', event.currentTarget.checked)}
        />

        <Switch
          label="Enable kits"
          description="Include kit management pages and tooling."
          checked={kitsEnabled}
          onChange={(event) => setModuleEnabled('kits', event.currentTarget.checked)}
        />

        <Switch
          label="Enable maintenance"
          description="Expose maintenance dashboards, reminders, and reports."
          checked={maintenanceEnabled}
          onChange={(event) => setModuleEnabled('maintenance', event.currentTarget.checked)}
        />
      </Stack>
    </Card>
  );
}
