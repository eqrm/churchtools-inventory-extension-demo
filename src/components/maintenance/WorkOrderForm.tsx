/**
 * Work Order Form Component (T147)
 * 
 * Form for creating work orders (from rule or manually) with line items.
 */

import { useState, useMemo } from 'react';
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
  MultiSelect,
  SegmentedControl,
  TextInput,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconBarcode } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { AssetScheduleTable } from './AssetScheduleTable';
import { findAssetByScanValue } from '../../utils/scanUtils';
import type {
  WorkOrder,
  WorkOrderLineItem,
  WorkOrderOrderType,
  WorkOrderType,
} from '../../types/maintenance';
import type { UUID } from '../../types/entities';
import { bindSelectField } from '../../utils/selectControl';

interface WorkOrderFormProps {
  workOrder?: WorkOrder;
  type: WorkOrderType;
  companies?: Array<{ id: UUID; name: string }>;
  assets: Array<{ id: UUID; name: string; assetNumber: string; barcode?: string }>;
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
  const [scanInput, setScanInput] = useState('');

  const assetOptions = useMemo(
    () =>
      assets.map((asset) => ({
        value: asset.id,
        label: asset.name ? `${asset.name} (${asset.assetNumber})` : asset.assetNumber,
      })),
    [assets],
  );

  const form = useForm({
    initialValues: {
      type: workOrder?.type || type,
      state: workOrder?.state || 'backlog',
      orderType: (workOrder?.orderType ?? 'planned') as WorkOrderOrderType,
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
      orderType: (value) =>
        !value || !['planned', 'unplanned', 'follow-up'].includes(value)
          ? t('maintenance:validation.orderTypeRequired')
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
      orderType: values.orderType as WorkOrderOrderType,
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

  const handleLineItemSelectionChange = (ids: string[]) => {
    const preservedItems = new Map(form.values.lineItems.map((item) => [item.assetId, item]));
    const nextItems = ids.map((id) => {
      const existing = preservedItems.get(id as UUID);
      return (
        existing ?? {
          assetId: id as UUID,
          completionStatus: 'pending' as const,
        }
      );
    });
    form.setFieldValue('lineItems', nextItems);
  };

  const handleAssetScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = scanInput.trim();
      if (!value) return;

      const asset = findAssetByScanValue(assets, value);
      if (asset) {
        const isAlreadySelected = form.values.lineItems.some(
          (item) => item.assetId === asset.id
        );

        if (isAlreadySelected) {
          notifications.show({
            title: t('maintenance:messages.assetAlreadySelected', { name: asset.name }),
            message: '',
            color: 'yellow',
          });
        } else {
          const newItem: WorkOrderLineItem = {
            assetId: asset.id,
            completionStatus: 'pending',
          };
          form.setFieldValue('lineItems', [...form.values.lineItems, newItem]);
          notifications.show({
            title: t('maintenance:messages.assetAdded', { name: asset.name }),
            message: '',
            color: 'green',
          });
        }
        setScanInput('');
      } else {
        notifications.show({
          title: t('maintenance:messages.assetNotFound', { value }),
          message: '',
          color: 'red',
        });
      }
    }
  };

  const selectedAssetIds = form.values.lineItems.map((item) => item.assetId);

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
            {...bindSelectField(form, 'ruleId', { emptyValue: '' })}
          />
        )}

        <Box>
          <Text size="sm" fw={500} mb="xs">
            {t('maintenance:fields.orderType')}
          </Text>
          <SegmentedControl
            value={form.values.orderType}
            onChange={(value) =>
              form.setFieldValue('orderType', value as WorkOrderOrderType)
            }
            data={[
              { label: t('maintenance:orderTypes.planned'), value: 'planned' },
              { label: t('maintenance:orderTypes.unplanned'), value: 'unplanned' },
              { label: t('maintenance:orderTypes.follow-up'), value: 'follow-up' },
            ]}
            fullWidth
          />
          <Text size="xs" c="dimmed" mt="xs">
            {t('maintenance:descriptions.orderType')}
          </Text>
        </Box>

        {type === 'external' && (
          <Select
            label={t('maintenance:fields.serviceProvider')}
            placeholder={t('maintenance:placeholders.serviceProvider')}
            required
            data={companies.map((c) => ({ value: c.id, label: c.name }))}
            {...bindSelectField(form, 'companyId', { emptyValue: '' })}
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

        <MultiSelect
          label={t('maintenance:labels.selectAssets')}
          placeholder={t('maintenance:placeholders.targets')}
          data={assetOptions}
          searchable
          clearable
          value={selectedAssetIds}
          onChange={handleLineItemSelectionChange}
          nothingFoundMessage={
            assetOptions.length === 0
              ? t('maintenance:targetPicker.noneAvailable', {
                  label: t('maintenance:targetTypes.asset'),
                })
              : t('maintenance:targetPicker.noMatches')
          }
          description={t('maintenance:descriptions.lineItems')}
        />

        <TextInput
          label={t('maintenance:placeholders.scanBarcode')}
          placeholder={t('maintenance:placeholders.scanBarcode')}
          leftSection={<IconBarcode size={16} />}
          value={scanInput}
          onChange={(e) => setScanInput(e.currentTarget.value)}
          onKeyDown={handleAssetScan}
          mb="sm"
        />

        <Box>
          <Tabs defaultValue="schedule">
            <Tabs.List>
              <Tabs.Tab value="schedule">
                {t('maintenance:tabs.schedule')} ({selectedAssetIds.length} {t('maintenance:selected')})
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
