/**
 * Maintenance Rule Form Component (T146)
 * 
 * Form for creating and editing maintenance rules with target selector.
 */

import { useMemo, useState } from 'react';
import { useForm } from '@mantine/form';
import {
  TextInput,
  NumberInput,
  Button,
  Stack,
  Group,
  Select,
  Switch,
  MultiSelect,
  SegmentedControl,
  Box,
  Text,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useTranslation } from 'react-i18next';
import type {
  MaintenanceRule,
  MaintenanceTargetType,
  MaintenanceIntervalType,
  MaintenanceWorkType,
} from '../../types/maintenance';
import type { UUID } from '../../types/entities';
import { MAINTENANCE_WORK_TYPES } from '../../constants/maintenanceWorkTypes';
import { bindMultiSelectField, bindSelectField } from '../../utils/selectControl';

interface MaintenanceRuleFormProps {
  rule?: MaintenanceRule;
  companies: Array<{ id: UUID; name: string }>;
  assets: Array<{ id: UUID; name: string }>;
  kits: Array<{ id: UUID; name: string }>;
  models: Array<{ id: UUID; name: string }>;
  tags: Array<{ id: UUID; name: string; color?: string }>;
  onSubmit: (data: Omit<MaintenanceRule, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'createdByName' | 'nextDueDate'>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function MaintenanceRuleForm({
  rule,
  companies,
  assets,
  kits,
  models,
  tags,
  onSubmit,
  onCancel,
  isLoading = false,
}: MaintenanceRuleFormProps) {
  const { t } = useTranslation(['maintenance', 'common']);

  const [targetType, setTargetType] = useState<MaintenanceTargetType>(
    rule?.targets?.[0]?.type || 'asset'
  );

  const workTypeOptions = useMemo(
    () =>
      MAINTENANCE_WORK_TYPES.map((value) => ({
        value,
        label: t(`maintenance:workTypes.${value}`),
      })),
    [t],
  );

  const form = useForm({
    initialValues: {
      name: rule?.name || '',
      workType: (rule?.workType ?? 'inspection') as MaintenanceWorkType,
      isInternal: rule?.isInternal ?? true,
      serviceProviderId: rule?.serviceProviderId || '',
      targetIds: rule?.targets?.[0]?.ids || [],
      intervalType: (rule?.intervalType || 'months') as MaintenanceIntervalType,
      intervalValue: rule?.intervalValue || 6,
      startDate: rule?.startDate ? new Date(rule.startDate) : new Date(),
      leadTimeDays: rule?.leadTimeDays || 14,
    },
    validate: {
      name: (value) =>
        !value
          ? t('maintenance:validation.ruleNameRequired')
          : value.length > 200
            ? t('maintenance:validation.ruleNameMaxLength')
            : null,
      workType: (value) =>
        !value || !MAINTENANCE_WORK_TYPES.includes(value as MaintenanceWorkType)
          ? t('maintenance:validation.workTypeRequired')
          : null,
      serviceProviderId: (value, values) =>
        !values.isInternal && !value
          ? t('maintenance:validation.serviceProviderRequired')
          : null,
      targetIds: (value) =>
        !value || value.length === 0
          ? t('maintenance:validation.targetsRequired')
          : null,
      intervalValue: (value) =>
        !value || value <= 0
          ? t('maintenance:validation.intervalValuePositive')
          : null,
      leadTimeDays: (value) =>
        value < 0
          ? t('maintenance:validation.leadTimeDaysNonNegative')
          : null,
    },
  });

  const handleSubmit = (values: typeof form.values) => {
    const data = {
      name: values.name,
      workType: values.workType,
      isInternal: values.isInternal,
      serviceProviderId: values.isInternal ? undefined : values.serviceProviderId,
      targets: [
        {
          type: targetType,
          ids: values.targetIds,
        },
      ],
      intervalType: values.intervalType,
      intervalValue: values.intervalValue,
      startDate: values.startDate.toISOString().split('T')[0] || '',
      leadTimeDays: values.leadTimeDays,
    };

    onSubmit(data);
  };

  const targetOptions = {
    asset: assets.map((a) => ({ value: a.id, label: a.name })),
    kit: kits.map((k) => ({ value: k.id, label: k.name })),
    model: models.map((m) => ({ value: m.id, label: m.name })),
    tag: tags.map((tag) => ({ value: tag.id, label: tag.name })),
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <TextInput
          label={t('maintenance:fields.ruleName')}
          placeholder={t('maintenance:placeholders.ruleName')}
          required
          {...form.getInputProps('name')}
        />

        <Select
          label={t('maintenance:fields.workType')}
          placeholder={t('maintenance:placeholders.workType')}
          description={t('maintenance:descriptions.workType')}
          required
          data={workTypeOptions}
          {...bindSelectField(form, 'workType', {
            parse: (value) => value as MaintenanceWorkType,
          })}
        />

        <Switch
          label={t('maintenance:fields.isInternal')}
          description={t('maintenance:descriptions.isInternal')}
          {...form.getInputProps('isInternal', { type: 'checkbox' })}
        />

        {!form.values.isInternal && (
          <Select
            label={t('maintenance:fields.serviceProvider')}
            placeholder={t('maintenance:placeholders.serviceProvider')}
            required
            data={companies.map((c) => ({ value: c.id, label: c.name }))}
            {...bindSelectField(form, 'serviceProviderId', { emptyValue: '' })}
          />
        )}

        <Box>
          <Text size="sm" fw={500} mb="xs">
            {t('maintenance:fields.appliesTo')} *
          </Text>
          <SegmentedControl
            value={targetType}
            onChange={(value) => {
              setTargetType(value as MaintenanceTargetType);
              form.setFieldValue('targetIds', []);
            }}
            data={[
              { label: t('maintenance:targetTypes.asset'), value: 'asset' },
              { label: t('maintenance:targetTypes.kit'), value: 'kit' },
              { label: t('maintenance:targetTypes.model'), value: 'model' },
              { label: t('maintenance:targetTypes.tag'), value: 'tag' },
            ]}
            fullWidth
            mb="xs"
          />
          <MultiSelect
            placeholder={t('maintenance:placeholders.selectTargets')}
            data={targetOptions[targetType] || []}
            searchable
            required
            clearable
            nothingFoundMessage={
              (targetOptions[targetType] || []).length === 0
                ? `No ${targetType}s available. ${targetType === 'tag' ? 'Create tags from an asset detail page.' : `Please create ${targetType}s first.`}`
                : 'No matches found'
            }
            description={
              (targetOptions[targetType] || []).length === 0
                ? `⚠️ No ${targetType}s found - you need to create some first`
                : undefined
            }
            {...bindMultiSelectField(form, 'targetIds')}
          />
        </Box>

        <Group grow>
          <NumberInput
            label={t('maintenance:fields.intervalValue')}
            placeholder="6"
            required
            min={1}
            {...form.getInputProps('intervalValue')}
          />
          <Select
            label={t('maintenance:fields.intervalType')}
            required
            data={[
              { value: 'months', label: t('maintenance:intervalTypes.months') },
              { value: 'uses', label: t('maintenance:intervalTypes.uses') },
            ]}
            {...bindSelectField(form, 'intervalType', {
              parse: (value) => value as MaintenanceIntervalType,
            })}
          />
        </Group>

        <DateInput
          label={t('maintenance:fields.startDate')}
          description={t('maintenance:descriptions.startDate')}
          required
          minDate={new Date()}
          {...form.getInputProps('startDate')}
        />

        <NumberInput
          label={t('maintenance:fields.leadTimeDays')}
          placeholder="14"
          description={t('maintenance:descriptions.leadTimeDays')}
          min={0}
          {...form.getInputProps('leadTimeDays')}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onCancel} disabled={isLoading}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" loading={isLoading}>
            {rule ? t('common:actions.save') : t('common:actions.create')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
