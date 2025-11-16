/**
 * Work Order Invoicing UI Stub Component (T165)
 * 
 * Placeholder for future invoicing functionality with "Coming Soon" message.
 */

import { Stack, Paper, Text, Button, Alert, Group } from '@mantine/core';
import { IconUpload, IconInfoCircle, IconFileInvoice } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

interface WorkOrderInvoicingStubProps {
  _workOrderNumber?: string; // Reserved for future use
}

export function WorkOrderInvoicingStub(_props: WorkOrderInvoicingStubProps) {
  const { t } = useTranslation(['maintenance', 'common']);

  return (
    <Paper withBorder p="md">
      <Stack gap="md">
        <Group justify="space-between">
          <Group gap="xs">
            <IconFileInvoice size={20} />
            <Text size="sm" fw={500}>
              {t('maintenance:invoicing.title')}
            </Text>
          </Group>
        </Group>

        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
          {t('maintenance:invoicing.comingSoon')}
        </Alert>

        <Stack gap="xs">
          <Text size="sm" c="dimmed">
            {t('maintenance:invoicing.futureFeatures')}:
          </Text>
          <Text size="sm" c="dimmed" pl="md">
            • {t('maintenance:invoicing.uploadInvoice')}
          </Text>
          <Text size="sm" c="dimmed" pl="md">
            • {t('maintenance:invoicing.trackCosts')}
          </Text>
          <Text size="sm" c="dimmed" pl="md">
            • {t('maintenance:invoicing.generateReports')}
          </Text>
          <Text size="sm" c="dimmed" pl="md">
            • {t('maintenance:invoicing.exportData')}
          </Text>
        </Stack>

        <Button
          leftSection={<IconUpload size={16} />}
          variant="light"
          disabled
          fullWidth
        >
          {t('maintenance:invoicing.uploadInvoice')}
        </Button>

        <Text size="xs" c="dimmed" ta="center">
          {t('maintenance:invoicing.plannedRelease')}
        </Text>
      </Stack>
    </Paper>
  );
}
