/**
 * Maintenance Rule Form Component (T146)
 * 
 * Form for creating and editing maintenance rules with target selector.
 */

import { Fragment, useMemo, useState } from 'react';
import { useForm } from '@mantine/form';
import {
  TextInput,
  NumberInput,
  Button,
  Stack,
  Group,
  Select,
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
  MaintenanceRescheduleMode,
} from '../../types/maintenance';
import type { ISODate, ISOTimestamp, UUID } from '../../types/entities';
import { MAINTENANCE_WORK_TYPES } from '../../constants/maintenanceWorkTypes';
import { bindMultiSelectField, bindSelectField } from '../../utils/selectControl';
import { MaintenanceRuleTestModal } from './MaintenanceRuleTestModal';

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
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testRuleDraft, setTestRuleDraft] = useState<MaintenanceRule | null>(null);

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
      workTypeCustomLabel: rule?.workTypeCustomLabel || '',
      isInternal: rule?.isInternal ?? true,
      serviceProviderId: rule?.serviceProviderId || '',
      targetIds: rule?.targets?.[0]?.ids || [],
      intervalType: (rule?.intervalType || 'months') as MaintenanceIntervalType,
      intervalValue: rule?.intervalValue || 6,
      startDate: rule?.startDate ? new Date(rule.startDate) : new Date(),
      leadTimeDays: rule?.leadTimeDays || 14,
      rescheduleMode: (rule?.rescheduleMode ?? 'actual-completion') as MaintenanceRescheduleMode,
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
      workTypeCustomLabel: (value, values) =>
        values.workType === 'custom' && (!value || !value.trim())
          ? t('maintenance:validation.customWorkTypeRequired')
          : value && value.length > 200
            ? t('maintenance:validation.workTypeMaxLength')
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
      rescheduleMode: (value) =>
        !value || !['actual-completion', 'replan-once'].includes(value)
          ? t('maintenance:validation.rescheduleModeRequired')
          : null,
    },
  });

  const handleSubmit = (values: typeof form.values) => {
    const data = {
      name: values.name,
      workType: values.workType,
      workTypeCustomLabel:
        values.workType === 'custom'
          ? values.workTypeCustomLabel?.trim() || undefined
          : undefined,
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
      rescheduleMode: values.rescheduleMode,
    };

    onSubmit(data);
  };

  const targetOptions = useMemo(() => {
    const sortByLabel = <T extends { label: string }>(list: T[]) =>
      [...list].sort((a, b) => a.label.localeCompare(b.label));

    return {
      asset: sortByLabel(assets.map((a) => ({ value: a.id, label: a.name }))),
      kit: sortByLabel(kits.map((k) => ({ value: k.id, label: k.name }))),
      model: sortByLabel(models.map((m) => ({ value: m.id, label: m.name }))),
      tag: sortByLabel(tags.map((tag) => ({ value: tag.id, label: tag.name }))),
    } as Record<MaintenanceTargetType, Array<{ value: string; label: string }>>;
  }, [assets, kits, models, tags]);

  const currentTargetOptions = targetOptions[targetType] ?? [];
  const noTargetsAvailable = currentTargetOptions.length === 0;

  const buildTestRulePayload = (): MaintenanceRule | null => {
    const startDateValue = form.values.startDate;
    if (!startDateValue) {
      return null;
    }

    const startIso = startDateValue.toISOString().split('T')[0] as ISODate;
    const fallbackTimestamp = new Date().toISOString() as ISOTimestamp;

    return {
      id: (rule?.id ?? 'preview-rule') as UUID,
      name: form.values.name || t('maintenance:rules.testRuleFallbackName'),
      workType: form.values.workType,
      workTypeCustomLabel:
        form.values.workType === 'custom'
          ? form.values.workTypeCustomLabel?.trim() || undefined
          : rule?.workTypeCustomLabel,
      isInternal: form.values.isInternal,
      serviceProviderId: form.values.isInternal ? undefined : form.values.serviceProviderId || undefined,
      targets: [
        {
          type: targetType,
          ids: (form.values.targetIds as UUID[]) ?? [],
        },
      ],
      intervalType: form.values.intervalType,
      intervalValue: form.values.intervalValue,
      startDate: startIso,
      nextDueDate: (rule?.nextDueDate as ISODate) ?? startIso,
      leadTimeDays: form.values.leadTimeDays,
      rescheduleMode: form.values.rescheduleMode,
      createdBy: (rule?.createdBy ?? 'preview-user') as UUID,
      createdByName: rule?.createdByName,
      createdAt: (rule?.createdAt ?? fallbackTimestamp) as ISOTimestamp,
      updatedAt: (rule?.updatedAt ?? fallbackTimestamp) as ISOTimestamp,
    };
  };

  const handleOpenTestModal = () => {
    const validation = form.validate();
    if (validation.hasErrors) {
      return;
    }
    const payload = buildTestRulePayload();
    if (!payload) {
      return;
    }
    setTestRuleDraft(payload);
    setIsTestModalOpen(true);
  };

  const handleCloseTestModal = () => {
    setIsTestModalOpen(false);
    setTestRuleDraft(null);
  };

  return (
    <Fragment>
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

        {form.values.workType === 'custom' && (
          <TextInput
            label={t('maintenance:fields.customWorkType')}
            placeholder={t('maintenance:placeholders.customWorkType')}
            required
            {...form.getInputProps('workTypeCustomLabel')}
          />
        )}

        <Box>
          <Text size="sm" fw={500} mb={4}>
            {t('maintenance:fields.isInternal')}
          </Text>
          <SegmentedControl
            value={form.values.isInternal ? 'internal' : 'external'}
            onChange={(value) => form.setFieldValue('isInternal', value === 'internal')}
            data={[
              { label: t('maintenance:types.internal'), value: 'internal' },
              { label: t('maintenance:types.external'), value: 'external' },
            ]}
            fullWidth
          />
          <Text size="xs" c="dimmed" mt={4}>
            {t('maintenance:descriptions.isInternal')}
          </Text>
        </Box>

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
            data={currentTargetOptions}
            searchable
            required
            clearable
            nothingFoundMessage={
              noTargetsAvailable
                ? t('maintenance:targetPicker.noneAvailable', {
                    label: t(`maintenance:targetTypes.${targetType}`),
                  })
                : t('maintenance:targetPicker.noMatches')
            }
            description={
              noTargetsAvailable
                ? t('maintenance:targetPicker.help', {
                    label: t(`maintenance:targetTypes.${targetType}`),
                  })
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
              { value: 'days', label: t('maintenance:intervalTypes.days') },
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

        <Box>
          <Text size="sm" fw={500} mb="xs">
            {t('maintenance:fields.rescheduleMode')}
          </Text>
          <SegmentedControl
            value={form.values.rescheduleMode}
            onChange={(value) =>
              form.setFieldValue('rescheduleMode', value as MaintenanceRescheduleMode)
            }
            data={[
              {
                label: t('maintenance:rescheduleModes.actualCompletion'),
                value: 'actual-completion',
              },
              {
                label: t('maintenance:rescheduleModes.replanOnce'),
                value: 'replan-once',
              },
            ]}
            fullWidth
          />
          <Text size="xs" c="dimmed" mt="xs">
            {t('maintenance:descriptions.rescheduleMode')}
          </Text>
        </Box>

        <Group justify="space-between" align="flex-start" mt="sm">
          <Text size="sm" c="dimmed" maw="70%">
            {t('maintenance:rules.testRuleHelper')}
          </Text>
          <Button variant="light" type="button" onClick={handleOpenTestModal}>
            {t('maintenance:rules.testRuleButton')}
          </Button>
        </Group>

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

      {testRuleDraft && (
        <MaintenanceRuleTestModal
          opened={isTestModalOpen}
          onClose={handleCloseTestModal}
          rule={testRuleDraft}
        />
      )}
    </Fragment>
  );
}
