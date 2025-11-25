import { Card, Stack, Text, Button, Group } from '@mantine/core';
import { IconAlertTriangle, IconHash } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useAssetPrefixes } from '../../hooks/useAssetPrefixes';

export function PrefixWarningCard(): JSX.Element | null {
  const { data: prefixes = [], isLoading, isError } = useAssetPrefixes();

  if (isLoading || isError || prefixes.length > 0) {
    return null;
  }

  return (
    <Card withBorder padding="lg" radius="md" bg="yellow.0">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <Group gap="xs" align="flex-start">
            <IconAlertTriangle size={20} color="var(--mantine-color-yellow-7)" />
            <Stack gap={4}>
              <Text fw={600}>Asset numbering needs setup</Text>
              <Text size="sm" c="dimmed">
                Automatic numbering relies on prefixes. Add at least one prefix so new assets receive unique identifiers.
              </Text>
            </Stack>
          </Group>
          <Button
            component={Link}
            to="/settings#prefixes"
            variant="light"
            color="yellow"
            leftSection={<IconHash size={16} />}
          >
            Configure Prefixes
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
