/**
 * Maintenance Company Form Component (T145)
 * 
 * Form for creating and editing maintenance service provider companies.
 */

import { useForm } from '@mantine/form';
import { TextInput, Textarea, NumberInput, Button, Stack, Group } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { MaintenanceCompany } from '../../types/maintenance';

interface MaintenanceCompanyFormValues {
  name: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  address: string;
  serviceLevelAgreement: string;
  hourlyRate?: number;
  contractNotes?: string;
}

interface MaintenanceCompanyFormProps {
  company?: MaintenanceCompany;
  onSubmit: (data: Omit<MaintenanceCompany, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'createdByName'>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function MaintenanceCompanyForm({
  company,
  onSubmit,
  onCancel,
  isLoading = false,
}: MaintenanceCompanyFormProps) {
  const { t } = useTranslation(['maintenance', 'common']);

  const form = useForm<MaintenanceCompanyFormValues>({
    initialValues: {
      name: company?.name || '',
      contactPerson: company?.contactPerson || '',
      contactEmail: company?.contactEmail || '',
      contactPhone: company?.contactPhone || '',
      address: company?.address || '',
      serviceLevelAgreement: company?.serviceLevelAgreement || '',
      hourlyRate: company?.hourlyRate,
      contractNotes: company?.contractNotes || '',
    },
    validate: {
      name: (value) =>
        !value
          ? t('maintenance:validation.companyNameRequired')
          : value.length > 200
            ? t('maintenance:validation.companyNameMaxLength')
            : null,
      contactPerson: (value) =>
        value && value.length > 200 ? t('maintenance:validation.contactPersonMaxLength') : null,
      contactEmail: (value) =>
        value && !EMAIL_REGEX.test(value.trim())
          ? t('maintenance:validation.contactEmailInvalid')
          : null,
      contactPhone: (value) => {
        if (!value) return null;
        const normalized = value.replace(/[^0-9]/g, '');
        if (normalized.length < 4 || normalized.length > 20) {
          return t('maintenance:validation.contactPhoneInvalid');
        }
        return null;
      },
      address: (value) =>
        !value
          ? t('maintenance:validation.addressRequired')
          : value.length > 500
            ? t('maintenance:validation.addressMaxLength')
            : null,
      serviceLevelAgreement: (value) =>
        !value
          ? t('maintenance:validation.slaRequired')
          : value.length > 1000
            ? t('maintenance:validation.slaMaxLength')
            : null,
      hourlyRate: (value) =>
        value !== undefined && value < 0
          ? t('maintenance:validation.hourlyRatePositive')
          : null,
    },
  });

  const normalizeOptional = (value?: string | null) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  };

  const handleSubmit = (values: MaintenanceCompanyFormValues) => {
    const payload: MaintenanceCompanyFormValues = {
      ...values,
      name: values.name.trim(),
      address: values.address.trim(),
      serviceLevelAgreement: values.serviceLevelAgreement.trim(),
      contactPerson: normalizeOptional(values.contactPerson),
      contactEmail: normalizeOptional(values.contactEmail),
      contactPhone: normalizeOptional(values.contactPhone),
      contractNotes: normalizeOptional(values.contractNotes),
    };

    onSubmit(payload);
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <TextInput
          label={t('maintenance:fields.companyName')}
          placeholder={t('maintenance:placeholders.companyName')}
          required
          {...form.getInputProps('name')}
        />

        <TextInput
          label={t('maintenance:fields.contactPerson')}
          placeholder={t('maintenance:placeholders.contactPersonOptional')}
          {...form.getInputProps('contactPerson')}
        />

        <TextInput
          label={t('maintenance:fields.contactEmail')}
          placeholder={t('maintenance:placeholders.contactEmail')}
          {...form.getInputProps('contactEmail')}
        />

        <TextInput
          label={t('maintenance:fields.contactPhone')}
          placeholder={t('maintenance:placeholders.contactPhone')}
          {...form.getInputProps('contactPhone')}
        />

        <Textarea
          label={t('maintenance:fields.address')}
          placeholder={t('maintenance:placeholders.address')}
          required
          minRows={3}
          {...form.getInputProps('address')}
        />

        <Textarea
          label={t('maintenance:fields.serviceLevelAgreement')}
          placeholder={t('maintenance:placeholders.serviceLevelAgreement')}
          description={t('maintenance:descriptions.serviceLevelAgreement')}
          required
          minRows={4}
          {...form.getInputProps('serviceLevelAgreement')}
        />

        <NumberInput
          label={t('maintenance:fields.hourlyRate')}
          placeholder={t('maintenance:placeholders.hourlyRate')}
          description={t('maintenance:descriptions.hourlyRate')}
          min={0}
          decimalScale={2}
          prefix="€ "
          {...form.getInputProps('hourlyRate')}
        />

        <Textarea
          label={t('maintenance:fields.contractNotes')}
          placeholder={t('maintenance:placeholders.contractNotes')}
          description={t('maintenance:descriptions.contractNotes')}
          minRows={3}
          {...form.getInputProps('contractNotes')}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onCancel} disabled={isLoading}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" loading={isLoading}>
            {company ? t('common:actions.save') : t('common:actions.create')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
