/**
 * Work Order Form Component (T147)
 * 
 * Form for creating work orders (from rule or manually) with line items.
 */

import { useForm } from '@mantine/form';
import {
  Button,
  Stack,
  Group,
  Select,
  Text,
  NumberInput,
  Box,
  Tabs,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useTranslation } from 'react-i18next';
import { AssetScheduleTable } from './AssetScheduleTable';
import type { WorkOrder, WorkOrderLineItem, WorkOrderType } from '../../types/maintenance';
import type { UUID } from '../../types/entities';

interface WorkOrderFormProps {
  workOrder?: WorkOrder;
  type: WorkOrderType;
  companies?: Array<{ id: UUID; name: string }>;
  assets: Array<{ id: UUID; name: string; assetNumber: string }>;
  rules?: Array<{ id: UUID; name: string }>;
  defaultLineItems?: WorkOrderLineItem[];
  onSubmit: (data: Omit<WorkOrder, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'createdByName' | 'workOrderNumber' | 'history'>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function WorkOrderForm({
  workOrder,
  type,
  companies = [],
  assets,
  rules = [],
  defaultLineItems = [],
  onSubmit,
  onCancel,
  isLoading = false,
}: WorkOrderFormProps) {
  const { t } = useTranslation(['maintenance', 'common']);

  const form = useForm({
    initialValues: {
      type: workOrder?.type || type,
      state: workOrder?.state || 'backlog',
      ruleId: workOrder?.ruleId || '',
      companyId: workOrder?.companyId || '',
      assignedTo: workOrder?.assignedTo || '',
      approvalResponsibleId: workOrder?.approvalResponsibleId || '',
      leadTimeDays: workOrder?.leadTimeDays || 14,
      scheduledStart: workOrder?.scheduledStart ? new Date(workOrder.scheduledStart) : undefined,
      scheduledEnd: workOrder?.scheduledEnd ? new Date(workOrder.scheduledEnd) : undefined,
      lineItems: workOrder?.lineItems || defaultLineItems,
      offers: workOrder?.offers || [],
    },
    validate: {
      companyId: (value, values) =>
        values.type === 'external' && !value
          ? t('maintenance:validation.companyRequired')
          : null,
      lineItems: (value) =>
        !value || value.length === 0
          ? t('maintenance:validation.lineItemsRequired')
          : null,
      leadTimeDays: (value) =>
        value < 0
          ? t('maintenance:validation.leadTimeDaysNonNegative')
          : null,
    },
  });

  const handleSubmit = (values: typeof form.values) => {
    const data = {
      type: values.type,
      state: values.state as WorkOrder['state'],
      ruleId: values.ruleId || undefined,
      companyId: values.companyId || undefined,
      assignedTo: values.assignedTo || undefined,
      approvalResponsibleId: values.approvalResponsibleId || undefined,
      leadTimeDays: values.leadTimeDays,
      scheduledStart: values.scheduledStart?.toISOString().split('T')[0],
      scheduledEnd: values.scheduledEnd?.toISOString().split('T')[0],
      lineItems: values.lineItems,
      offers: values.offers,
    };

    onSubmit(data);
  };

  const handleUpdateLineItem = (assetId: UUID, updates: Partial<WorkOrderLineItem>) => {
    const updatedItems = form.values.lineItems.map((item) =>
      item.assetId === assetId ? { ...item, ...updates } : item
    );
    form.setFieldValue('lineItems', updatedItems);
  };

  const handleMarkAssetComplete = (assetId: UUID) => {
    const updatedItems = form.values.lineItems.map((item) =>
      item.assetId === assetId
        ? {
            ...item,
            completionStatus: 'completed' as const,
            completedAt: new Date().toISOString(),
          }
        : item
    );
    form.setFieldValue('lineItems', updatedItems);
  };

  const selectedAssetIds = new Set(form.values.lineItems.map((item) => item.assetId));

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        {rules.length > 0 && (
          <Select
            label={t('maintenance:fields.maintenanceRule')}
            placeholder={t('maintenance:placeholders.maintenanceRule')}
            description={t('maintenance:descriptions.maintenanceRule')}
            data={rules.map((r) => ({ value: r.id, label: r.name }))}
            clearable
            {...form.getInputProps('ruleId')}
          />
        )}

        {type === 'external' && (
          <Select
            label={t('maintenance:fields.serviceProvider')}
            placeholder={t('maintenance:placeholders.serviceProvider')}
            required
            data={companies.map((c) => ({ value: c.id, label: c.name }))}
            {...form.getInputProps('companyId')}
          />
        )}

        <Group grow>
          <DateInput
            label={t('maintenance:fields.scheduledStart')}
            placeholder={t('maintenance:placeholders.scheduledStart')}
            minDate={new Date()}
            {...form.getInputProps('scheduledStart')}
          />
          <DateInput
            label={t('maintenance:fields.scheduledEnd')}
            placeholder={t('maintenance:placeholders.scheduledEnd')}
            minDate={form.values.scheduledStart || new Date()}
            {...form.getInputProps('scheduledEnd')}
          />
        </Group>

        <NumberInput
          label={t('maintenance:fields.leadTimeDays')}
          placeholder="14"
          description={t('maintenance:descriptions.leadTimeDays')}
          min={0}
          {...form.getInputProps('leadTimeDays')}
        />

        <Box>
          <Tabs defaultValue="schedule">
            <Tabs.List>
              <Tabs.Tab value="schedule">
                {t('maintenance:tabs.schedule')} ({selectedAssetIds.size} {t('maintenance:selected')})
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="schedule" pt="md">
              <AssetScheduleTable
                lineItems={form.values.lineItems}
                assets={assets}
                editable={true}
                onUpdateLineItem={handleUpdateLineItem}
                onMarkComplete={handleMarkAssetComplete}
              />
            </Tabs.Panel>
          </Tabs>
          {form.errors['lineItems'] && (
            <Text size="xs" c="red" mt="xs">
              {form.errors['lineItems']}
            </Text>
          )}
        </Box>

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onCancel} disabled={isLoading}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" loading={isLoading}>
            {workOrder ? t('common:actions.save') : t('common:actions.create')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
