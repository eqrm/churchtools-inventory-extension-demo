import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Group,
  Stack,
  Text,
  Title,
  List,
  Badge,
  Progress,
  Code,
} from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconPackage, IconX } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { migrateKitsToAssets } from '../../services/migrations/migrateKitsToAssets';
import { useStorageProvider } from '../../hooks/useStorageProvider';

interface MigrationStatus {
  running: boolean;
  completed: boolean;
  success: boolean;
  migratedCount: number;
  skippedCount: number;
  errors: Array<{ kitId: string; error: string }>;
}

export function MigrationSettings() {
  const storageProvider = useStorageProvider();
  const [dryRunResult, setDryRunResult] = useState<MigrationStatus | null>(null);
  const [migrationResult, setMigrationResult] = useState<MigrationStatus | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleDryRun = async () => {
    if (!storageProvider) {
      notifications.show({
        title: 'Error',
        message: 'Storage provider not available',
        color: 'red',
      });
      return;
    }

    setIsRunning(true);
    setDryRunResult(null);

    try {
      const result = await migrateKitsToAssets(storageProvider, { dryRun: true });
      
      setDryRunResult({
        running: false,
        completed: true,
        success: result.success,
        migratedCount: result.migratedCount,
        skippedCount: result.skippedCount,
        errors: result.errors,
      });

      notifications.show({
        title: 'Dry Run Completed',
        message: `Would migrate ${result.migratedCount} kits (${result.skippedCount} skipped)`,
        color: 'blue',
      });
    } catch (error) {
      notifications.show({
        title: 'Dry Run Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        color: 'red',
      });
      setDryRunResult({
        running: false,
        completed: true,
        success: false,
        migratedCount: 0,
        skippedCount: 0,
        errors: [{ kitId: 'GLOBAL', error: error instanceof Error ? error.message : 'Unknown error' }],
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleMigrate = async () => {
    if (!storageProvider) {
      notifications.show({
        title: 'Error',
        message: 'Storage provider not available',
        color: 'red',
      });
      return;
    }

    if (!confirm('Are you sure you want to migrate all kits to assets? This cannot be easily undone.')) {
      return;
    }

    setIsRunning(true);
    setMigrationResult(null);

    try {
      const result = await migrateKitsToAssets(storageProvider);
      
      setMigrationResult({
        running: false,
        completed: true,
        success: result.success,
        migratedCount: result.migratedCount,
        skippedCount: result.skippedCount,
        errors: result.errors,
      });

      if (result.success) {
        notifications.show({
          title: 'Migration Successful',
          message: `Migrated ${result.migratedCount} kits to assets`,
          color: 'green',
          icon: <IconCheck />,
        });
      } else {
        notifications.show({
          title: 'Migration Completed with Errors',
          message: `Migrated ${result.migratedCount} kits, but ${result.errors.length} errors occurred`,
          color: 'orange',
          icon: <IconAlertTriangle />,
        });
      }
    } catch (error) {
      notifications.show({
        title: 'Migration Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        color: 'red',
        icon: <IconX />,
      });
      setMigrationResult({
        running: false,
        completed: true,
        success: false,
        migratedCount: 0,
        skippedCount: 0,
        errors: [{ kitId: 'GLOBAL', error: error instanceof Error ? error.message : 'Unknown error' }],
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Stack gap="lg">
      <div>
        <Title order={3}>Kit to Asset Migration</Title>
        <Text size="sm" c="dimmed" mt="xs">
          Migrate existing Kit entities to Asset entities with kit functionality
        </Text>
      </div>

      <Alert icon={<IconAlertTriangle />} title="Important" color="orange">
        <Stack gap="xs">
          <Text size="sm">
            This migration will convert all Kit entities to Assets with <Code>isKit: true</Code>.
            This is a one-time operation needed to integrate kits into the unified asset system.
          </Text>
          <Text size="sm" fw={600}>
            Before running the migration:
          </Text>
          <List size="sm" spacing="xs">
            <List.Item>Backup your data</List.Item>
            <List.Item>Run a dry-run first to preview changes</List.Item>
            <List.Item>Ensure no one else is using the system</List.Item>
            <List.Item>Review the migration documentation</List.Item>
          </List>
        </Stack>
      </Alert>

      <Card withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Text fw={600}>Dry Run (Test Mode)</Text>
              <Text size="sm" c="dimmed">
                Preview what would be migrated without making changes
              </Text>
            </div>
            <Button
              leftSection={<IconPackage size={16} />}
              onClick={handleDryRun}
              loading={isRunning}
              disabled={isRunning}
            >
              Run Dry Run
            </Button>
          </Group>

          {dryRunResult && (
            <Alert
              color={dryRunResult.success ? 'blue' : 'red'}
              title={dryRunResult.success ? 'Dry Run Results' : 'Dry Run Failed'}
            >
              <Stack gap="xs">
                <Group gap="md">
                  <Badge color="blue">{dryRunResult.migratedCount} would be migrated</Badge>
                  <Badge color="gray">{dryRunResult.skippedCount} skipped</Badge>
                  {dryRunResult.errors.length > 0 && (
                    <Badge color="red">{dryRunResult.errors.length} errors</Badge>
                  )}
                </Group>
                {dryRunResult.errors.length > 0 && (
                  <div>
                    <Text size="sm" fw={600} mt="sm">Errors:</Text>
                    <List size="sm">
                      {dryRunResult.errors.slice(0, 5).map((err, idx) => (
                        <List.Item key={idx}>
                          Kit {err.kitId}: {err.error}
                        </List.Item>
                      ))}
                      {dryRunResult.errors.length > 5 && (
                        <List.Item>... and {dryRunResult.errors.length - 5} more</List.Item>
                      )}
                    </List>
                  </div>
                )}
              </Stack>
            </Alert>
          )}
        </Stack>
      </Card>

      <Card withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Text fw={600}>Run Migration</Text>
              <Text size="sm" c="dimmed">
                Execute the actual migration (this modifies data)
              </Text>
            </div>
            <Button
              leftSection={<IconPackage size={16} />}
              onClick={handleMigrate}
              loading={isRunning}
              disabled={isRunning}
              color="orange"
            >
              Migrate Kits
            </Button>
          </Group>

          {migrationResult && (
            <Alert
              color={migrationResult.success ? 'green' : 'red'}
              icon={migrationResult.success ? <IconCheck /> : <IconX />}
              title={migrationResult.success ? 'Migration Successful' : 'Migration Failed'}
            >
              <Stack gap="xs">
                <Group gap="md">
                  <Badge color="green">{migrationResult.migratedCount} migrated</Badge>
                  <Badge color="gray">{migrationResult.skippedCount} skipped</Badge>
                  {migrationResult.errors.length > 0 && (
                    <Badge color="red">{migrationResult.errors.length} errors</Badge>
                  )}
                </Group>
                {migrationResult.errors.length > 0 && (
                  <div>
                    <Text size="sm" fw={600} mt="sm">Errors:</Text>
                    <List size="sm">
                      {migrationResult.errors.slice(0, 5).map((err, idx) => (
                        <List.Item key={idx}>
                          Kit {err.kitId}: {err.error}
                        </List.Item>
                      ))}
                      {migrationResult.errors.length > 5 && (
                        <List.Item>... and {migrationResult.errors.length - 5} more</List.Item>
                      )}
                    </List>
                  </div>
                )}
              </Stack>
            </Alert>
          )}
        </Stack>
      </Card>

      {isRunning && (
        <Card withBorder>
          <Stack gap="xs">
            <Text size="sm" fw={600}>Migration in progress...</Text>
            <Progress value={100} animated />
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
